# -*- coding: utf-8 -*-
"""
Weather-Based Music Recommendations
Open-Meteo WMO weather code → Gemini mood mapping → iTunes playlist
No external API key required (uses Open-Meteo + Nominatim, both free/public).
"""

import json
import os
import re
from typing import List

import httpx
from google import genai as _genai

_client = _genai.Client(api_key=os.getenv("GEMINI_API_KEY", ""))
_MODEL = "gemini-2.0-flash"

# WMO weather code → human label
WMO_CONDITION: dict[int, str] = {
    0: "Clear Sky", 1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast",
    45: "Foggy", 48: "Icy Fog",
    51: "Light Drizzle", 53: "Moderate Drizzle", 55: "Dense Drizzle",
    61: "Slight Rain", 63: "Moderate Rain", 65: "Heavy Rain",
    71: "Slight Snow", 73: "Moderate Snow", 75: "Heavy Snow", 77: "Snow Grains",
    80: "Rain Showers", 81: "Heavy Showers", 82: "Violent Showers",
    85: "Snow Showers", 86: "Heavy Snow Showers",
    95: "Thunderstorm", 96: "Thunderstorm with Hail", 99: "Thunderstorm with Heavy Hail",
}

WMO_EMOJI: dict[int, str] = {
    0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️",
    45: "🌫️", 48: "🌫️",
    51: "🌦️", 53: "🌧️", 55: "🌧️",
    61: "🌧️", 63: "🌧️", 65: "⛈️",
    71: "❄️", 73: "❄️", 75: "🌨️", 77: "🌨️",
    80: "🌦️", 81: "⛈️", 82: "⛈️",
    85: "🌨️", 86: "🌨️",
    95: "⛈️", 96: "🌩️", 99: "🌩️",
}

ROOM_VIBES: dict[str, dict] = {
    "coding": {
        "term": "lofi hip hop coding study beats instrumental",
        "mood": "focused", "emoji": "💻",
        "desc": "Deep work mode — let the music carry you.",
        "color": "#3b82f6",
    },
    "gym": {
        "term": "gym workout pump up energy high intensity",
        "mood": "energetic", "emoji": "🏋️",
        "desc": "Push your limits — turn it up!",
        "color": "#ef4444",
    },
    "roadtrip": {
        "term": "road trip windows down summer driving",
        "mood": "happy", "emoji": "🚗",
        "desc": "Miles of good vibes ahead.",
        "color": "#f97316",
    },
    "heartbreak": {
        "term": "heartbreak sad emotional breakup ballad",
        "mood": "melancholic", "emoji": "💔",
        "desc": "Let it all out — you're not alone.",
        "color": "#8b5cf6",
    },
    "late_night": {
        "term": "late night city vibes r&b chill 2am",
        "mood": "chill", "emoji": "🌙",
        "desc": "City lights and quiet streets.",
        "color": "#1e40af",
    },
    "chill": {
        "term": "chill vibes easy relaxing acoustic indie",
        "mood": "chill", "emoji": "☮️",
        "desc": "Laid back and easy.",
        "color": "#10b981",
    },
    "party": {
        "term": "party bangers dance hits upbeat 2024",
        "mood": "hype", "emoji": "🎉",
        "desc": "The night is young — turn it up!",
        "color": "#f59e0b",
    },
    "focus": {
        "term": "deep focus concentration productivity ambient",
        "mood": "focused", "emoji": "🎯",
        "desc": "In the zone — flow state activated.",
        "color": "#6366f1",
    },
}


def _time_of_day(hour: int) -> str:
    if 5 <= hour < 12: return "morning"
    if 12 <= hour < 17: return "afternoon"
    if 17 <= hour < 21: return "evening"
    return "night"


async def _itunes_search(term: str, limit: int) -> List[dict]:
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


async def get_weather_music(
    weather_code: int,
    temp: float,
    city: str,
    hour: int,
    limit: int = 12,
) -> dict:
    condition = WMO_CONDITION.get(weather_code, "Clear Sky")
    emoji = WMO_EMOJI.get(weather_code, "🌤️")
    tod = _time_of_day(hour)

    prompt = f"""You are a world-class music curator matching songs to weather and time of day.

Current conditions: {condition} {emoji}, {temp:.0f}°C, {tod} in {city}.

Your task: pick the perfect musical mood and best iTunes search term for this moment.

Examples:
- Rainy Evening → "lo-fi hip hop rainy evening chill" → mood: cozy & introspective
- Clear Sunny Morning → "upbeat pop happy morning" → mood: bright & energetic
- Snowy Night → "acoustic winter cozy piano" → mood: peaceful & warm
- Thunderstorm → "cinematic dramatic intense orchestral" → mood: epic & powerful
- Foggy Morning → "dream pop ethereal mysterious ambient" → mood: dreamy & contemplative
- Hot Sunny Afternoon → "summer vibes chill pop beach" → mood: carefree & fun

Return ONLY valid JSON (no markdown):
{{
  "mood": "short mood label (2-3 words)",
  "vibe": "one evocative sentence describing this music-weather experience",
  "itunes_term": "best iTunes search query (be specific and descriptive)",
  "mood_emoji": "single emoji representing this mood",
  "color": "dark saturated hex color representing this vibe"
}}"""

    try:
        resp = await _client.aio.models.generate_content(model=_MODEL, contents=prompt)
        raw = re.sub(r"```[a-z]*\n?", "", resp.text).strip("`").strip()
        mapping = json.loads(raw)
    except Exception:
        mapping = {
            "mood": "chill",
            "vibe": f"Music for a {condition.lower()} {tod} in {city}.",
            "itunes_term": f"chill {tod} music",
            "mood_emoji": emoji,
            "color": "#3b82f6",
        }

    tracks = await _itunes_search(mapping.get("itunes_term", "chill music"), limit)

    return {
        "condition": condition,
        "weather_emoji": emoji,
        "temp": round(temp, 1),
        "city": city,
        "time_of_day": tod,
        "mood": mapping.get("mood", "chill"),
        "vibe": mapping.get("vibe", ""),
        "mood_emoji": mapping.get("mood_emoji", "🎵"),
        "color": mapping.get("color", "#3b82f6"),
        "tracks": tracks,
    }


async def get_room_playlist(room: str, limit: int = 12) -> dict:
    vibe = ROOM_VIBES.get(room)
    if not vibe:
        return {"error": "Unknown room", "tracks": []}

    tracks = await _itunes_search(vibe["term"], limit)

    return {
        "room": room,
        "mood": vibe["mood"],
        "emoji": vibe["emoji"],
        "desc": vibe["desc"],
        "color": vibe["color"],
        "tracks": tracks,
    }
