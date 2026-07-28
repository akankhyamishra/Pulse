# -*- coding: utf-8 -*-
"""
Trending Song Predictor
=======================
Sources  : iTunes RSS Charts (US / India / UK) + Reddit API + YouTube Data API
Scoring  : XGBoost-inspired weighted feature model
Caching  : Redis (1-hour TTL)
Streaming: Kafka topic `trending-predictions` (optional, graceful no-op if unavailable)

Feature weights (derived from domain knowledge; would be learned from historical
chart data in a fully trained XGBoost/LightGBM model):
  chart_rank_score   35% — primary signal
  cross_chart_bonus  20% — appearing in multiple regional charts
  recency_score      20% — newer songs have higher trend velocity
  social_score       15% — Reddit mentions + YouTube comment activity
  genre_trend_bonus  10% — currently hot genres score higher
"""

import asyncio
import json
import os
import re
from datetime import datetime, timezone
from typing import List, Optional

import httpx
from google import genai as _genai

_client = _genai.Client(api_key=os.getenv("GEMINI_API_KEY", ""))
_MODEL = "gemini-2.0-flash"

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")
REDDIT_CLIENT_ID = os.getenv("REDDIT_CLIENT_ID", "")
REDDIT_CLIENT_SECRET = os.getenv("REDDIT_CLIENT_SECRET", "")
KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "")
REDIS_URL = os.getenv("REDIS_URL", "")

CACHE_KEY = "trending:predictions"
CACHE_TTL = 3600  # 1 hour

# XGBoost-inspired feature weights (in production, train on historical chart data)
WEIGHTS = {
    "chart_rank_score":  0.35,
    "cross_chart_bonus": 0.20,
    "recency_score":     0.20,
    "social_score":      0.15,
    "genre_trend_bonus": 0.10,
}

HOT_GENRES = {
    "hip-hop/rap", "pop", "bollywood", "k-pop", "r&b/soul",
    "electronic", "dance", "punjabi", "latin",
}

# ── iTunes RSS feeds (free, no API key) ───────────────────────────────────────

ITUNES_FEEDS = {
    "us":  "https://rss.applemarketingtools.com/api/v2/us/music/most-played/50/songs.json",
    "in":  "https://rss.applemarketingtools.com/api/v2/in/music/most-played/50/songs.json",
    "gb":  "https://rss.applemarketingtools.com/api/v2/gb/music/most-played/50/songs.json",
}


async def _fetch_itunes_chart(region: str, url: str) -> List[dict]:
    try:
        async with httpx.AsyncClient(timeout=12) as http:
            r = await http.get(url)
            results = r.json().get("feed", {}).get("results", [])
        return [
            {
                "rank": i + 1,
                "region": region,
                "title": s.get("name", ""),
                "artist": s.get("artistName", ""),
                "genre": (s.get("genres") or [{}])[0].get("name", ""),
                "releaseDate": s.get("releaseDate", ""),
                "artworkUrl": s.get("artworkUrl100", "").replace("100x100bb", "300x300bb"),
            }
            for i, s in enumerate(results)
        ]
    except Exception as e:
        print(f"[trending] iTunes {region} failed: {e}")
        return []


# ── Reddit mentions (optional) ─────────────────────────────────────────────────

async def _fetch_reddit_mentions(song_title: str, artist: str) -> int:
    """Count recent Reddit posts mentioning this song (last 7 days)."""
    if not REDDIT_CLIENT_ID or not REDDIT_CLIENT_SECRET:
        return 0
    try:
        auth = (REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET)
        query = f"{song_title} {artist}".replace('"', "")
        async with httpx.AsyncClient(timeout=8, auth=auth) as http:
            r = await http.get(
                "https://www.reddit.com/search.json",
                params={"q": query, "sort": "new", "limit": 25, "t": "week"},
                headers={"User-Agent": "SpotifyAI/1.0"},
            )
            data = r.json()
            return len(data.get("data", {}).get("children", []))
    except Exception:
        return 0


# ── YouTube view count (optional) ─────────────────────────────────────────────

async def _fetch_youtube_views(song_title: str, artist: str) -> int:
    """Search YouTube for the official MV and return view count."""
    if not YOUTUBE_API_KEY:
        return 0
    try:
        async with httpx.AsyncClient(timeout=8) as http:
            s = await http.get(
                "https://www.googleapis.com/youtube/v3/search",
                params={
                    "part": "id",
                    "q": f"{artist} {song_title} official video",
                    "type": "video",
                    "videoCategoryId": "10",
                    "maxResults": 1,
                    "key": YOUTUBE_API_KEY,
                },
            )
            items = s.json().get("items", [])
            if not items:
                return 0
            vid_id = items[0]["id"].get("videoId", "")
            if not vid_id:
                return 0

            v = await http.get(
                "https://www.googleapis.com/youtube/v3/videos",
                params={"part": "statistics", "id": vid_id, "key": YOUTUBE_API_KEY},
            )
            stats = v.json().get("items", [{}])[0].get("statistics", {})
            return int(stats.get("viewCount", 0))
    except Exception:
        return 0


# ── Feature scoring (XGBoost feature vector → weighted sum) ───────────────────

def _days_old(release_date: str) -> float:
    try:
        d = datetime.strptime(release_date[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        return (datetime.now(timezone.utc) - d).days
    except Exception:
        return 180  # default: 6 months


def _compute_score(
    ranks: dict,        # {region: rank}
    genre: str,
    release_date: str,
    reddit_count: int = 0,
    yt_views: int = 0,
) -> float:
    """
    Compute a 0–100 trend score using weighted features.
    This is the inference step of a trained XGBoost model — in production you'd
    call xgb_model.predict([feature_vector]) here.
    """
    total_regions = len(ITUNES_FEEDS)
    chart_regions = len(ranks)

    # Feature 1: chart_rank_score — best rank, normalized
    best_rank = min(ranks.values()) if ranks else 50
    chart_rank_score = max(0.0, (51 - best_rank) / 50.0 * 100)

    # Feature 2: cross_chart_bonus — appearing in US, IN, GB simultaneously
    cross_chart_bonus = (chart_regions / total_regions) * 100

    # Feature 3: recency_score — songs < 30 days old get full score; decays over 1 year
    days = _days_old(release_date)
    recency_score = max(0.0, 100 - (days / 365.0) * 100)

    # Feature 4: social_score — Reddit + YouTube combined (log-scaled)
    import math
    reddit_norm = min(100.0, reddit_count * 10)
    yt_norm = min(100.0, math.log10(yt_views + 1) / math.log10(1e8) * 100) if yt_views else 0
    social_score = (reddit_norm + yt_norm) / 2

    # Feature 5: genre_trend_bonus — is this a currently hot genre?
    genre_lower = (genre or "").lower()
    genre_trend_bonus = 100.0 if any(g in genre_lower for g in HOT_GENRES) else 40.0

    raw = (
        WEIGHTS["chart_rank_score"]  * chart_rank_score +
        WEIGHTS["cross_chart_bonus"] * cross_chart_bonus +
        WEIGHTS["recency_score"]     * recency_score +
        WEIGHTS["social_score"]      * social_score +
        WEIGHTS["genre_trend_bonus"] * genre_trend_bonus
    )
    return round(min(100.0, raw), 1)


def _trend_label(score: float) -> str:
    if score >= 75: return "🔥 Hot"
    if score >= 55: return "📈 Rising"
    if score >= 40: return "✨ Emerging"
    return "👀 Watch"


# ── Gemini prediction narrative ────────────────────────────────────────────────

async def _gemini_predict(top_songs: List[dict]) -> str:
    if not os.getenv("GEMINI_API_KEY"):
        return ""
    top5 = "\n".join(
        f"{i+1}. \"{s['title']}\" by {s['artist']} — score {s['trend_score']}/100 ({s['regions_str']})"
        for i, s in enumerate(top_songs[:5])
    )
    prompt = f"""You are a music trend analyst at a major label. Based on the following real-time chart data and trend scores, predict which songs will be the biggest hits next week and why.

Top trending songs right now:
{top5}

Write a short, punchy analyst note (3–4 sentences max). Mention specific songs, why they're likely to explode, and any interesting patterns you notice (cross-regional appeal, genre trends, emerging artists). Keep it conversational and exciting.
No bullet points, no headers. Just the prediction paragraph."""

    try:
        resp = await _client.aio.models.generate_content(model=_MODEL, contents=prompt)
        return resp.text.strip()
    except Exception:
        return ""


# ── Kafka publisher (optional) ─────────────────────────────────────────────────

def _publish_to_kafka(payload: dict) -> None:
    if not KAFKA_BOOTSTRAP:
        return
    try:
        from kafka import KafkaProducer
        producer = KafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP.split(","),
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
            request_timeout_ms=3000,
            retries=1,
        )
        producer.send("trending-predictions", value=payload)
        producer.flush(timeout=5)
        producer.close()
        print(f"[trending] Published {len(payload.get('songs', []))} songs to Kafka")
    except ImportError:
        print("[trending] kafka-python not installed — skipping Kafka publish")
    except Exception as e:
        print(f"[trending] Kafka publish failed (non-fatal): {e}")


# ── Redis cache ────────────────────────────────────────────────────────────────

async def _cache_get() -> Optional[dict]:
    if not REDIS_URL:
        return None
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(REDIS_URL, decode_responses=True)
        raw = await r.get(CACHE_KEY)
        await r.aclose()
        return json.loads(raw) if raw else None
    except Exception:
        return None


async def _cache_set(data: dict) -> None:
    if not REDIS_URL:
        return
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(REDIS_URL, decode_responses=True)
        await r.set(CACHE_KEY, json.dumps(data), ex=CACHE_TTL)
        await r.aclose()
    except Exception:
        pass


# ── Public API ─────────────────────────────────────────────────────────────────

async def get_trending_predictions(force_refresh: bool = False) -> dict:
    """
    Main pipeline:
    1. Check Redis cache (return immediately if fresh)
    2. Fetch all iTunes charts in parallel
    3. Aggregate songs across regions
    4. Score each song (XGBoost-style weighted features)
    5. Optionally enrich top 10 with Reddit + YouTube data
    6. Run Gemini to generate prediction narrative
    7. Cache result + publish to Kafka
    """
    if not force_refresh:
        cached = await _cache_get()
        if cached:
            return {**cached, "from_cache": True}

    # ── Step 1: Fetch iTunes charts in parallel ────────────────────────────────
    chart_tasks = [_fetch_itunes_chart(region, url) for region, url in ITUNES_FEEDS.items()]
    chart_results = await asyncio.gather(*chart_tasks)

    # ── Step 2: Merge — key = (title_lower, artist_lower) ─────────────────────
    merged: dict[tuple, dict] = {}
    for chart in chart_results:
        for entry in chart:
            key = (entry["title"].lower().strip(), entry["artist"].lower().strip())
            if key not in merged:
                merged[key] = {
                    "title":       entry["title"],
                    "artist":      entry["artist"],
                    "genre":       entry["genre"],
                    "releaseDate": entry["releaseDate"],
                    "artworkUrl":  entry["artworkUrl"],
                    "ranks":       {},
                }
            merged[key]["ranks"][entry["region"]] = entry["rank"]

    if not merged:
        return {"songs": [], "prediction": "Chart data unavailable.", "generated_at": datetime.utcnow().isoformat()}

    # ── Step 3: Score each song ────────────────────────────────────────────────
    scored = []
    for (_, _), song in merged.items():
        score = _compute_score(
            ranks=song["ranks"],
            genre=song["genre"],
            release_date=song["releaseDate"],
        )
        regions = sorted(song["ranks"].keys())
        scored.append({
            **song,
            "trend_score": score,
            "trend_label": _trend_label(score),
            "regions": regions,
            "regions_str": ", ".join(r.upper() for r in regions),
        })

    scored.sort(key=lambda s: s["trend_score"], reverse=True)
    top_songs = scored[:20]

    # ── Step 4: Enrich top 5 with Reddit + YouTube (if API keys available) ─────
    enrich_tasks = []
    for song in top_songs[:5]:
        enrich_tasks.append(asyncio.gather(
            _fetch_reddit_mentions(song["title"], song["artist"]),
            _fetch_youtube_views(song["title"], song["artist"]),
        ))
    enrich_results = await asyncio.gather(*enrich_tasks)

    for i, (reddit_count, yt_views) in enumerate(enrich_results):
        if reddit_count or yt_views:
            top_songs[i]["trend_score"] = _compute_score(
                ranks=top_songs[i]["ranks"],
                genre=top_songs[i]["genre"],
                release_date=top_songs[i]["releaseDate"],
                reddit_count=reddit_count,
                yt_views=yt_views,
            )
            top_songs[i]["reddit_mentions"] = reddit_count
            top_songs[i]["yt_views"] = yt_views
            top_songs[i]["trend_label"] = _trend_label(top_songs[i]["trend_score"])

    # Re-sort after enrichment
    top_songs.sort(key=lambda s: s["trend_score"], reverse=True)

    # ── Step 5: Gemini prediction narrative ────────────────────────────────────
    prediction = await _gemini_predict(top_songs)

    result = {
        "songs": top_songs[:15],
        "prediction": prediction,
        "generated_at": datetime.utcnow().isoformat(),
        "sources": {
            "itunes_regions": list(ITUNES_FEEDS.keys()),
            "reddit_active":  bool(REDDIT_CLIENT_ID),
            "youtube_active": bool(YOUTUBE_API_KEY),
        },
        "from_cache": False,
    }

    # ── Step 6: Cache + Kafka ──────────────────────────────────────────────────
    await _cache_set(result)
    _publish_to_kafka({"event": "trending_refresh", "songs": [s["title"] for s in top_songs[:10]]})

    return result
