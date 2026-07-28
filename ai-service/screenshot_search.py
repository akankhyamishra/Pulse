# -*- coding: utf-8 -*-
"""
Song Search by Screenshot
Pipeline: uploaded image → Cloudinary (store) → Gemini Vision (OCR + song ID) → iTunes tracks

Supports any screenshot that might contain song info:
  - Music player UIs (Spotify, Apple Music, YouTube Music)
  - YouTube / Instagram / TikTok screens
  - Lyrics screenshots
  - Album artwork
  - Concert posters / event banners
"""

import asyncio
import io
import json
import os
import re
from typing import List, Optional

import httpx
from google import genai as _genai
from google.genai import types as _gtypes

_client = _genai.Client(api_key=os.getenv("GEMINI_API_KEY", ""))
_MODEL = "gemini-2.0-flash"

_VISION_PROMPT = """You are a world-class music detective and song identifier.

Analyze this image carefully. It could be any of:
- A music player screenshot (Spotify, Apple Music, YouTube Music, Gaana, JioSaavn, etc.)
- A YouTube video screenshot where the song title is visible in the video or overlay
- An Instagram story / TikTok with a song sticker or lyrics overlay
- A screenshot of song lyrics
- Album / single artwork
- A concert poster or event flyer
- Any image that hints at a song (by showing lyrics, artwork, or a title)

Your job:
1. Extract ALL visible text from the image (OCR)
2. Identify the song title and artist with as much confidence as possible
3. If you see lyrics → name the song those lyrics belong to
4. If you see a music player → extract the current song info
5. If you see a YouTube thumbnail → read the video/song title

Return ONLY valid JSON — no markdown fences, no explanation:
{
  "found": true or false,
  "song_title": "exact song title, or null if not found",
  "artist": "artist / band name, or null",
  "confidence": "high | medium | low",
  "source_type": "music_player | youtube | instagram | lyrics | album_art | poster | other",
  "extracted_text": "verbatim text you read from the image (comma-separated if multiple pieces)",
  "explanation": "one sentence explaining how you identified this",
  "search_term": "best iTunes search query to find this exact song (title + artist combined)"
}"""


# ── Cloudinary upload ──────────────────────────────────────────────────────────

async def _upload_to_cloudinary(image_bytes: bytes, mime_type: str) -> Optional[str]:
    """Upload to Cloudinary and return secure_url. Returns None if not configured."""
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME", "")
    api_key = os.getenv("CLOUDINARY_API_KEY", "")
    api_secret = os.getenv("CLOUDINARY_API_SECRET", "")

    if not all([cloud_name, api_key, api_secret]):
        return None

    try:
        import cloudinary
        import cloudinary.uploader

        cloudinary.config(
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret,
            secure=True,
        )

        ext = mime_type.split("/")[-1].replace("jpeg", "jpg")

        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: cloudinary.uploader.upload(
                io.BytesIO(image_bytes),
                folder="spotify-ai-screenshots",
                resource_type="image",
                format=ext,
                overwrite=False,
            ),
        )
        return result.get("secure_url")
    except Exception as e:
        print(f"[screenshot] Cloudinary upload failed (non-fatal): {e}")
        return None


# ── iTunes search ──────────────────────────────────────────────────────────────

async def _itunes_search(term: str, limit: int) -> List[dict]:
    if not term:
        return []
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.get(
                "https://itunes.apple.com/search",
                params={"term": term, "entity": "musicTrack", "limit": limit, "media": "music"},
            )
            results = r.json().get("results", [])
        return [
            {
                "id": f"itunes_{t['trackId']}",
                "title": t["trackName"],
                "artist": t["artistName"],
                "album": t.get("collectionName", ""),
                "thumbnail": t.get("artworkUrl100", "").replace("100x100bb", "300x300bb"),
                "previewUrl": t["previewUrl"],
            }
            for t in results if t.get("previewUrl")
        ]
    except Exception:
        return []


# ── Main pipeline ──────────────────────────────────────────────────────────────

async def search_by_screenshot(
    image_bytes: bytes,
    mime_type: str,
    limit: int = 12,
) -> dict:
    """
    1. Upload image to Cloudinary (if configured) → get permanent URL
    2. Send image to Gemini Vision → identify song
    3. Search iTunes for matching tracks
    Returns everything merged: image_url, song info, tracks.
    """
    if not os.getenv("GEMINI_API_KEY"):
        return {"found": False, "error": "GEMINI_API_KEY not configured", "tracks": [], "image_url": None}

    # ── 1. Upload to Cloudinary in parallel with Gemini analysis ──────────────
    cloud_task = asyncio.create_task(_upload_to_cloudinary(image_bytes, mime_type))

    # ── 2. Gemini Vision ───────────────────────────────────────────────────────
    vision: dict = {}
    try:
        image_part = _gtypes.Part.from_bytes(data=image_bytes, mime_type=mime_type)
        resp = await _client.aio.models.generate_content(
            model=_MODEL,
            contents=[image_part, _VISION_PROMPT],
        )
        raw = re.sub(r"```[a-z]*\n?", "", resp.text).strip("`").strip()
        vision = json.loads(raw)
    except json.JSONDecodeError:
        vision = {
            "found": False,
            "extracted_text": getattr(resp, "text", "")[:500] if "resp" in dir() else "",
            "explanation": "Could not parse Gemini response as JSON.",
        }
    except Exception as e:
        image_url = await cloud_task
        return {"found": False, "error": str(e), "tracks": [], "image_url": image_url}

    # ── 3. iTunes search if song found ────────────────────────────────────────
    tracks: List[dict] = []
    if vision.get("found") and vision.get("search_term"):
        tracks = await _itunes_search(vision["search_term"], limit)

        # Fallback: try title + artist if primary search returned nothing
        if not tracks:
            fallback = " ".join(filter(None, [vision.get("song_title"), vision.get("artist")]))
            if fallback:
                tracks = await _itunes_search(fallback, limit)

    # ── 4. Collect Cloudinary URL ──────────────────────────────────────────────
    image_url = await cloud_task

    return {
        "found": vision.get("found", False),
        "song_title": vision.get("song_title"),
        "artist": vision.get("artist"),
        "confidence": vision.get("confidence", "low"),
        "source_type": vision.get("source_type", "other"),
        "extracted_text": vision.get("extracted_text", ""),
        "explanation": vision.get("explanation", ""),
        "search_term": vision.get("search_term", ""),
        "image_url": image_url,   # Cloudinary URL (or None if not configured)
        "tracks": tracks,
    }
