# -*- coding: utf-8 -*-
"""
Real-Time Trending Music Video Feed
====================================
Categories:
  india    → YouTube mostPopular chart, Music, regionCode=IN  (real-time)
  global   → YouTube mostPopular chart, Music, regionCode=US  (real-time)
  bollywood→ Search "bollywood hit 2025 official"             (latest releases)
  movies   → Search "hindi movie songs 2025 official"
  english  → Search "pop hits 2025 official music video"
  viral    → Search "trending viral music 2025"

Without YOUTUBE_API_KEY:
  Falls back to iTunes hourly chart — song cards with YouTube search links.
  No old hardcoded data.

Redis TTL: 30 min for chart categories, 2h for search categories.
"""

import asyncio
import json
import os
from typing import List, Optional

import httpx

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")
REDIS_URL = os.getenv("REDIS_URL", "")

CATEGORY_TTL = {
    "india":     1800,   # 30 min — chart changes hourly
    "global":    1800,
    "bollywood": 7200,   # 2 h — search results stable
    "movies":    7200,
    "english":   7200,
    "viral":     3600,   # 1 h
}

CATEGORY_CONFIG = {
    "india": {
        "label": "Trending India",
        "emoji": "🇮🇳",
        "type":  "chart",
        "params": {"videoCategoryId": "10", "regionCode": "IN", "chart": "mostPopular"},
    },
    "global": {
        "label": "Trending Global",
        "emoji": "🌍",
        "type":  "chart",
        "params": {"videoCategoryId": "10", "regionCode": "US", "chart": "mostPopular"},
    },
    "bollywood": {
        "label": "Bollywood Hits",
        "emoji": "🎬",
        "type":  "search",
        "params": {"q": "bollywood superhit songs 2025 official music video", "order": "viewCount"},
    },
    "movies": {
        "label": "Movie Songs",
        "emoji": "🎥",
        "type":  "search",
        "params": {"q": "hindi movie songs 2025 latest blockbuster official", "order": "viewCount"},
    },
    "english": {
        "label": "English Hits",
        "emoji": "🎵",
        "type":  "search",
        "params": {"q": "top english pop hits 2025 official music video", "order": "viewCount"},
    },
    "viral": {
        "label": "Viral Right Now",
        "emoji": "💥",
        "type":  "search",
        "params": {"q": "trending viral music song 2025 most popular", "order": "relevance"},
    },
}


# ── Redis helpers ──────────────────────────────────────────────────────────────

async def _cache_get(key: str) -> Optional[list]:
    if not REDIS_URL:
        return None
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(REDIS_URL, decode_responses=True)
        raw = await r.get(key)
        await r.aclose()
        return json.loads(raw) if raw else None
    except Exception:
        return None


async def _cache_set(key: str, data, ttl: int) -> None:
    if not REDIS_URL:
        return
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(REDIS_URL, decode_responses=True)
        await r.set(key, json.dumps(data), ex=ttl)
        await r.aclose()
    except Exception:
        pass


# ── YouTube API calls ──────────────────────────────────────────────────────────

async def _yt_chart(params: dict, limit: int) -> List[dict]:
    async with httpx.AsyncClient(timeout=10) as http:
        r = await http.get(
            "https://www.googleapis.com/youtube/v3/videos",
            params={**params, "part": "snippet,statistics", "maxResults": limit, "key": YOUTUBE_API_KEY},
        )
        items = r.json().get("items", [])
    result = []
    for v in items:
        views = int(v.get("statistics", {}).get("viewCount", 0))
        result.append({
            "videoId":      v["id"],
            "title":        v["snippet"]["title"],
            "channelTitle": v["snippet"]["channelTitle"],
            "thumbnail":    v["snippet"]["thumbnails"].get("high", v["snippet"]["thumbnails"].get("medium", {})).get("url", ""),
            "viewCount":    views,
            "viewCountFmt": _fmt_views(views),
            "publishedAt":  v["snippet"].get("publishedAt", ""),
        })
    return result


async def _yt_search(params: dict, limit: int) -> List[dict]:
    async with httpx.AsyncClient(timeout=10) as http:
        s = await http.get(
            "https://www.googleapis.com/youtube/v3/search",
            params={**params, "part": "snippet", "type": "video", "videoCategoryId": "10",
                    "maxResults": limit, "key": YOUTUBE_API_KEY},
        )
        items = s.json().get("items", [])
    return [
        {
            "videoId":      v["id"].get("videoId", ""),
            "title":        v["snippet"]["title"],
            "channelTitle": v["snippet"]["channelTitle"],
            "thumbnail":    v["snippet"]["thumbnails"].get("high", v["snippet"]["thumbnails"].get("medium", {})).get("url", ""),
            "viewCount":    0,
            "viewCountFmt": "",
            "publishedAt":  v["snippet"].get("publishedAt", ""),
        }
        for v in items
        if v["id"].get("videoId")
    ]


def _fmt_views(n: int) -> str:
    if n >= 1_000_000_000: return f"{n/1_000_000_000:.1f}B views"
    if n >= 1_000_000:     return f"{n/1_000_000:.1f}M views"
    if n >= 1_000:         return f"{n/1_000:.0f}K views"
    return f"{n} views" if n else ""


# ── iTunes fallback (no YouTube API key) ──────────────────────────────────────

async def _itunes_fallback(region_code: str = "in", limit: int = 8) -> List[dict]:
    """Return iTunes trending songs as video stubs (open YouTube on click)."""
    url = {
        "in": "https://rss.applemarketingtools.com/api/v2/in/music/most-played/25/songs.json",
        "us": "https://rss.applemarketingtools.com/api/v2/us/music/most-played/25/songs.json",
    }.get(region_code, "https://rss.applemarketingtools.com/api/v2/in/music/most-played/25/songs.json")

    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.get(url)
            results = r.json().get("feed", {}).get("results", [])
        return [
            {
                "videoId":      "",  # no embed — open YouTube search on click
                "title":        s.get("name", ""),
                "channelTitle": s.get("artistName", ""),
                "thumbnail":    s.get("artworkUrl100", "").replace("100x100bb", "600x600bb"),
                "viewCount":    0,
                "viewCountFmt": "",
                "publishedAt":  s.get("releaseDate", ""),
                "youtubeSearch": f"{s.get('artistName','')} {s.get('name','')} official video",
                "isFallback":   True,
            }
            for s in results[:limit]
        ]
    except Exception:
        return []


# ── Public API ─────────────────────────────────────────────────────────────────

async def get_trending_videos(category: str = "india", limit: int = 8) -> dict:
    """
    Fetch real-time trending music videos for a given category.
    Returns {videos, category_label, category_emoji, source, has_api_key}.
    """
    cfg = CATEGORY_CONFIG.get(category, CATEGORY_CONFIG["india"])
    cache_key = f"videos:{category}:{limit}"
    ttl = CATEGORY_TTL.get(category, 3600)

    cached = await _cache_get(cache_key)
    if cached:
        return {
            "videos": cached, "from_cache": True,
            "category_label": cfg["label"], "category_emoji": cfg["emoji"],
            "has_api_key": bool(YOUTUBE_API_KEY), "source": "cache",
        }

    if not YOUTUBE_API_KEY:
        # No API key — use iTunes hourly chart as real-time fallback
        region = "in" if category in ("india", "bollywood", "movies") else "us"
        videos = await _itunes_fallback(region, limit)
        await _cache_set(cache_key, videos, 1800)  # 30 min
        return {
            "videos": videos, "from_cache": False,
            "category_label": cfg["label"], "category_emoji": cfg["emoji"],
            "has_api_key": False, "source": "itunes",
        }

    try:
        if cfg["type"] == "chart":
            videos = await _yt_chart(cfg["params"], limit)
        else:
            videos = await _yt_search(cfg["params"], limit)

        # Filter out empty videoIds
        videos = [v for v in videos if v.get("videoId")]

        await _cache_set(cache_key, videos, ttl)
        return {
            "videos": videos, "from_cache": False,
            "category_label": cfg["label"], "category_emoji": cfg["emoji"],
            "has_api_key": True, "source": "youtube",
        }

    except Exception as e:
        print(f"[video_feed] YouTube error for {category}: {e}")
        # Graceful fallback to iTunes
        videos = await _itunes_fallback("in" if "india" in category or "bollywood" in category else "us", limit)
        return {
            "videos": videos, "from_cache": False,
            "category_label": cfg["label"], "category_emoji": cfg["emoji"],
            "has_api_key": True, "source": "itunes_fallback",
        }


async def get_all_categories_meta() -> list:
    """Return category list for frontend tab rendering."""
    return [
        {"id": k, "label": v["label"], "emoji": v["emoji"]}
        for k, v in CATEGORY_CONFIG.items()
    ]
