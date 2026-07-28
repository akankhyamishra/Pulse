"""
Multi-Agent Music Recommendation System
Four specialized Gemini agents collaborate to rank songs.

NOTE: CrewAI is incompatible with Python 3.14, so we implement the same
      multi-agent pattern directly with the google-generativeai SDK.
      Each agent is a focused Gemini prompt with a distinct persona and goal.

Agents:
  MoodAgent        → ranks by emotional/vibe fit (weight 40%)
  GenreAgent       → ranks by genre/style fit    (weight 35%)
  PopularityAgent  → ranks by trend/popularity   (weight 25%)
  RecommendationAgent → synthesises final list
"""

import json
import os
import re
from typing import List

from google import genai as _genai

_client = _genai.Client(api_key=os.getenv("GEMINI_API_KEY", ""))
_MODEL = "gemini-2.0-flash"

# ── Agent definitions ──────────────────────────────────────────────────────────

_AGENTS = {
    "mood": {
        "persona": (
            "You are a music therapist and emotional intelligence expert. "
            "You read the emotional quality of songs purely from title, artist, and genre."
        ),
        "task": "Rank these songs by how well they match the target mood '{mood}'.",
        "weight": 0.40,
    },
    "genre": {
        "persona": (
            "You are a seasoned music producer who knows every sub-genre and fusion style. "
            "You understand what makes a song fit a specific musical context."
        ),
        "task": "Rank these songs by how well they fit a request for '{intent}' music.",
        "weight": 0.35,
    },
    "popularity": {
        "persona": (
            "You are a music industry insider who watches streaming charts and social trends. "
            "You know what's hot right now and what listeners gravitate toward."
        ),
        "task": "Rank these songs from most to least likely to be currently popular and engaging.",
        "weight": 0.25,
    },
}

_RANK_PROMPT = """{persona}

{task}

Songs (JSON):
{songs_json}

Return ONLY a JSON array of song IDs in ranked order, best first:
["id1", "id2", ...]

No explanation. No markdown. Just the JSON array."""

_FINAL_PROMPT = """You are a legendary DJ and music curator.

You have received three ranked lists for the same set of songs:
- Mood ranking (40% weight):       {mood_ranks}
- Genre ranking (35% weight):      {genre_ranks}
- Popularity ranking (25% weight): {pop_ranks}

Songs available:
{songs_json}

User intent: '{intent}' with '{mood}' mood.

Produce the final top-8 song IDs using those weights.
Return ONLY a JSON array of exactly 8 IDs: ["id1", ..., "id8"]
No explanation. No markdown. Just the JSON array."""


# ── Helpers ────────────────────────────────────────────────────────────────────

def _extract_ids(text: str) -> List[str]:
    try:
        m = re.search(r"\[.*?\]", text, re.DOTALL)
        if m:
            return json.loads(m.group())
    except Exception:
        pass
    return []


def _call_agent(name: str, songs_json: str, mood: str, intent: str) -> List[str]:
    cfg = _AGENTS[name]
    task = cfg["task"].format(mood=mood, intent=intent)
    prompt = _RANK_PROMPT.format(
        persona=cfg["persona"],
        task=task,
        songs_json=songs_json,
    )
    try:
        resp = _client.models.generate_content(model=_MODEL, contents=prompt)
        return _extract_ids(resp.text)
    except Exception as e:
        print(f"[crew:{name}] agent failed: {e}")
        return []


# ── Public API ─────────────────────────────────────────────────────────────────

def rank_songs(candidates: List[dict], mood: str, intent: str) -> List[dict]:
    """
    Run all four agents and return up to 8 songs in recommended order.
    Falls back to original order if anything fails.
    """
    if not candidates:
        return []

    songs_json = json.dumps(
        [{"id": s["id"], "title": s["title"], "artist": s["artist"], "genre": s.get("genre", "")}
         for s in candidates[:15]],
        indent=2,
    )

    # ── Run the three scoring agents ──────────────────────────────────────────
    mood_ranks = _call_agent("mood", songs_json, mood, intent)
    genre_ranks = _call_agent("genre", songs_json, mood, intent)
    pop_ranks = _call_agent("popularity", songs_json, mood, intent)

    # ── Run the curator agent to synthesise ───────────────────────────────────
    final_prompt = _FINAL_PROMPT.format(
        mood_ranks=json.dumps(mood_ranks or []),
        genre_ranks=json.dumps(genre_ranks or []),
        pop_ranks=json.dumps(pop_ranks or []),
        songs_json=songs_json,
        intent=intent,
        mood=mood,
    )

    try:
        final_resp = _client.models.generate_content(model=_MODEL, contents=final_prompt)
        final_ids = _extract_ids(final_resp.text)
    except Exception as e:
        print(f"[crew:curator] synthesis failed: {e}")
        final_ids = []

    # ── Build ordered result ──────────────────────────────────────────────────
    id_map = {s["id"]: s for s in candidates}
    ordered = [id_map[sid] for sid in final_ids if sid in id_map]
    rest = [s for s in candidates if s["id"] not in set(final_ids)]
    return (ordered + rest)[:8]
