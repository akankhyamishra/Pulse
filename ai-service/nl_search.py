"""
Natural Language Song Search
Pipeline: User query → Gemini (extract mood/genre/tempo) → iTunes search → ranked results
"""

import json
import os
import re
import httpx
from google import genai as _genai

_client = _genai.Client(api_key=os.getenv("GEMINI_API_KEY", ""))
_MODEL = "gemini-2.0-flash"

_SYSTEM_PROMPT = """You are a music expert AI. Analyze the user's natural language music query and extract structured attributes.

Return ONLY a valid JSON object — no markdown fences, no explanation, just the JSON:
{{
  "itunes_term": "the best iTunes search term (can be an artist name, genre, mood keyword, or song description)",
  "mood": "happy|sad|energetic|calm|melancholic|angry|romantic|chill|focused|motivational|nostalgic|hype|peaceful",
  "genre": "pop|rock|hip-hop|jazz|r&b|electronic|country|indie|bollywood|k-pop|metal|reggae|latin|classical|lofi|folk|soul|gospel",
  "energy": "low|medium|high",
  "tempo": "slow|medium|fast",
  "language": "english|hindi|spanish|korean|any",
  "explanation": "A 1-2 sentence explanation of why these songs will match the user's vibe or request."
}}

Examples:
- "songs to cry to at 3am" → itunes_term: "sad emotional ballads", mood: "melancholic", energy: "low"
- "gym playlist fire beats" → itunes_term: "workout pump up hip hop", mood: "hype", energy: "high"
- "old school bollywood romance" → itunes_term: "bollywood 90s romance", language: "hindi"

User query: {query}"""


async def nl_search(query: str, limit: int = 15) -> dict:
    """Interpret a natural language query with Gemini, then search iTunes."""

    # ── 1. Gemini attribute extraction ────────────────────────────────────────
    attrs: dict = {}
    try:
        resp = await _client.aio.models.generate_content(
            model=_MODEL,
            contents=_SYSTEM_PROMPT.format(query=query),
        )
        raw = resp.text.strip()
        raw = re.sub(r"^```[a-z]*\n?", "", raw, flags=re.MULTILINE)
        raw = re.sub(r"\n?```$", "", raw, flags=re.MULTILINE)
        attrs = json.loads(raw.strip())
    except Exception:
        attrs = {
            "itunes_term": query,
            "mood": "any",
            "genre": "any",
            "energy": "medium",
            "tempo": "medium",
            "language": "any",
            "explanation": f"Searching for: {query}",
        }

    # ── 2. iTunes search ───────────────────────────────────────────────────────
    search_term = attrs.get("itunes_term") or query
    tracks: list[dict] = []

    async with httpx.AsyncClient(timeout=10) as http:
        try:
            r = await http.get(
                "https://itunes.apple.com/search",
                params={
                    "term": search_term,
                    "entity": "musicTrack",
                    "limit": limit,
                    "media": "music",
                },
            )
            raw_tracks = r.json().get("results", [])
            tracks = [
                {
                    "id": f"itunes_{t['trackId']}",
                    "title": t["trackName"],
                    "artist": t["artistName"],
                    "album": t.get("collectionName", ""),
                    "thumbnail": t.get("artworkUrl100", "").replace("100x100bb", "300x300bb"),
                    "previewUrl": t["previewUrl"],
                    "genre": t.get("primaryGenreName", ""),
                }
                for t in raw_tracks
                if t.get("previewUrl")
            ]
        except Exception:
            pass

    return {
        "query": query,
        "attributes": attrs,
        "explanation": attrs.get("explanation", ""),
        "mood": attrs.get("mood", ""),
        "genre": attrs.get("genre", ""),
        "tracks": tracks,
    }
