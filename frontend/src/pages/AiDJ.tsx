import { useState, useRef, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import { useSongData, Song } from "../context/SongContext";
import { useUserData } from "../context/UserContext";
import axios from "axios";
import {
  FaPaperPlane,
  FaPlay,
  FaHeart,
  FaRegHeart,
  FaTrash,
  FaSpinner,
} from "react-icons/fa";
import { HiSparkles } from "react-icons/hi2";
import { MdGraphicEq } from "react-icons/md";

const AI_SERVICE = import.meta.env.VITE_AI_SERVICE_URL ?? "http://localhost:8001";

const SUGGESTIONS = [
  "Play something more energetic 🔥",
  "Give me songs similar to this 🎵",
  "I need something to chill out 😎",
  "What's trending right now? 📈",
  "Surprise me with something new 🎲",
  "Take the vibe down a notch 🌙",
  "Play some feel-good classics ✨",
  "I want sad songs right now 💙",
];

const MOOD_COLORS: Record<string, string> = {
  happy: "#f59e0b",
  sad: "#6366f1",
  energetic: "#ef4444",
  calm: "#06b6d4",
  romantic: "#ec4899",
  hype: "#0891b2",
  chill: "#10b981",
  focused: "#3b82f6",
  melancholic: "#8b5cf6",
  motivational: "#f43f5e",
};

interface DJTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  thumbnail: string;
  previewUrl: string;
  genre: string;
}

interface DJMessage {
  id: string;
  role: "user" | "dj";
  content: string;
  tracks?: DJTrack[];
  mood?: string;
  intent?: string;
  ts: number;
}

// ── Track card embedded in a DJ message ───────────────────────────────────────
function TrackCard({ track, isActive, onPlay }: {
  track: DJTrack;
  isActive: boolean;
  onPlay: () => void;
}) {
  const { user, addToPlaylist, isAuth } = useUserData();
  const isLiked = user?.playlist?.includes(track.id) ?? false;

  return (
    <div
      className="flex-shrink-0 w-40 rounded-xl overflow-hidden cursor-pointer group transition-all hover:scale-[1.03]"
      style={{
        background: isActive
          ? "rgba(6,182,212,0.15)"
          : "rgba(255,255,255,0.06)",
        border: isActive ? "1px solid rgba(6,182,212,0.4)" : "1px solid rgba(255,255,255,0.08)",
      }}
      onClick={onPlay}
    >
      <div className="relative">
        <img
          src={track.thumbnail || "/download.jpeg"}
          alt={track.title}
          className="w-full h-40 object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = "/download.jpeg"; }}
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "#06b6d4" }}
          >
            <FaPlay className="text-black text-sm ml-0.5" />
          </div>
        </div>
        {isActive && (
          <div className="absolute top-2 left-2 flex items-end gap-[2px] h-4">
            <div className="eq-bar" /><div className="eq-bar" /><div className="eq-bar" />
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className={`text-xs font-semibold truncate mb-0.5 ${isActive ? "text-green-400" : "text-white"}`}>
          {track.title}
        </p>
        <p className="text-white/45 text-xs truncate">{track.artist}</p>
        {isAuth && (
          <button
            className="mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); addToPlaylist(track.id); }}
          >
            {isLiked
              ? <FaHeart className="text-green-400 w-3 h-3" />
              : <FaRegHeart className="text-white/40 hover:text-white w-3 h-3" />}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main AI DJ page ───────────────────────────────────────────────────────────
const AiDJ = () => {
  const [messages, setMessages] = useState<DJMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState<string>(() => {
    const stored = localStorage.getItem("dj_session_id");
    if (stored) return stored;
    const id = crypto.randomUUID();
    localStorage.setItem("dj_session_id", id);
    return id;
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { selectedSong, songs, setSelectedSong, setIsPlaying, addExternalSong, isPlaying } = useSongData();
  const { user } = useUserData();

  // Resolve current song metadata for DJ context
  const currentSongMeta = useCallback(() => {
    if (!selectedSong) return null;
    const local = songs.find((s) => s.id === selectedSong);
    if (local) return { id: String(local.id), title: local.title, artist: local.description ?? "", thumbnail: local.thumbnail };
    const ext = localStorage.getItem(`ext_song_${selectedSong}`);
    if (ext) {
      try {
        const s = JSON.parse(ext) as Song;
        return { id: String(s.id), title: s.title, artist: s.description ?? "", thumbnail: s.thumbnail };
      } catch { /* ignore */ }
    }
    return null;
  }, [selectedSong, songs]);

  // Auto-scroll on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Load Redis history once on mount
  useEffect(() => {
    axios.get(`${AI_SERVICE}/api/ai/dj/session`, { params: { session_id: sessionId } })
      .then((r) => {
        const history: Array<{ role: string; content: string }> = r.data.history ?? [];
        if (history.length === 0) return;
        const msgs: DJMessage[] = history.map((h, i) => ({
          id: `hist_${i}`,
          role: h.role === "dj" ? "dj" : "user",
          content: h.content,
          ts: Date.now() - (history.length - i) * 1000,
        }));
        setMessages(msgs);
      })
      .catch(() => {});
  }, [sessionId]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const current = currentSongMeta();

    const userMsg: DJMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      ts: Date.now(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await axios.post(`${AI_SERVICE}/api/ai/dj/chat`, {
        session_id: sessionId,
        user_message: text,
        current_song: current ?? {},
      });

      const djMsg: DJMessage = {
        id: crypto.randomUUID(),
        role: "dj",
        content: data.dj_response,
        tracks: data.tracks ?? [],
        mood: data.mood,
        intent: data.intent,
        ts: Date.now(),
      };
      setMessages((m) => [...m, djMsg]);
    } catch (err) {
      const detail = axios.isAxiosError(err)
        ? err.response?.data?.detail ?? err.message
        : "AI service unreachable — make sure ai-service is running on port 8001.";
      const errMsg: DJMessage = {
        id: crypto.randomUUID(),
        role: "dj",
        content: `⚠️ ${detail}`,
        ts: Date.now(),
      };
      setMessages((m) => [...m, errMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  function playTrack(track: DJTrack) {
    const song: Song = {
      id: track.id,
      title: track.title,
      description: track.artist,
      thumbnail: track.thumbnail,
      audio: track.previewUrl,
      album: track.album,
    };
    addExternalSong(song);
    setSelectedSong(track.id);
    setIsPlaying(true);
  }

  async function clearChat() {
    await axios.delete(`${AI_SERVICE}/api/ai/dj/session`, { params: { session_id: sessionId } }).catch(() => {});
    setMessages([]);
  }

  const isEmpty = messages.length === 0 && !loading;
  const current = currentSongMeta();

  return (
    <Layout>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Animated DJ icon */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center relative"
            style={{ background: "linear-gradient(135deg,#0891b2,#06b6d4)", boxShadow: "0 0 20px rgba(8,145,178,0.5)" }}
          >
            <HiSparkles className="text-white w-5 h-5" />
            <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: "rgba(8,145,178,0.6)" }} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">AI DJ</h1>
            <p className="text-white/40 text-xs">Powered by Gemini · CrewAI · LangGraph</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {current && (
            <div
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs text-white/60"
              style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)" }}
            >
              {isPlaying && <MdGraphicEq className="text-green-400 w-3.5 h-3.5 animate-pulse" />}
              <span className="truncate max-w-[140px]">{current.title}</span>
            </div>
          )}
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="p-2 rounded-full text-white/30 hover:text-red-400 hover:bg-white/5 transition-all"
              title="Clear chat"
            >
              <FaTrash className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Chat area ───────────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto rounded-2xl mb-4 flex flex-col"
        style={{ minHeight: "calc(100vh - 340px)", maxHeight: "calc(100vh - 340px)" }}
      >
        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center flex-1 py-10 animate-fade-in">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
              style={{ background: "linear-gradient(135deg,rgba(8,145,178,0.2),rgba(6,182,212,0.1))", border: "1px solid rgba(8,145,178,0.3)" }}
            >
              <HiSparkles className="text-cyan-400 w-9 h-9" />
            </div>
            <h2 className="text-white font-bold text-lg mb-2">Your AI DJ is ready</h2>
            <p className="text-white/40 text-sm text-center max-w-xs mb-8">
              Tell me what you're feeling and I'll build the perfect set — powered by 4 AI agents
            </p>
            {/* Suggestion chips */}
            <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="px-3 py-2.5 rounded-xl text-xs text-left text-white/70 hover:text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex flex-col gap-4 px-1 py-2">
          {messages.map((msg) => {
            const moodColor = msg.mood ? MOOD_COLORS[msg.mood] : "#0891b2";
            return (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in-up`}
              >
                {/* DJ avatar */}
                {msg.role === "dj" && (
                  <div
                    className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mr-2 mt-1 self-start"
                    style={{ background: "linear-gradient(135deg,#0891b2,#06b6d4)", boxShadow: `0 0 12px ${moodColor}55` }}
                  >
                    <HiSparkles className="text-white w-3.5 h-3.5" />
                  </div>
                )}

                <div className={`flex flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"} max-w-[85%]`}>
                  {/* Bubble */}
                  <div
                    className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
                    style={
                      msg.role === "user"
                        ? { background: "rgba(255,255,255,0.12)", color: "white", borderBottomRightRadius: 4 }
                        : {
                            background: `linear-gradient(135deg, rgba(8,145,178,0.18), rgba(6,182,212,0.08))`,
                            border: `1px solid ${moodColor}33`,
                            color: "rgba(255,255,255,0.9)",
                            borderBottomLeftRadius: 4,
                          }
                    }
                  >
                    {msg.role === "dj" && msg.mood && (
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-xs font-bold mr-2 mb-1"
                        style={{ background: `${moodColor}25`, color: moodColor, border: `1px solid ${moodColor}44` }}
                      >
                        {msg.mood}
                      </span>
                    )}
                    {msg.content}
                  </div>

                  {/* Recommended track cards */}
                  {msg.role === "dj" && msg.tracks && msg.tracks.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar w-full max-w-full">
                      {msg.tracks.map((track) => (
                        <TrackCard
                          key={track.id}
                          track={track}
                          isActive={selectedSong === track.id}
                          onPlay={() => playTrack(track)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Timestamp */}
                  <span className="text-white/20 text-[10px] px-1">
                    {new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                {/* User avatar */}
                {msg.role === "user" && (
                  <div
                    className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ml-2 mt-1 self-start text-xs font-black text-white"
                    style={{ background: "linear-gradient(135deg,#06b6d4,#0891b2)" }}
                  >
                    {user?.name?.[0]?.toUpperCase() ?? "U"}
                  </div>
                )}
              </div>
            );
          })}

          {/* DJ thinking indicator */}
          {loading && (
            <div className="flex justify-start animate-fade-in">
              <div
                className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mr-2"
                style={{ background: "linear-gradient(135deg,#0891b2,#06b6d4)" }}
              >
                <HiSparkles className="text-white w-3.5 h-3.5" />
              </div>
              <div
                className="px-5 py-3.5 rounded-2xl"
                style={{ background: "rgba(8,145,178,0.12)", border: "1px solid rgba(8,145,178,0.2)", borderBottomLeftRadius: 4 }}
              >
                <div className="flex items-center gap-2">
                  {/* Animated agent indicators */}
                  <div className="flex gap-1">
                    {["Mood", "Genre", "Trend", "Curator"].map((label, i) => (
                      <div
                        key={label}
                        className="flex flex-col items-center gap-1"
                        title={`${label} Agent`}
                      >
                        <div
                          className="w-1.5 h-4 rounded-full"
                          style={{
                            background: ["#ef4444","#06b6d4","#f43f5e","#0891b2"][i],
                            animation: `eqBar 0.9s ease-in-out infinite`,
                            animationDelay: `${i * 0.18}s`,
                            transformOrigin: "bottom",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <span className="text-white/50 text-xs">4 agents thinking…</span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* ── Input bar ───────────────────────────────────────────────────── */}
      <form
        onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
        className="flex items-center gap-3 rounded-2xl px-4 py-3"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <HiSparkles className="text-cyan-400 w-4 h-4 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          placeholder={current ? `"Play something like ${current.title}…"` : "Tell the DJ what you want…"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/30 disabled:opacity-50"
        />
        {loading
          ? <FaSpinner className="text-cyan-400 w-4 h-4 animate-spin flex-shrink-0" />
          : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-90 disabled:opacity-30"
              style={{ background: "linear-gradient(135deg,#0891b2,#06b6d4)" }}
            >
              <FaPaperPlane className="text-white w-3 h-3" />
            </button>
          )}
      </form>

      {/* Quick suggestion pills (when chat is active) */}
      {!isEmpty && (
        <div className="flex gap-2 mt-2 overflow-x-auto hide-scrollbar pb-1">
          {["More energetic 🔥", "Chill it down 🌙", "Similar vibes 🎵", "Surprise me 🎲"].map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              disabled={loading}
              className="flex-shrink-0 px-3 py-1 rounded-full text-xs text-white/50 hover:text-white transition-all border border-white/10 hover:border-cyan-500/40 hover:bg-cyan-500/10 disabled:opacity-30"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </Layout>
  );
};

export default AiDJ;
