"""
AI DJ Assistant — LangGraph state machine

Flow:
  START
    → parse_intent   (Gemini: read user request + current song context)
    → fetch_candidates (iTunes API search)
    → rank_with_crew  (CrewAI: 4-agent ranking pipeline)
    → generate_response (Gemini: write DJ-style explanation)
    → save_session    (Redis: persist conversation history)
  END

Redis key: dj:session:{session_id}  TTL: 2h
"""

import asyncio
import json
import os
import re
from typing import List, Optional, TypedDict

import httpx
from google import genai as _genai
from langgraph.graph import END, StateGraph

_client = _genai.Client(api_key=os.getenv("GEMINI_API_KEY", ""))
_MODEL = "gemini-2.0-flash"

# ── State schema ───────────────────────────────────────────────────────────────

class DJState(TypedDict):
    session_id: str
    user_message: str
    current_song: dict          # {id, title, artist, thumbnail}
    conversation_history: List[dict]
    intent: str                 # more_energetic | similar | genre_change | chill | popular | random
    mood: str                   # happy | sad | energetic | calm | romantic | hype | chill | focused
    search_term: str
    candidate_songs: List[dict]
    final_tracks: List[dict]
    dj_response: str


# ── Node 1: Parse intent ───────────────────────────────────────────────────────

async def parse_intent(state: DJState) -> dict:
    current = state.get("current_song") or {}
    current_ctx = (
        f"Currently playing: \"{current.get('title', '?')}\" by {current.get('artist', '?')}"
        if current.get("title") else "Nothing is playing right now."
    )
    history = state.get("conversation_history", [])
    recent = "\n".join(f"{m['role'].upper()}: {m['content']}" for m in history[-6:])

    prompt = f"""You are an AI DJ assistant parsing a user request.

{current_ctx}
Recent conversation:
{recent or "(new session)"}

User says: "{state['user_message']}"

Return ONLY valid JSON — no markdown:
{{
  "intent": "more_energetic|less_energetic|similar|genre_change|chill|popular|random|specific",
  "mood": "happy|sad|energetic|calm|romantic|hype|chill|focused|melancholic|motivational",
  "search_term": "the best iTunes search term to satisfy this request",
  "genre_hint": "optional genre keyword or empty string"
}}"""

    try:
        resp = await _client.aio.models.generate_content(model=_MODEL, contents=prompt)
        raw = re.sub(r"```[a-z]*\n?", "", resp.text).strip("`").strip()
        data = json.loads(raw)
        return {
            "intent": data.get("intent", "similar"),
            "mood": data.get("mood", "chill"),
            "search_term": data.get("search_term", state["user_message"]),
        }
    except Exception:
        return {
            "intent": "similar",
            "mood": "chill",
            "search_term": state["user_message"],
        }


# ── Node 2: Fetch candidates from iTunes ──────────────────────────────────────

async def fetch_candidates(state: DJState) -> dict:
    term = state.get("search_term") or state["user_message"]

    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.get(
                "https://itunes.apple.com/search",
                params={"term": term, "entity": "musicTrack", "limit": 20, "media": "music"},
            )
            results = r.json().get("results", [])

        candidates = [
            {
                "id": f"itunes_{t['trackId']}",
                "title": t["trackName"],
                "artist": t["artistName"],
                "album": t.get("collectionName", ""),
                "thumbnail": t.get("artworkUrl100", "").replace("100x100bb", "300x300bb"),
                "previewUrl": t["previewUrl"],
                "genre": t.get("primaryGenreName", ""),
            }
            for t in results
            if t.get("previewUrl")
        ]
    except Exception:
        candidates = []

    return {"candidate_songs": candidates}


# ── Node 3: CrewAI multi-agent ranking ────────────────────────────────────────

async def rank_with_crew(state: DJState) -> dict:
    candidates = state.get("candidate_songs", [])
    if not candidates:
        return {"final_tracks": []}

    try:
        from recommendation_crew import rank_songs
        loop = asyncio.get_event_loop()
        ranked = await loop.run_in_executor(
            None, rank_songs, candidates, state.get("mood", "chill"), state.get("intent", "similar")
        )
        return {"final_tracks": ranked[:8]}
    except Exception as e:
        print(f"[dj] CrewAI ranking skipped: {e}")
        return {"final_tracks": candidates[:8]}


# ── Node 4: Generate DJ response ──────────────────────────────────────────────

async def generate_dj_response(state: DJState) -> dict:
    tracks = state.get("final_tracks", [])
    current = state.get("current_song") or {}
    top5 = "\n".join(f"• {t['title']} — {t['artist']}" for t in tracks[:5])
    current_str = (
        f'"{current["title"]}" by {current["artist"]}'
        if current.get("title") else "nothing"
    )

    prompt = f"""You are a legendary AI DJ with a cool, enthusiastic personality.

The user said: "{state['user_message']}"
Currently playing: {current_str}
Intent: {state.get('intent', 'similar')} | Mood: {state.get('mood', 'chill')}
You're playing these next:
{top5 or "(no tracks found)"}

Write a SHORT (2-3 sentences) DJ response. Be conversational, excited, and specific.
Mention the vibe/mood shift or why these songs fit perfectly.
End with a single punchy hype line. Never use bullet points."""

    try:
        resp = await _client.aio.models.generate_content(model=_MODEL, contents=prompt)
        return {"dj_response": resp.text.strip()}
    except Exception:
        return {"dj_response": "Here's your next set — dropping these bangers now! 🔥"}


# ── Node 5: Persist to Redis ───────────────────────────────────────────────────

async def save_session(state: DJState) -> dict:
    new_history = list(state.get("conversation_history", []))
    new_history.append({"role": "user", "content": state["user_message"]})
    new_history.append({"role": "dj", "content": state["dj_response"]})
    new_history = new_history[-30:]  # keep last 30 messages

    redis_url = os.getenv("REDIS_URL", "")
    if redis_url:
        try:
            import redis.asyncio as aioredis
            r = aioredis.from_url(redis_url, decode_responses=True)
            await r.set(f"dj:session:{state['session_id']}", json.dumps(new_history), ex=7200)
            await r.aclose()
        except Exception as e:
            print(f"[dj] Redis save failed (non-fatal): {e}")

    return {"conversation_history": new_history}


# ── Build LangGraph ────────────────────────────────────────────────────────────

_builder = StateGraph(DJState)
_builder.add_node("parse_intent", parse_intent)
_builder.add_node("fetch_candidates", fetch_candidates)
_builder.add_node("rank_with_crew", rank_with_crew)
_builder.add_node("generate_dj_response", generate_dj_response)
_builder.add_node("save_session", save_session)

_builder.set_entry_point("parse_intent")
_builder.add_edge("parse_intent", "fetch_candidates")
_builder.add_edge("fetch_candidates", "rank_with_crew")
_builder.add_edge("rank_with_crew", "generate_dj_response")
_builder.add_edge("generate_dj_response", "save_session")
_builder.add_edge("save_session", END)

dj_graph = _builder.compile()


# ── Redis session helpers ──────────────────────────────────────────────────────

async def load_session_history(session_id: str) -> List[dict]:
    redis_url = os.getenv("REDIS_URL", "")
    if not redis_url:
        return []
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(redis_url, decode_responses=True)
        data = await r.get(f"dj:session:{session_id}")
        await r.aclose()
        return json.loads(data) if data else []
    except Exception:
        return []


async def clear_session(session_id: str) -> None:
    redis_url = os.getenv("REDIS_URL", "")
    if not redis_url:
        return
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(redis_url, decode_responses=True)
        await r.delete(f"dj:session:{session_id}")
        await r.aclose()
    except Exception:
        pass


# ── Public entrypoint ──────────────────────────────────────────────────────────

async def run_dj(
    session_id: str,
    user_message: str,
    current_song: Optional[dict] = None,
) -> dict:
    history = await load_session_history(session_id)

    result = await dj_graph.ainvoke({
        "session_id": session_id,
        "user_message": user_message,
        "current_song": current_song or {},
        "conversation_history": history,
        "intent": "",
        "mood": "",
        "search_term": "",
        "candidate_songs": [],
        "final_tracks": [],
        "dj_response": "",
    })

    return {
        "dj_response": result["dj_response"],
        "tracks": result["final_tracks"],
        "intent": result["intent"],
        "mood": result["mood"],
        "session_id": session_id,
    }
