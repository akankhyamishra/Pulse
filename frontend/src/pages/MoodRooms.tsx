import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useUserData } from "../context/UserContext";
import { useSongData } from "../context/SongContext";
import { FaPlay, FaSignOutAlt } from "react-icons/fa";
import { HiUsers } from "react-icons/hi";

const AI_SERVICE = import.meta.env.VITE_AI_SERVICE_URL ?? "http://localhost:8001";
const USER_SERVICE = "http://localhost:5000";

const ROOMS = [
  { id: "coding",     name: "Coding",      emoji: "ðŸ’»", color: "#3b82f6", grad: "from-blue-600 to-blue-900",      desc: "Deep work mode. Stay in the zone." },
  { id: "gym",        name: "Gym",         emoji: "ðŸ‹ï¸", color: "#ef4444", grad: "from-red-600 to-red-900",        desc: "Push your limits. Turn it up." },
  { id: "roadtrip",   name: "Road Trip",   emoji: "ðŸš—", color: "#f43f5e", grad: "from-orange-500 to-orange-900",  desc: "Windows down, miles ahead." },
  { id: "heartbreak", name: "Heartbreak",  emoji: "ðŸ’”", color: "#8b5cf6", grad: "from-violet-600 to-violet-900",  desc: "Let it out. You're not alone." },
  { id: "late_night", name: "Late Night",  emoji: "ðŸŒ™", color: "#1d4ed8", grad: "from-blue-900 to-slate-900",     desc: "City lights at 2am." },
  { id: "chill",      name: "Chill Vibes", emoji: "â˜®ï¸", color: "#10b981", grad: "from-emerald-600 to-emerald-900", desc: "Laid back and easy." },
  { id: "party",      name: "Party",       emoji: "ðŸŽ‰", color: "#f59e0b", grad: "from-amber-500 to-amber-900",    desc: "The night is young. Let's go." },
  { id: "focus",      name: "Deep Focus",  emoji: "ðŸŽ¯", color: "#6366f1", grad: "from-indigo-600 to-indigo-900",  desc: "In the zone. Flow state." },
] as const;

type RoomId = typeof ROOMS[number]["id"];

interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  thumbnail: string;
  previewUrl: string;
}

interface RoomPlaylist {
  room: string;
  mood: string;
  emoji: string;
  desc: string;
  color: string;
  tracks: Track[];
}

export default function MoodRooms() {
  const { user, joinRoom, leaveRoom, isAuth } = useUserData();
  const { setSelectedSong, setIsPlaying, addExternalSong } = useSongData();
  const navigate = useNavigate();

  const [stats, setStats] = useState<Record<string, number>>({});
  const [activeRoom, setActiveRoom] = useState<RoomId | null>(
    (user?.currentRoom as RoomId) ?? null
  );
  const [playlist, setPlaylist] = useState<RoomPlaylist | null>(null);
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync currentRoom from user
  useEffect(() => {
    setActiveRoom((user?.currentRoom as RoomId) ?? null);
  }, [user?.currentRoom]);

  // Fetch stats on mount + poll every 10s for near-real-time member counts
  useEffect(() => {
    fetchStats();
    pollRef.current = setInterval(fetchStats, 10_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Load playlist when room changes
  useEffect(() => {
    if (activeRoom) fetchRoomPlaylist(activeRoom);
    else setPlaylist(null);
  }, [activeRoom]);

  async function fetchStats() {
    try {
      const r = await fetch(`${USER_SERVICE}/api/v1/rooms/stats`);
      const data = await r.json();
      setStats(data);
    } catch {}
  }

  async function fetchRoomPlaylist(room: string) {
    setLoadingPlaylist(true);
    try {
      const r = await fetch(`${AI_SERVICE}/api/ai/room-playlist/${room}?limit=12`);
      const data = await r.json();
      setPlaylist(data);
    } catch {
      setPlaylist(null);
    } finally {
      setLoadingPlaylist(false);
    }
  }

  async function handleJoin(roomId: RoomId) {
    if (!isAuth) { navigate("/login"); return; }
    if (activeRoom === roomId) return;
    await joinRoom(roomId);
    setActiveRoom(roomId);
    fetchStats();
  }

  async function handleLeave() {
    await leaveRoom();
    setActiveRoom(null);
    setPlaylist(null);
    fetchStats();
  }

  function playTrack(track: Track) {
    addExternalSong({
      id: track.id,
      title: track.title,
      description: track.artist,
      thumbnail: track.thumbnail,
      audio: track.previewUrl,
      album: track.album ?? "",
    });
    setSelectedSong(track.id);
    setIsPlaying(true);
  }

  const roomInfo = ROOMS.find((r) => r.id === activeRoom);

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8 animate-fade-in-up">
        <h1 className="text-3xl font-black text-white mb-1">Mood Rooms</h1>
        <p className="text-white/40 text-sm">Join a room, vibe together, discover music for every moment.</p>
      </div>

      {/* Active room banner */}
      {activeRoom && roomInfo && (
        <div
          className="mb-6 rounded-2xl p-5 flex items-center gap-4 animate-fade-in-up"
          style={{ background: `linear-gradient(135deg, ${roomInfo.color}33, ${roomInfo.color}11)`, border: `1px solid ${roomInfo.color}44` }}
        >
          <span className="text-4xl">{roomInfo.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-white/50 text-xs uppercase tracking-widest mb-0.5">You're vibing in</p>
            <p className="text-white font-black text-xl">{roomInfo.name}</p>
            <p className="text-white/50 text-xs mt-0.5">{stats[activeRoom] ?? 0} people in this room</p>
          </div>
          <button
            onClick={handleLeave}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white/70 hover:text-white border border-white/20 hover:border-white/40 transition-all"
          >
            <FaSignOutAlt className="w-3 h-3" />
            Leave
          </button>
        </div>
      )}

      {/* Room grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {ROOMS.map((room) => {
          const isJoined = activeRoom === room.id;
          const count = stats[room.id] ?? 0;
          return (
            <button
              key={room.id}
              onClick={() => handleJoin(room.id)}
              className={`relative rounded-2xl p-4 text-left transition-all duration-200 group overflow-hidden ${
                isJoined ? "ring-2 scale-[1.02]" : "hover:scale-[1.02] hover:ring-1 ring-white/20"
              }`}
              style={{
                background: isJoined
                  ? `linear-gradient(135deg, ${room.color}55, ${room.color}22)`
                  : "rgba(255,255,255,0.05)",
...(isJoined ? { boxShadow: `0 0 24px ${room.color}44`, outline: `2px solid ${room.color}` } : {}),
              }}
            >
              {/* Glow blob */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: `radial-gradient(circle at 50% 0%, ${room.color}22 0%, transparent 70%)` }}
              />

              <div className="text-3xl mb-3">{room.emoji}</div>
              <p className="font-bold text-white text-sm mb-0.5">{room.name}</p>
              <p className="text-white/40 text-xs mb-3 leading-relaxed">{room.desc}</p>

              <div className="flex items-center gap-1.5">
                <HiUsers className="w-3 h-3 text-white/30" />
                <span className="text-white/40 text-xs">{count} {count === 1 ? "person" : "people"}</span>
                {isJoined && (
                  <span
                    className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full"
                    style={{ background: room.color, color: "white" }}
                  >
                    LIVE
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Room playlist */}
      {activeRoom && (
        <section className="animate-fade-in-up">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xl">{roomInfo?.emoji}</span>
            <h2 className="text-lg font-bold text-white">
              {roomInfo?.name} Playlist
            </h2>
            {loadingPlaylist && (
              <div className="flex gap-0.5 items-center ml-2">
                {[0,1,2].map((i) => (
                  <div
                    key={i}
                    className="w-1 rounded-full animate-pulse"
                    style={{ height: `${10 + i * 4}px`, background: roomInfo?.color, animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            )}
          </div>

          {loadingPlaylist && !playlist && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="rounded-xl overflow-hidden animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div className="aspect-square" style={{ background: "rgba(255,255,255,0.08)" }} />
                  <div className="p-3 space-y-2">
                    <div className="h-3 rounded" style={{ background: "rgba(255,255,255,0.1)", width: "70%" }} />
                    <div className="h-2 rounded" style={{ background: "rgba(255,255,255,0.06)", width: "50%" }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {playlist && playlist.tracks.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {playlist.tracks.map((track) => (
                <div
                  key={track.id}
                  className="rounded-xl overflow-hidden group cursor-pointer transition-all duration-200 hover:scale-[1.03]"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                  onClick={() => playTrack(track)}
                >
                  <div className="relative aspect-square">
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = "/download.jpeg"; }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                        style={{ background: roomInfo?.color ?? "#06b6d4" }}
                      >
                        <FaPlay className="text-white text-xs ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-white text-xs font-semibold truncate">{track.title}</p>
                    <p className="text-white/40 text-xs truncate mt-0.5">{track.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Empty state when not in a room */}
      {!activeRoom && (
        <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
          <div className="text-5xl mb-4">ðŸŽ­</div>
          <p className="text-white/50 font-semibold">Pick a room to start vibing</p>
          <p className="text-white/25 text-sm mt-1">Music plays automatically when you join</p>
        </div>
      )}
    </Layout>
  );
}
