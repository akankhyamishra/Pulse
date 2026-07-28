"""
Hum-to-Song Recognition
Pipeline: Audio bytes → MFCC + Chromagram features → Qdrant vector search → matches

Feature vector (50-dim):
  chroma_mean [12]  – key-normalized pitch class distribution
  chroma_std  [12]  – pitch class variance
  mfcc_mean   [13]  – timbre centroid
  mfcc_std    [13]  – timbre variance
"""

import io
import hashlib
import numpy as np
import librosa

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, SearchParams

COLLECTION = "song_embeddings"
VECTOR_DIM = 50  # 12 + 12 + 13 + 13


# ── Audio loading ──────────────────────────────────────────────────────────────

def _load_audio(audio_bytes: bytes, sr: int = 22050) -> np.ndarray:
    """Decode audio bytes → mono waveform. Handles webm/ogg/mp4/wav/mp3."""
    try:
        y, _ = librosa.load(io.BytesIO(audio_bytes), sr=sr, mono=True, duration=30)
        return y
    except Exception:
        # Fallback: pydub handles webm/ogg when ffmpeg is installed
        try:
            from pydub import AudioSegment
            seg = AudioSegment.from_file(io.BytesIO(audio_bytes))
            seg = seg.set_channels(1).set_frame_rate(sr)
            samples = np.array(seg.get_array_of_samples(), dtype=np.float32)
            max_val = float(2 ** (seg.sample_width * 8 - 1))
            return samples / max_val
        except Exception as e:
            raise ValueError(
                f"Could not decode audio. Make sure ffmpeg is installed. ({e})"
            )


# ── Feature extraction ─────────────────────────────────────────────────────────

def extract_features(audio_bytes: bytes) -> np.ndarray:
    """Return a 50-dim L2-normalised melody fingerprint from raw audio bytes."""
    y = _load_audio(audio_bytes)
    y, _ = librosa.effects.trim(y, top_db=25)

    if len(y) < 22050 * 0.3:
        raise ValueError("Audio too short — please hum for at least 0.5 seconds.")

    # Chromagram (pitch classes, key-normalised by rolling dominant to index 0)
    chroma = librosa.feature.chroma_cqt(y=y, sr=22050, n_chroma=12)
    dominant = int(np.argmax(np.mean(chroma, axis=1)))
    chroma = np.roll(chroma, -dominant, axis=0)

    # MFCCs (timbre)
    mfcc = librosa.feature.mfcc(y=y, sr=22050, n_mfcc=13)

    vec = np.concatenate([
        np.mean(chroma, axis=1),  # 12
        np.std(chroma, axis=1),   # 12
        np.mean(mfcc, axis=1),    # 13
        np.std(mfcc, axis=1),     # 13
    ]).astype(np.float32)

    norm = np.linalg.norm(vec)
    if norm > 0:
        vec /= norm
    return vec


# ── Qdrant helpers ─────────────────────────────────────────────────────────────

def ensure_collection(client: QdrantClient) -> None:
    existing = {c.name for c in client.get_collections().collections}
    if COLLECTION not in existing:
        client.create_collection(
            collection_name=COLLECTION,
            vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE),
        )


def _song_id_to_int(song_id: str) -> int:
    return int(hashlib.md5(song_id.encode()).hexdigest()[:15], 16)


# ── Core operations ────────────────────────────────────────────────────────────

async def index_song(
    song_id: str,
    title: str,
    artist: str,
    thumbnail: str,
    audio_url: str,
    client: QdrantClient,
) -> dict:
    """Download a preview URL and store its melody fingerprint in Qdrant."""
    import httpx

    async with httpx.AsyncClient(follow_redirects=True, timeout=30) as http:
        resp = await http.get(audio_url)
        resp.raise_for_status()
        audio_bytes = resp.content

    features = extract_features(audio_bytes)
    point_id = _song_id_to_int(song_id)

    client.upsert(
        collection_name=COLLECTION,
        points=[
            PointStruct(
                id=point_id,
                vector=features.tolist(),
                payload={
                    "song_id": song_id,
                    "title": title,
                    "artist": artist,
                    "thumbnail": thumbnail,
                    "audio_url": audio_url,
                },
            )
        ],
    )
    return {"song_id": song_id, "indexed": True}


def search_by_hum(
    audio_bytes: bytes,
    client: QdrantClient,
    limit: int = 8,
) -> list[dict]:
    """Find songs in Qdrant whose fingerprints best match the hummed audio."""
    query_vec = extract_features(audio_bytes)

    # qdrant-client >= 1.7.0 replaced client.search() with client.query_points()
    response = client.query_points(
        collection_name=COLLECTION,
        query=query_vec.tolist(),
        limit=limit,
        with_payload=True,
        search_params=SearchParams(hnsw_ef=128),
    )

    return [
        {"score": round(hit.score, 4), **hit.payload}
        for hit in response.points
    ]
