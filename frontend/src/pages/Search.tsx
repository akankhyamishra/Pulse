import { useState, useEffect, useRef, useCallback } from "react";
import Layout from "../components/Layout";
import { Song, useSongData } from "../context/SongContext";
import { useUserData } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import {
  FaSearch,
  FaPlay,
  FaHeart,
  FaRegHeart,
  FaSpinner,
  FaMicrophone,
  FaStop,
  FaMagic,
  FaCamera,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import { HiSparkles } from "react-icons/hi2";
import axios from "axios";

const AI_SERVICE = import.meta.env.VITE_AI_SERVICE_URL ?? "http://localhost:8001";

const GENRE_TILES = [
  { name: "Pop", color: "#e91e8c" },
  { name: "Hip-Hop", color: "#ff6437" },
  { name: "Rock", color: "#8c67ab" },
  { name: "Jazz", color: "#1e3264" },
  { name: "R&B", color: "#477d95" },
  { name: "Electronic", color: "#0d73ec" },
  { name: "Country", color: "#ba5d07" },
  { name: "Latin", color: "#dc148c" },
  { name: "Bollywood", color: "#e8115b" },
  { name: "K-Pop", color: "#148a08" },
  { name: "Metal", color: "#503750" },
  { name: "Reggae", color: "#006450" },
];

const MOOD_LABELS: Record<string, { emoji: string; color: string }> = {
  happy: { emoji: "😄", color: "#f59e0b" },
  sad: { emoji: "😢", color: "#6366f1" },
  energetic: { emoji: "⚡", color: "#ef4444" },
  calm: { emoji: "🌊", color: "#06b6d4" },
  melancholic: { emoji: "🌧️", color: "#8b5cf6" },
  angry: { emoji: "🔥", color: "#dc2626" },
  romantic: { emoji: "💕", color: "#ec4899" },
  chill: { emoji: "😎", color: "#10b981" },
  focused: { emoji: "🎯", color: "#3b82f6" },
  motivational: { emoji: "💪", color: "#f43f5e" },
  nostalgic: { emoji: "🎞️", color: "#a16207" },
  hype: { emoji: "🚀", color: "#0891b2" },
  peaceful: { emoji: "☮️", color: "#059669" },
};

type SearchMode = "regular" | "hum" | "ai" | "screenshot";
type RecordingState = "idle" | "recording" | "processing";

interface ItunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  artworkUrl100: string;
  previewUrl: string;
}

interface ItunesAlbum {
  collectionId: number;
  collectionName: string;
  artistName: string;
  artworkUrl100: string;
}

interface AiTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  thumbnail: string;
  previewUrl: string;
  genre: string;
}

interface AiSearchResult {
  query: string;
  explanation: string;
  mood: string;
  genre: string;
  tracks: AiTrack[];
  attributes: Record<string, string>;
}

interface HumResult {
  score: number;
  song_id: string;
  title: string;
  artist: string;
  thumbnail: string;
  audio_url: string;
}

interface ScreenshotResult {
  found: boolean;
  song_title: string | null;
  artist: string | null;
  confidence: "high" | "medium" | "low";
  source_type: string;
  extracted_text: string;
  explanation: string;
  search_term: string;
  tracks: AiTrack[];
  error?: string;
}

// ── Song row (shared between regular + AI + hum results) ──────────────────────

function SongRow({
  index,
  songId,
  title,
  artist,
  thumbnail,
  album,
  audioUrl,
  score,
  onPlay,
}: {
  index: number;
  songId: string;
  title: string;
  artist: string;
  thumbnail: string;
  album?: string;
  audioUrl?: string;
  score?: number;
  onPlay: () => void;
}) {
  const { user, addToPlaylist, isAuth } = useUserData();
  const { addExternalSong } = useSongData();
  const navigate = useNavigate();
  const isLiked = user?.playlist?.includes(songId) ?? false;

  function handleLike() {
    // Store iTunes/external song data in localStorage before liking
    // so PlayList page can reconstruct it without needing a prior play
    if (songId.startsWith("itunes_") && audioUrl) {
      addExternalSong({
        id: songId,
        title,
        description: artist,
        thumbnail: thumbnail.replace(/\d+x\d+bb/, "300x300bb"),
        audio: audioUrl,
        album: album ?? "",
      });
    }
    addToPlaylist(songId);
  }

  return (
    <div
      className="flex items-center gap-4 px-3 py-2.5 rounded-lg group hover:bg-white/5 transition-all cursor-pointer animate-fade-in-up"
      style={{ animationDelay: `${Math.min(index * 30, 400)}ms` }}
      onClick={onPlay}
    >
      <span className="text-white/30 text-sm w-5 text-right group-hover:hidden flex-shrink-0">
        {score !== undefined ? (
          <span className="text-cyan-400/60 text-xs">{(score * 100).toFixed(0)}%</span>
        ) : (
          index + 1
        )}
      </span>
      <FaPlay className="text-white text-xs hidden group-hover:block w-5 flex-shrink-0" />
      <img
        src={thumbnail || "/download.jpeg"}
        alt={title}
        className="w-10 h-10 rounded object-cover flex-shrink-0"
        onError={(e) => { (e.target as HTMLImageElement).src = "/download.jpeg"; }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{title}</p>
        <button
          className="text-white/40 text-xs truncate hover:text-cyan-400 hover:underline transition-colors text-left"
          onClick={(e) => { e.stopPropagation(); navigate(`/artist/${encodeURIComponent(artist)}`); }}
        >
          {artist}
        </button>
      </div>
      {album && (
        <p className="text-white/25 text-xs truncate hidden sm:block max-w-[160px]">{album}</p>
      )}
      <div
        className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {isAuth && (
          <button onClick={handleLike} title={isLiked ? "Unlike" : "Like"}>
            {isLiked
              ? <FaHeart className="text-pink-400 w-3.5 h-3.5" />
              : <FaRegHeart className="text-white/50 hover:text-white w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Search page ──────────────────────────────────────────────────────────

const Search = () => {
  const [mode, setMode] = useState<SearchMode>("regular");

  // Regular search state
  const [query, setQuery] = useState("");
  const [itunesTracks, setItunesTracks] = useState<ItunesTrack[]>([]);
  const [itunesAlbums, setItunesAlbums] = useState<ItunesAlbum[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI search state
  const [aiQuery, setAiQuery] = useState("");
  const [aiResult, setAiResult] = useState<AiSearchResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  // Screenshot search state
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotResult, setScreenshotResult] = useState<ScreenshotResult | null>(null);
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [screenshotError, setScreenshotError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  // Hum search state
  const [recordState, setRecordState] = useState<RecordingState>("idle");
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [humResults, setHumResults] = useState<HumResult[]>([]);
  const [humError, setHumError] = useState("");
  const [indexedCount, setIndexedCount] = useState<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Web Audio API visualizer
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const { songs, albums, setSelectedSong, setIsPlaying, addExternalSong } = useSongData();
  const { user, isAuth, followArtist, saveScreenshotSearch } = useUserData();
  const navigate = useNavigate();

  // ── Regular search ─────────────────────────────────────────────────────────
  const q = query.toLowerCase().trim();
  const localSongs = q
    ? songs.filter((s) => s.title.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q))
    : [];
  const localAlbums = q
    ? albums.filter((a) => a.title.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q))
    : [];

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setItunesTracks([]); setItunesAlbums([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const [trackRes, albumRes] = await Promise.all([
          axios.get("https://itunes.apple.com/search", {
            params: { term: query, entity: "musicTrack", limit: 25, media: "music" },
          }),
          axios.get("https://itunes.apple.com/search", {
            params: { term: query, entity: "album", limit: 8, media: "music" },
          }),
        ]);
        const tracks = (trackRes.data.results as ItunesTrack[]).filter((t) => t.previewUrl);
        setItunesTracks(tracks);
        setItunesAlbums(albumRes.data.results as ItunesAlbum[]);
        // Lazily index the top 10 tracks for future hum-search
        indexTracksInBackground(tracks.slice(0, 10));
      } catch {
        // Fall back to local-only
      } finally {
        setSearchLoading(false);
      }
    }, 350);
  }, [query]);

  // ── Background Qdrant indexing ─────────────────────────────────────────────
  const indexTracksInBackground = useCallback((tracks: ItunesTrack[]) => {
    if (!tracks.length) return;
    const payload = tracks.map((t) => ({
      song_id: `itunes_${t.trackId}`,
      title: t.trackName,
      artist: t.artistName,
      thumbnail: t.artworkUrl100.replace("100x100bb", "300x300bb"),
      audio_url: t.previewUrl,
    }));
    axios.post(`${AI_SERVICE}/api/ai/index`, { songs: payload }).catch(() => {});
  }, []);

  // ── AI NL Search ───────────────────────────────────────────────────────────
  async function runAiSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiError("");
    setAiResult(null);
    try {
      const res = await axios.post(`${AI_SERVICE}/api/ai/nl-search`, {
        query: aiQuery,
        limit: 15,
      });
      setAiResult(res.data);
      // Index returned tracks too
      if (res.data.tracks?.length) {
        indexTracksInBackground(
          res.data.tracks.slice(0, 10).map((t: AiTrack) => ({
            trackId: parseInt(t.id.replace("itunes_", "")),
            trackName: t.title,
            artistName: t.artist,
            collectionName: t.album,
            artworkUrl100: t.thumbnail.replace("300x300bb", "100x100bb"),
            previewUrl: t.previewUrl,
          }))
        );
      }
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.detail ?? err.message
        : "AI service unreachable. Make sure ai-service is running on port 8001.";
      setAiError(msg);
    } finally {
      setAiLoading(false);
    }
  }

  // ── Screenshot search ──────────────────────────────────────────────────────
  function handleScreenshotFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setScreenshotError("Please upload an image file (JPEG, PNG, WebP, etc.)");
      return;
    }
    setScreenshotError("");
    setScreenshotResult(null);
    setScreenshotFile(file);
    const url = URL.createObjectURL(file);
    setScreenshotPreview(url);
    runScreenshotSearch(file);
  }

  async function runScreenshotSearch(file: File) {
    setScreenshotLoading(true);
    setScreenshotError("");
    try {
      const formData = new FormData();
      // Do NOT set Content-Type manually — axios auto-sets multipart/form-data with correct boundary
      formData.append("image", file, file.name);
      const res = await axios.post(`${AI_SERVICE}/api/ai/screenshot-search`, formData);
      const data = res.data;
      setScreenshotResult(data);

      // Save to DB if user is logged in (fire-and-forget)
      if (isAuth && data) {
        saveScreenshotSearch({
          imageUrl:    data.image_url ?? "",
          songTitle:   data.song_title ?? "",
          artist:      data.artist ?? "",
          confidence:  data.confidence ?? "low",
          sourceType:  data.source_type ?? "other",
          tracksFound: data.tracks?.length ?? 0,
        });
      }

      // Lazily index tracks for future hum-search
      if (data.tracks?.length) {
        indexTracksInBackground(
          data.tracks.slice(0, 8).map((t: AiTrack) => ({
            trackId: parseInt(t.id.replace("itunes_", "")),
            trackName: t.title,
            artistName: t.artist,
            collectionName: t.album,
            artworkUrl100: t.thumbnail.replace("300x300bb", "100x100bb"),
            previewUrl: t.previewUrl,
          }))
        );
      }
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.detail ?? err.message
        : "AI service unreachable. Make sure ai-service is running on port 8001.";
      setScreenshotError(msg);
    } finally {
      setScreenshotLoading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleScreenshotFile(file);
  }

  function clearScreenshot() {
    setScreenshotFile(null);
    setScreenshotPreview(null);
    setScreenshotResult(null);
    setScreenshotError("");
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
  }

  // ── Canvas frequency visualizer ────────────────────────────────────────────
  function drawFrame() {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    const bins = analyser.frequencyBinCount;
    const data = new Uint8Array(bins);
    analyser.getByteFrequencyData(data);
    ctx.clearRect(0, 0, W, H);
    const barW = W / bins;
    for (let i = 0; i < bins; i++) {
      const val = data[i];
      const h = (val / 255) * H;
      const hue = i / bins * 25; // 0° (red) → 25° (orange-red)
      const alpha = 0.55 + (val / 255) * 0.45;
      if (val > 60) {
        ctx.shadowColor = `hsla(${hue}, 95%, 60%, 0.7)`;
        ctx.shadowBlur = 10;
      } else {
        ctx.shadowBlur = 0;
      }
      const grad = ctx.createLinearGradient(0, H - h, 0, H);
      grad.addColorStop(0, `hsla(${hue}, 95%, 70%, ${alpha})`);
      grad.addColorStop(1, `hsla(${hue + 10}, 90%, 45%, ${alpha * 0.6})`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(i * barW + 1, H - h, Math.max(barW - 2, 1), h, 2);
      ctx.fill();
    }
    animFrameRef.current = requestAnimationFrame(drawFrame);
  }

  // ── Hum recording ──────────────────────────────────────────────────────────
  async function startRecording() {
    setHumError("");
    setHumResults([]);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Web Audio API setup for visualizer
      const audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128; // 64 bins
      analyser.smoothingTimeConstant = 0.75;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
      drawFrame();

      const mr = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/ogg;codecs=opus",
      });
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        await sendHumAudio();
      };
      mr.start(100);
      mediaRecorderRef.current = mr;
      setRecordSeconds(0);
      setRecordState("recording");
      timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch {
      setHumError("Microphone access denied. Allow microphone in browser settings.");
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    audioCtxRef.current?.close().catch(() => {});
    analyserRef.current = null;
    mediaRecorderRef.current?.stop();
    setRecordState("processing");
  }

  async function sendHumAudio() {
    const mimeType = mediaRecorderRef.current?.mimeType ?? "audio/webm";
    const blob = new Blob(audioChunksRef.current, { type: mimeType });
    const formData = new FormData();
    formData.append("audio", blob, "hum.webm");
    try {
      const res = await axios.post(`${AI_SERVICE}/api/ai/hum-search`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setHumResults(res.data.results ?? []);
      setIndexedCount(res.data.indexed_songs ?? null);
      if (!res.data.results?.length) {
        setHumError(
          res.data.indexed_songs === 0
            ? "No songs indexed yet. Search for songs first to build the hum index."
            : "No match found. Try humming a bit longer or more clearly."
        );
      }
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.detail ?? err.message
        : "AI service unreachable. Make sure ai-service is running on port 8001.";
      setHumError(msg);
    } finally {
      setRecordState("idle");
    }
  }

  // Fetch indexed count on mount & when switching to hum tab
  useEffect(() => {
    if (mode === "hum") {
      axios.get(`${AI_SERVICE}/api/ai/index/info`)
        .then((r) => setIndexedCount(r.data.count ?? 0))
        .catch(() => setIndexedCount(null));
    }
  }, [mode]);

  // ── Play helpers ───────────────────────────────────────────────────────────
  function playItunesTrack(track: ItunesTrack) {
    const song: Song = {
      id: `itunes_${track.trackId}`,
      title: track.trackName,
      description: track.artistName,
      thumbnail: track.artworkUrl100.replace("100x100bb", "300x300bb"),
      audio: track.previewUrl,
      album: track.collectionName,
    };
    addExternalSong(song);
    setSelectedSong(song.id);
    setIsPlaying(true);
  }

  function playAiTrack(t: AiTrack) {
    const song: Song = {
      id: t.id,
      title: t.title,
      description: t.artist,
      thumbnail: t.thumbnail,
      audio: t.previewUrl,
      album: t.album,
    };
    addExternalSong(song);
    setSelectedSong(song.id);
    setIsPlaying(true);
  }

  function playHumResult(r: HumResult) {
    const song: Song = {
      id: r.song_id,
      title: r.title,
      description: r.artist,
      thumbnail: r.thumbnail,
      audio: r.audio_url,
      album: "",
    };
    addExternalSong(song);
    setSelectedSong(song.id);
    setIsPlaying(true);
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const artistMap = new Map<string, string>();
  itunesTracks.forEach((t) => {
    if (!artistMap.has(t.artistName))
      artistMap.set(t.artistName, t.artworkUrl100.replace("100x100bb", "340x340bb"));
  });
  const uniqueArtists = [...artistMap.entries()];

  const hasRegularResults =
    localSongs.length > 0 || localAlbums.length > 0 ||
    itunesTracks.length > 0 || itunesAlbums.length > 0;

  const moodMeta = aiResult?.mood ? MOOD_LABELS[aiResult.mood] : null;

  return (
    <Layout>
      {/* ── Mode tabs ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-5 mt-1">
        <button
          onClick={() => setMode("regular")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
            mode === "regular"
              ? "bg-white text-black"
              : "text-white/60 hover:text-white hover:bg-white/10"
          }`}
        >
          <FaSearch className="w-3 h-3" />
          Search
        </button>
        <button
          onClick={() => setMode("ai")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
            mode === "ai"
              ? "text-black"
              : "text-white/60 hover:text-white hover:bg-white/10"
          }`}
          style={mode === "ai" ? { background: "linear-gradient(135deg,#0891b2,#06b6d4)" } : {}}
        >
          <HiSparkles className="w-3.5 h-3.5" />
          AI Search
        </button>
        <button
          onClick={() => setMode("hum")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
            mode === "hum"
              ? "text-black"
              : "text-white/60 hover:text-white hover:bg-white/10"
          }`}
          style={mode === "hum" ? { background: "linear-gradient(135deg,#ef4444,#f43f5e)" } : {}}
        >
          <FaMicrophone className="w-3 h-3" />
          Hum to Find
        </button>
        <button
          onClick={() => setMode("screenshot")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
            mode === "screenshot"
              ? "text-black"
              : "text-white/60 hover:text-white hover:bg-white/10"
          }`}
          style={mode === "screenshot" ? { background: "linear-gradient(135deg,#0891b2,#0891b2)" } : {}}
        >
          <FaCamera className="w-3 h-3" />
          Screenshot
        </button>
      </div>

      {/* ── REGULAR SEARCH ────────────────────────────────────────────────── */}
      {mode === "regular" && (
        <>
          <div className="relative mb-8">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
            <input
              autoFocus
              type="text"
              placeholder="Search songs, artists, albums..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-12 pr-10 py-3 rounded-full text-white text-sm font-medium outline-none focus:ring-2 focus:ring-green-500 transition-all"
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.12)" }}
            />
            {searchLoading && (
              <FaSpinner className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4 animate-spin" />
            )}
          </div>

          {!query && (
            <>
              <h2 className="text-xl font-bold text-white mb-4">Browse categories</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-8">
                {GENRE_TILES.map((g, i) => (
                  <button
                    key={i}
                    onClick={() => setQuery(g.name)}
                    className="relative h-24 rounded-xl overflow-hidden text-left p-4 font-bold text-white text-base transition-all hover:scale-[1.03] active:scale-[0.98]"
                    style={{ background: g.color }}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </>
          )}

          {query && !searchLoading && !hasRegularResults && (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-white/50 font-medium">No results for "{query}"</p>
              <p className="text-white/25 text-xs mt-1">Try a different search term</p>
            </div>
          )}

          {itunesTracks.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-bold text-white">Songs</h2>
                <span className="text-xs text-white/30 font-medium">worldwide</span>
              </div>
              <div className="flex flex-col gap-0.5">
                {itunesTracks.map((track, i) => (
                  <SongRow
                    key={track.trackId}
                    index={i}
                    songId={`itunes_${track.trackId}`}
                    title={track.trackName}
                    artist={track.artistName}
                    thumbnail={track.artworkUrl100.replace("100x100bb", "60x60bb")}
                    album={track.collectionName}
                    audioUrl={track.previewUrl}
                    onPlay={() => playItunesTrack(track)}
                  />
                ))}
              </div>
            </section>
          )}

          {localSongs.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-bold text-white">Songs</h2>
                <span className="text-xs text-white/30 font-medium">your library</span>
              </div>
              <div className="flex flex-col gap-0.5">
                {localSongs.slice(0, 10).map((s, i) => (
                  <SongRow
                    key={s.id}
                    index={i}
                    songId={s.id.toString()}
                    title={s.title}
                    artist={s.description ?? ""}
                    thumbnail={s.thumbnail || "/download.jpeg"}
                    onPlay={() => { setSelectedSong(s.id); setIsPlaying(true); }}
                  />
                ))}
              </div>
            </section>
          )}

          {uniqueArtists.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-bold text-white mb-4">Artists</h2>
              <div className="flex gap-4 flex-wrap">
                {uniqueArtists.map(([artist, artwork], i) => {
                  const isFollowing = user?.followedArtists?.includes(artist) ?? false;
                  return (
                    <div
                      key={i}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl hover:bg-white/5 transition-all cursor-pointer group"
                      style={{ width: 152 }}
                      onClick={() => navigate(`/artist/${encodeURIComponent(artist)}`)}
                    >
                      <div className="w-28 h-28 rounded-full overflow-hidden shadow-lg ring-2 ring-white/10 group-hover:ring-green-500/50 transition-all">
                        <img src={artwork} alt={artist} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                      </div>
                      <p className="text-white text-sm font-bold text-center truncate w-full group-hover:text-green-400 transition-colors">{artist}</p>
                      <p className="text-white/40 text-xs">Artist</p>
                      {isAuth && (
                        <button
                          onClick={(e) => { e.stopPropagation(); followArtist(artist); }}
                          className={`px-4 py-1 text-xs font-bold rounded-full border transition-all hover:scale-105 active:scale-95 ${
                            isFollowing
                              ? "bg-green-500 text-black border-green-500"
                              : "text-white border-white/40 hover:border-white"
                          }`}
                        >
                          {isFollowing ? "Following" : "Follow"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {(itunesAlbums.length > 0 || localAlbums.length > 0) && (
            <section className="mb-8">
              <h2 className="text-xl font-bold text-white mb-4">Albums</h2>
              <div className="flex gap-3 flex-wrap">
                {itunesAlbums.map((album, i) => (
                  <div
                    key={`itunes-${i}`}
                    className="p-3 rounded-2xl flex-shrink-0 hover:bg-white/8 transition-all"
                    style={{ background: "rgba(255,255,255,0.04)", minWidth: 160 }}
                  >
                    <img src={album.artworkUrl100.replace("100x100bb", "200x200bb")} alt={album.collectionName} className="w-[148px] h-[148px] object-cover rounded-xl mb-3" />
                    <p className="font-bold text-sm text-white truncate mb-1">{album.collectionName}</p>
                    <button className="text-xs text-white/45 truncate hover:text-green-400 hover:underline transition-colors text-left w-full" onClick={() => navigate(`/artist/${encodeURIComponent(album.artistName)}`)}>
                      {album.artistName}
                    </button>
                  </div>
                ))}
                {localAlbums.slice(0, 4).map((a, i) => (
                  <div
                    key={`local-${i}`}
                    onClick={() => navigate(`/album/${a.id}`)}
                    className="p-3 rounded-2xl cursor-pointer flex-shrink-0 hover:bg-white/8 transition-all"
                    style={{ background: "rgba(255,255,255,0.04)", minWidth: 160 }}
                  >
                    <img src={a.thumbnail || "/download.jpeg"} alt={a.title} className="w-[148px] h-[148px] object-cover rounded-xl mb-3" onError={(e) => { (e.target as HTMLImageElement).src = "/download.jpeg"; }} />
                    <p className="font-bold text-sm text-white truncate mb-1">{a.title}</p>
                    <p className="text-xs text-white/45 truncate">{a.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* ── AI NATURAL LANGUAGE SEARCH ────────────────────────────────────── */}
      {mode === "ai" && (
        <div className="animate-fade-in">
          {/* Search form */}
          <form onSubmit={runAiSearch} className="mb-6">
            <div className="relative">
              <HiSparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#0891b2" }} />
              <input
                autoFocus
                type="text"
                placeholder='Describe what you want… "songs to cry to at 3am" or "gym fire beats"'
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                className="w-full pl-12 pr-28 py-3 rounded-full text-white text-sm font-medium outline-none focus:ring-2 transition-all"
                style={{
                  background: "rgba(8,145,178,0.12)",
                  border: "1px solid rgba(8,145,178,0.35)",
                }}
                onFocus={(e) => { e.target.style.boxShadow = "0 0 0 2px rgba(8,145,178,0.4)"; }}
                onBlur={(e) => { e.target.style.boxShadow = ""; }}
              />
              <button
                type="submit"
                disabled={aiLoading || !aiQuery.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full text-xs font-bold text-white disabled:opacity-40 transition-all flex items-center gap-1.5"
                style={{ background: "linear-gradient(135deg,#0891b2,#06b6d4)" }}
              >
                {aiLoading ? <FaSpinner className="animate-spin w-3 h-3" /> : <FaMagic className="w-3 h-3" />}
                {aiLoading ? "Thinking…" : "Go"}
              </button>
            </div>
          </form>

          {/* Suggestion chips */}
          {!aiResult && !aiLoading && (
            <div className="mb-8">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Try asking</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "songs to cry to at 3am",
                  "pump up gym beats",
                  "old school 90s Bollywood romance",
                  "chill lofi study music",
                  "something like Radiohead but sadder",
                  "happy summer road trip songs",
                  "hindi breakup songs",
                  "K-pop dance anthems",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => { setAiQuery(s); }}
                    className="px-3 py-1.5 rounded-full text-xs text-white/60 hover:text-white transition-all border border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/10"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {aiError && (
            <div className="rounded-xl px-4 py-3 mb-6 text-sm text-red-300 border border-red-500/20" style={{ background: "rgba(239,68,68,0.08)" }}>
              {aiError}
            </div>
          )}

          {/* AI explanation card */}
          {aiResult && (
            <>
              <div
                className="rounded-2xl p-5 mb-6 animate-fade-in"
                style={{ background: "linear-gradient(135deg,rgba(8,145,178,0.15),rgba(6,182,212,0.08))", border: "1px solid rgba(8,145,178,0.2)" }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 text-2xl">
                    {moodMeta?.emoji ?? "🎵"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm mb-1">
                      AI found {aiResult.tracks.length} songs for "{aiResult.query}"
                    </p>
                    <p className="text-white/60 text-xs leading-relaxed">{aiResult.explanation}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {aiResult.mood && (
                        <span
                          className="px-2.5 py-0.5 rounded-full text-xs font-semibold text-white"
                          style={{ background: moodMeta?.color ? `${moodMeta.color}33` : "rgba(255,255,255,0.1)", border: `1px solid ${moodMeta?.color ?? "#ffffff"}44` }}
                        >
                          {moodMeta?.emoji} {aiResult.mood}
                        </span>
                      )}
                      {aiResult.genre && aiResult.genre !== "any" && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold text-white/70 bg-white/10 border border-white/15">
                          {aiResult.genre}
                        </span>
                      )}
                      {aiResult.attributes?.energy && aiResult.attributes.energy !== "medium" && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold text-white/70 bg-white/10 border border-white/15">
                          {aiResult.attributes.energy} energy
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tracks */}
              <div className="flex flex-col gap-0.5">
                {aiResult.tracks.map((t, i) => (
                  <SongRow
                    key={t.id}
                    index={i}
                    songId={t.id}
                    title={t.title}
                    artist={t.artist}
                    thumbnail={t.thumbnail}
                    album={t.album}
                    audioUrl={t.previewUrl}
                    onPlay={() => playAiTrack(t)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── SCREENSHOT SEARCH ─────────────────────────────────────────────── */}
      {mode === "screenshot" && (
        <div className="animate-fade-in">
          {/* Hidden file input */}
          <input
            ref={screenshotInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleScreenshotFile(f); e.target.value = ""; }}
          />

          {/* Info banner */}
          <div
            className="rounded-2xl p-5 mb-6"
            style={{ background: "linear-gradient(135deg,rgba(8,145,178,0.12),rgba(8,145,178,0.08))", border: "1px solid rgba(8,145,178,0.25)" }}
          >
            <p className="text-white font-semibold text-sm mb-1">📸 Identify songs from screenshots</p>
            <p className="text-white/55 text-xs leading-relaxed">
              Upload a screenshot of a music player, YouTube video, Instagram story with song overlay, or lyrics.
              Gemini Vision reads the image and finds the song.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {["Spotify / Apple Music", "YouTube screenshot", "Instagram story", "Song lyrics", "Album artwork"].map((s) => (
                <span key={s} className="px-2.5 py-0.5 rounded-full text-xs text-cyan-300/70 border border-cyan-500/20" style={{ background: "rgba(8,145,178,0.1)" }}>
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Drop zone */}
          {!screenshotFile && (
            <div
              className={`rounded-2xl border-2 border-dashed flex flex-col items-center justify-center py-16 gap-4 cursor-pointer transition-all duration-200 mb-6 ${
                isDragging ? "border-cyan-400 bg-cyan-500/10 scale-[1.01]" : "border-white/15 hover:border-cyan-500/50 hover:bg-white/3"
              }`}
              onClick={() => screenshotInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: isDragging ? "rgba(8,145,178,0.25)" : "rgba(255,255,255,0.05)" }}
              >
                <FaCamera className="text-cyan-400 text-2xl" />
              </div>
              <div className="text-center">
                <p className="text-white/70 font-semibold text-sm">Drop screenshot here</p>
                <p className="text-white/30 text-xs mt-1">or click to browse · JPEG, PNG, WebP</p>
              </div>
            </div>
          )}

          {/* Image preview + result */}
          {screenshotFile && (
            <div className="mb-6">
              <div className="flex gap-4 items-start mb-5">
                {/* Thumbnail */}
                <div className="relative flex-shrink-0">
                  <img
                    src={screenshotPreview!}
                    alt="Screenshot preview"
                    className="w-28 h-28 object-cover rounded-xl border border-white/15"
                  />
                  <button
                    onClick={clearScreenshot}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-white bg-black/80 hover:bg-red-500/80 transition-colors"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>

                {/* Analysis result / loading */}
                <div className="flex-1 min-w-0">
                  {screenshotLoading && (
                    <div className="flex items-center gap-3 py-4">
                      <div className="flex gap-0.5">
                        {[0,1,2,3].map((i) => (
                          <div
                            key={i}
                            className="w-1 rounded-full animate-pulse"
                            style={{ height: `${12 + i * 4}px`, background: "#0891b2", animationDelay: `${i * 120}ms` }}
                          />
                        ))}
                      </div>
                      <span className="text-white/60 text-sm">Gemini Vision analyzing…</span>
                    </div>
                  )}

                  {!screenshotLoading && screenshotResult && (
                    <div
                      className="rounded-xl p-4"
                      style={{
                        background: screenshotResult.found
                          ? "linear-gradient(135deg,rgba(16,185,129,0.12),rgba(8,145,178,0.08))"
                          : "rgba(239,68,68,0.08)",
                        border: screenshotResult.found
                          ? "1px solid rgba(16,185,129,0.25)"
                          : "1px solid rgba(239,68,68,0.2)",
                      }}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        {screenshotResult.found
                          ? <FaCheckCircle className="text-green-400 mt-0.5 flex-shrink-0 w-4 h-4" />
                          : <FaTimesCircle className="text-red-400 mt-0.5 flex-shrink-0 w-4 h-4" />}
                        <div className="flex-1 min-w-0">
                          {screenshotResult.found ? (
                            <>
                              <p className="text-white font-bold text-sm truncate">{screenshotResult.song_title}</p>
                              <p className="text-white/60 text-xs">{screenshotResult.artist}</p>
                            </>
                          ) : (
                            <p className="text-red-300 text-sm">No song identified</p>
                          )}
                        </div>
                        {screenshotResult.found && (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{
                              background: screenshotResult.confidence === "high" ? "rgba(16,185,129,0.25)" : screenshotResult.confidence === "medium" ? "rgba(245,158,11,0.25)" : "rgba(239,68,68,0.2)",
                              color: screenshotResult.confidence === "high" ? "#34d399" : screenshotResult.confidence === "medium" ? "#fbbf24" : "#f87171",
                            }}
                          >
                            {screenshotResult.confidence} confidence
                          </span>
                        )}
                      </div>
                      {screenshotResult.explanation && (
                        <p className="text-white/40 text-xs leading-relaxed">{screenshotResult.explanation}</p>
                      )}
                      {screenshotResult.extracted_text && (
                        <p className="text-white/25 text-xs mt-1.5 italic truncate">Text found: "{screenshotResult.extracted_text}"</p>
                      )}
                    </div>
                  )}

                  {!screenshotLoading && screenshotError && (
                    <div className="rounded-xl px-4 py-3 text-sm text-red-300 border border-red-500/20" style={{ background: "rgba(239,68,68,0.08)" }}>
                      {screenshotError}
                    </div>
                  )}
                </div>
              </div>

              {/* Upload another */}
              <button
                onClick={() => screenshotInputRef.current?.click()}
                className="text-xs text-white/40 hover:text-cyan-400 transition-colors"
              >
                + Upload different screenshot
              </button>
            </div>
          )}

          {/* Tracks from screenshot */}
          {screenshotResult?.tracks && screenshotResult.tracks.length > 0 && (
            <section className="animate-fade-in">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FaCamera className="text-cyan-400 w-4 h-4" />
                {screenshotResult.found
                  ? `Songs matching "${screenshotResult.song_title}"`
                  : "Related songs"}
              </h2>
              <div className="flex flex-col gap-0.5">
                {screenshotResult.tracks.map((t, i) => (
                  <SongRow
                    key={t.id}
                    index={i}
                    songId={t.id}
                    title={t.title}
                    artist={t.artist}
                    thumbnail={t.thumbnail}
                    album={t.album}
                    audioUrl={t.previewUrl}
                    onPlay={() => playAiTrack(t)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* No tracks empty state */}
          {screenshotResult && !screenshotLoading && screenshotResult.tracks.length === 0 && !screenshotResult.found && (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-white/50 text-sm font-medium">Couldn't identify a song</p>
              <p className="text-white/25 text-xs mt-1 max-w-xs">
                Try a clearer screenshot showing the song title, artist, or recognizable lyrics
              </p>
              <button
                onClick={() => screenshotInputRef.current?.click()}
                className="mt-4 px-5 py-2 rounded-full text-sm font-semibold text-white transition-all hover:scale-105"
                style={{ background: "linear-gradient(135deg,#0891b2,#0891b2)" }}
              >
                Try another screenshot
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── HUM-TO-SONG ───────────────────────────────────────────────────── */}
      {mode === "hum" && (
        <div className="animate-fade-in">
          {/* Info banner */}
          <div
            className="rounded-2xl p-5 mb-6"
            style={{ background: "linear-gradient(135deg,rgba(239,68,68,0.12),rgba(244,63,94,0.08))", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <p className="text-white font-semibold text-sm mb-1">🎤 Hum, whistle, or sing a melody</p>
            <p className="text-white/55 text-xs leading-relaxed">
              We'll match it against{" "}
              {indexedCount !== null
                ? <strong className="text-orange-400">{indexedCount} indexed songs</strong>
                : "your indexed songs"}.
              Songs index automatically as you search — the more you search, the better this works.
            </p>
          </div>

          {/* ── Animated Recorder ───────────────────────────────────────────── */}
          <div className="flex flex-col items-center gap-0 py-8 select-none">

            {/* Outer glow stage */}
            <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>

              {/* ── RECORDING: sonar rings ── */}
              {recordState === "recording" && (
                <>
                  <div className="absolute inset-0 rounded-full animate-sonar"
                    style={{ background: "radial-gradient(circle, rgba(239,68,68,0.35) 0%, transparent 70%)" }} />
                  <div className="absolute inset-0 rounded-full animate-sonar-slow"
                    style={{ background: "radial-gradient(circle, rgba(244,63,94,0.28) 0%, transparent 70%)" }} />
                  <div className="absolute inset-0 rounded-full animate-sonar-slower"
                    style={{ background: "radial-gradient(circle, rgba(239,68,68,0.18) 0%, transparent 70%)" }} />
                </>
              )}

              {/* ── PROCESSING: rotating conic gradient ring + orbiting dots ── */}
              {recordState === "processing" && (
                <>
                  {/* Rotating rainbow border */}
                  <div
                    className="absolute rounded-full animate-rotate-conic"
                    style={{
                      width: 116, height: 116,
                      background: "conic-gradient(#0891b2, #ef4444, #f43f5e, #06b6d4, #06b6d4, #0891b2)",
                      top: "50%", left: "50%",
                      transform: "translate(-50%,-50%)",
                      filter: "blur(1px)",
                    }}
                  />
                  {/* Inner dark fill to create border effect */}
                  <div
                    className="absolute rounded-full"
                    style={{ width: 106, height: 106, background: "#0d0d0d", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 1 }}
                  />
                  {/* Orbiting dots */}
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="absolute rounded-full"
                      style={{
                        width: i % 2 === 0 ? 8 : 6,
                        height: i % 2 === 0 ? 8 : 6,
                        top: "50%", left: "50%",
                        marginTop: i % 2 === 0 ? -4 : -3,
                        marginLeft: i % 2 === 0 ? -4 : -3,
                        background: ["#0891b2","#ef4444","#06b6d4","#f43f5e","#06b6d4"][i],
                        boxShadow: `0 0 10px 2px ${["#0891b2","#ef4444","#06b6d4","#f43f5e","#06b6d4"][i]}`,
                        animation: `humOrbit ${1.4 + i * 0.25}s linear infinite`,
                        animationDelay: `${-i * 0.3}s`,
                        zIndex: 2,
                      }}
                    />
                  ))}
                  {/* AI glow */}
                  <div
                    className="absolute inset-0 rounded-full animate-ai-glow pointer-events-none"
                    style={{ background: "radial-gradient(circle, rgba(8,145,178,0.2) 0%, transparent 65%)" }}
                  />
                </>
              )}

              {/* Mic button */}
              <button
                onClick={recordState === "idle" ? startRecording : recordState === "recording" ? stopRecording : undefined}
                disabled={recordState === "processing"}
                className="relative rounded-full flex items-center justify-center transition-all duration-300 hover:scale-[1.06] active:scale-95 disabled:cursor-default"
                style={{
                  width: 96, height: 96, zIndex: 3,
                  background:
                    recordState === "processing"
                      ? "linear-gradient(135deg,#2d1b4e,#1a0a2e)"
                      : recordState === "recording"
                        ? "linear-gradient(135deg,#dc2626,#b91c1c)"
                        : "linear-gradient(135deg,#ef4444,#f43f5e)",
                  boxShadow:
                    recordState === "processing"
                      ? "0 0 40px rgba(8,145,178,0.5), 0 8px 24px rgba(0,0,0,0.5)"
                      : recordState === "recording"
                        ? "0 0 50px rgba(239,68,68,0.7), 0 0 90px rgba(239,68,68,0.3)"
                        : "0 8px 32px rgba(239,68,68,0.45)",
                }}
              >
                {recordState === "processing"
                  ? <HiSparkles className="text-cyan-300 text-3xl animate-spin" style={{ animationDuration: "3s" }} />
                  : recordState === "recording"
                    ? <FaStop className="text-white text-2xl" />
                    : <FaMicrophone className="text-white text-2xl" />}
              </button>
            </div>

            {/* Status text */}
            <div className="text-center mt-2 h-10 flex flex-col items-center justify-center">
              {recordState === "idle" && humResults.length === 0 && !humError && (
                <p className="text-white/45 text-sm">Tap the mic and start humming</p>
              )}
              {recordState === "idle" && (humResults.length > 0 || humError) && (
                <button
                  onClick={startRecording}
                  className="text-red-400 text-xs font-semibold hover:text-red-300 transition-colors"
                >
                  Try again ↺
                </button>
              )}
              {recordState === "recording" && (
                <div className="flex flex-col items-center gap-0.5">
                  <p className="text-sm font-bold animate-text-shimmer">{recordSeconds}s — Listening…</p>
                  <p className="text-white/35 text-xs">Tap again to stop</p>
                </div>
              )}
              {recordState === "processing" && (
                <p className="text-sm font-bold animate-text-shimmer-ai">AI matching melody…</p>
              )}
            </div>

            {/* ── Real-time frequency canvas (visible only while recording) ── */}
            <div
              className="overflow-hidden transition-all duration-500"
              style={{
                height: recordState === "recording" ? 80 : 0,
                opacity: recordState === "recording" ? 1 : 0,
                marginTop: recordState === "recording" ? 16 : 0,
              }}
            >
              <canvas
                ref={canvasRef}
                width={280}
                height={80}
                className="rounded-xl"
                style={{
                  background: "rgba(239,68,68,0.04)",
                  border: "1px solid rgba(239,68,68,0.15)",
                  boxShadow: "0 0 20px rgba(239,68,68,0.1)",
                }}
              />
            </div>
          </div>

          {/* Error */}
          {humError && (
            <div className="rounded-xl px-4 py-3 mb-6 text-sm text-red-300 border border-red-500/20 text-center" style={{ background: "rgba(239,68,68,0.08)" }}>
              {humError}
            </div>
          )}

          {/* Hum results */}
          {humResults.length > 0 && (
            <section className="animate-fade-in">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FaMicrophone className="text-red-400 w-4 h-4" />
                Best Matches
              </h2>
              <div className="flex flex-col gap-0.5">
                {humResults.map((r, i) => (
                  <SongRow
                    key={r.song_id}
                    index={i}
                    songId={r.song_id}
                    title={r.title}
                    artist={r.artist}
                    thumbnail={r.thumbnail}
                    score={r.score}
                    audioUrl={r.audio_url}
                    onPlay={() => playHumResult(r)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </Layout>
  );
};

export default Search;
