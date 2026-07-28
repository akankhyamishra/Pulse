"""
AI Music Service — FastAPI
Runs on port 8001 (configurable via PORT env var)

Endpoints:
  GET  /health                – liveness check
  POST /api/ai/hum-search     – upload hummed audio → matched songs from Qdrant
  POST /api/ai/nl-search      – natural language text → songs via Gemini + iTunes
  POST /api/ai/index          – bulk-index song preview URLs into Qdrant
  GET  /api/ai/index/info     – Qdrant collection stats
  POST /api/ai/dj/chat        – AI DJ: chat message → DJ response + track recommendations
  GET  /api/ai/dj/session     – AI DJ: load conversation history
  DELETE /api/ai/dj/session   – AI DJ: clear session
  POST /api/ai/screenshot-search – Gemini Vision OCR → song identification
  POST /api/ai/weather-music      – WMO code → mood → iTunes playlist
  GET  /api/ai/room-playlist/{r}  – curated Mood Room playlist
  GET  /api/ai/trending           – predict next-week trending songs
  GET  /api/ai/trending-videos    – Hindi/English trending video feed
"""

import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

from qdrant_client import QdrantClient

import hum as hum_mod
import nl_search as nl_mod
import dj_agent as dj_mod
import weather_music as weather_mod
import screenshot_search as screenshot_mod
import trending as trending_mod
import video_feed as video_mod

# ── App setup ──────────────────────────────────────────────────────────────────
app = FastAPI(title="AI Music Service", version="1.0.0", docs_url="/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Qdrant client ──────────────────────────────────────────────────────────────
_qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
_qdrant_key = os.getenv("QDRANT_API_KEY") or None

qdrant: QdrantClient | None = None


@app.on_event("startup")
async def startup() -> None:
    global qdrant
    try:
        qdrant = QdrantClient(url=_qdrant_url, api_key=_qdrant_key, timeout=5)
        hum_mod.ensure_collection(qdrant)
        print(f"[ai-service] Qdrant connected at {_qdrant_url}")
    except Exception as e:
        print(f"[ai-service] Qdrant not available — hum-search disabled. ({e})")
        qdrant = None


def _require_qdrant() -> QdrantClient:
    if qdrant is None:
        raise HTTPException(
            status_code=503,
            detail="Qdrant is not available. Set QDRANT_URL and QDRANT_API_KEY in .env",
        )
    return qdrant


# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "ai-music-service",
        "qdrant": "connected" if qdrant else "unavailable",
        "gemini": "configured" if os.getenv("GEMINI_API_KEY") else "missing_key",
    }


# ── Hum-to-Song Recognition ────────────────────────────────────────────────────

@app.post("/api/ai/hum-search")
async def hum_search(audio: UploadFile = File(...)):
    """
    Upload a recorded audio clip (hum, whistle, or sing).
    Returns songs from Qdrant whose melody fingerprints are most similar.

    Supports: audio/webm, audio/ogg, audio/mp4, audio/wav, audio/mp3
    """
    client = _require_qdrant()

    try:
        audio_bytes = await audio.read()
        results = hum_mod.search_by_hum(audio_bytes, client, limit=8)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audio processing error: {e}")

    return {
        "results": results,
        "count": len(results),
        "indexed_songs": _get_collection_count(),
    }


# ── Natural Language Search ────────────────────────────────────────────────────

class NLSearchRequest(BaseModel):
    query: str
    limit: int = 15


@app.post("/api/ai/nl-search")
async def nl_search(body: NLSearchRequest):
    """
    Describe the music you want in plain English.
    Gemini extracts mood/genre/tempo, then iTunes returns matching tracks.
    """
    if not body.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    if not os.getenv("GEMINI_API_KEY"):
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY not configured. Add it to ai-service/.env",
        )
    try:
        result = await nl_mod.nl_search(body.query, body.limit)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {e}")


# ── Song Indexing (for hum search) ─────────────────────────────────────────────

class SongPayload(BaseModel):
    song_id: str
    title: str
    artist: str
    thumbnail: str
    audio_url: str


class IndexRequest(BaseModel):
    songs: List[SongPayload]


@app.post("/api/ai/index")
async def index_songs(body: IndexRequest):
    """
    Download preview audio for each song and store melody fingerprints in Qdrant.
    Call this from the frontend after displaying search results to lazily build the index.
    """
    client = _require_qdrant()

    indexed, errors = [], []
    for song in body.songs:
        try:
            r = await hum_mod.index_song(
                song.song_id,
                song.title,
                song.artist,
                song.thumbnail,
                song.audio_url,
                client,
            )
            indexed.append(r)
        except Exception as e:
            errors.append({"song_id": song.song_id, "error": str(e)})

    return {
        "indexed": len(indexed),
        "failed": len(errors),
        "results": indexed,
        "errors": errors,
    }


@app.get("/api/ai/index/info")
def index_info():
    """Return Qdrant collection stats (how many songs are indexed)."""
    if qdrant is None:
        return {"status": "qdrant_unavailable", "count": 0}
    try:
        info = qdrant.get_collection(hum_mod.COLLECTION)
        return {
            "status": "ok",
            "count": info.vectors_count or 0,
            "indexed_count": info.indexed_vectors_count or 0,
        }
    except Exception as e:
        return {"status": "error", "error": str(e), "count": 0}


def _get_collection_count() -> int:
    try:
        if qdrant:
            return qdrant.get_collection(hum_mod.COLLECTION).vectors_count or 0
    except Exception:
        pass
    return 0


# ── AI DJ ─────────────────────────────────────────────────────────────────────

class CurrentSong(BaseModel):
    id: str = ""
    title: str = ""
    artist: str = ""
    thumbnail: str = ""


class DJChatRequest(BaseModel):
    session_id: str
    user_message: str
    current_song: CurrentSong = CurrentSong()


@app.post("/api/ai/dj/chat")
async def dj_chat(body: DJChatRequest):
    """
    Send a message to the AI DJ.
    Examples: "Play something more energetic", "Give me songs similar to this"
    Returns: DJ response text + ordered list of recommended tracks (playable).
    """
    if not body.user_message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    if not os.getenv("GEMINI_API_KEY"):
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY not configured")
    try:
        result = await dj_mod.run_dj(
            session_id=body.session_id,
            user_message=body.user_message,
            current_song=body.current_song.model_dump() if body.current_song.title else None,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DJ error: {e}")


@app.get("/api/ai/dj/session")
async def dj_get_session(session_id: str):
    """Load conversation history for a DJ session from Redis."""
    try:
        history = await dj_mod.load_session_history(session_id)
        return {"session_id": session_id, "history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/ai/dj/session")
async def dj_clear_session(session_id: str):
    """Clear a DJ session (start fresh conversation)."""
    await dj_mod.clear_session(session_id)
    return {"cleared": True, "session_id": session_id}


# ── Screenshot Song Search ────────────────────────────────────────────────────

@app.post("/api/ai/screenshot-search")
async def screenshot_search_endpoint(image: UploadFile = File(...)):
    """
    Upload a screenshot → Cloudinary (store) → Gemini Vision (identify song) → iTunes tracks.

    Accepts any image: JPEG, PNG, WEBP, GIF, HEIC, etc.
    Returns: image_url (Cloudinary), identified song, confidence, and playable tracks.
    """
    if not os.getenv("GEMINI_API_KEY"):
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY not configured")

    try:
        image_bytes = await image.read()
        if len(image_bytes) > 15 * 1024 * 1024:  # 15 MB limit
            raise HTTPException(status_code=413, detail="Image too large. Max 15 MB.")
        if len(image_bytes) < 100:
            raise HTTPException(status_code=400, detail="Image file appears to be empty.")

        # Determine MIME type — fall back to image/jpeg if browser doesn't send one
        mime = image.content_type or ""
        if not mime.startswith("image/"):
            # Sniff first 4 bytes to detect common image formats
            sig = image_bytes[:4]
            if sig[:2] == b'\xff\xd8':       mime = "image/jpeg"
            elif sig[:4] == b'\x89PNG':      mime = "image/png"
            elif sig[:4] == b'RIFF':         mime = "image/webp"
            elif sig[:3] == b'GIF':          mime = "image/gif"
            else:                            mime = "image/jpeg"  # safe default

        result = await screenshot_mod.search_by_screenshot(image_bytes, mime, limit=12)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Screenshot analysis failed: {e}")


# ── Weather-Based Music ────────────────────────────────────────────────────────

class WeatherMusicRequest(BaseModel):
    weather_code: int
    temp: float
    city: str = "Unknown"
    hour: int = 12
    limit: int = 12


@app.post("/api/ai/weather-music")
async def weather_music(body: WeatherMusicRequest):
    """
    Map current weather conditions to a music mood using Gemini, then fetch
    matching tracks from iTunes.

    Send: weather_code (Open-Meteo WMO), temp (°C), city, current hour (0-23).
    Returns: mood label, vibe description, colour, and a playlist of tracks.
    """
    if not os.getenv("GEMINI_API_KEY"):
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY not configured")
    try:
        result = await weather_mod.get_weather_music(
            body.weather_code, body.temp, body.city, body.hour, body.limit
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Weather music error: {e}")


# ── Mood Room Playlists ────────────────────────────────────────────────────────

@app.get("/api/ai/room-playlist/{room}")
async def room_playlist(room: str, limit: int = 12):
    """
    Return a curated playlist for a social mood room (coding, gym, roadtrip…).
    Searches iTunes with a room-specific query.
    """
    try:
        result = await weather_mod.get_room_playlist(room, limit)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Room playlist error: {e}")


# ── Trending Song Predictor ───────────────────────────────────────────────────

@app.get("/api/ai/trending")
async def get_trending(refresh: bool = False):
    """
    Predict next-week trending songs.
    Sources: iTunes RSS (US/IN/GB) + optional Reddit + optional YouTube Data API.
    Scoring: XGBoost-inspired weighted feature model.
    Cached in Redis for 1 hour. Pass ?refresh=true to force re-fetch.
    """
    try:
        result = await trending_mod.get_trending_predictions(force_refresh=refresh)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Trending prediction failed: {e}")


# ── Trending Video Feed ────────────────────────────────────────────────────────

@app.get("/api/ai/trending-videos")
async def get_trending_videos(limit: int = 8):
    """
    Fetch trending Hindi & English music videos for the home page carousel.
    Sources: YouTube Data API v3 (IN + US trending music) + Bollywood search.
    Falls back to curated seed list when YOUTUBE_API_KEY is not configured.
    Cached in Redis for 2 hours.
    """
    try:
        result = await video_mod.get_trending_videos(limit=min(limit, 12))
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Video feed failed: {e}")


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8001"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
