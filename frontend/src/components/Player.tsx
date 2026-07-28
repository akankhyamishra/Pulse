import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSongData } from "../context/SongContext";
import { useUserData } from "../context/UserContext";
import { FaPlay, FaPause, FaHeart, FaRegHeart } from "react-icons/fa";
import { GrChapterNext, GrChapterPrevious } from "react-icons/gr";
import { MdShuffle, MdRepeat, MdRepeatOne, MdVolumeUp, MdVolumeOff, MdQueueMusic } from "react-icons/md";

interface HeartP { id: number; x: number; emoji: string; dur: number; }

const HEART_EMOJIS = ["❤️", "💕", "💖", "💗", "💓", "💝", "🩷"];

const Player = () => {
  const { song, fetchSingleSong, selectedSong, isPlaying, setIsPlaying, prevSong, nextSong } =
    useSongData();
  const { user, isAuth, addToPlaylist, logListen } = useUserData();
  const navigate = useNavigate();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const listenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listenStartRef = useRef<number>(0);
  const hIdRef = useRef(0);

  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<"off" | "all" | "one">("off");
  const [muted, setMuted] = useState(false);
  const [hearts, setHearts] = useState<HeartP[]>([]);

  const isLiked = user?.playlist?.includes(song?.id?.toString() ?? "") ?? false;

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onMeta = () => setDuration(audio.duration || 0);
    const onTime = () => setProgress(audio.currentTime || 0);
    const onEnded = () => {
      if (repeat === "one") { audio.currentTime = 0; audio.play(); }
      else if (repeat === "all") nextSong();
      else setIsPlaying(false);
    };
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
    };
  }, [song, repeat, nextSong]);

  // Log listen after 8 seconds
  useEffect(() => {
    if (listenTimerRef.current) clearTimeout(listenTimerRef.current);
    if (isPlaying && song && isAuth) {
      listenStartRef.current = Date.now();
      listenTimerRef.current = setTimeout(() => {
        logListen({
          songId: song.id,
          songTitle: song.title,
          artistName: song.description || "",
          albumName: song.album || "",
          thumbnail: song.thumbnail || "",
          listenedFor: Math.floor((Date.now() - listenStartRef.current) / 1000),
        });
      }, 8000);
    }
    return () => { if (listenTimerRef.current) clearTimeout(listenTimerRef.current); };
  }, [selectedSong, isPlaying]);

  const fireHearts = () => {
    const batch: HeartP[] = Array.from({ length: 7 }, () => ({
      id: hIdRef.current++,
      x: Math.round((Math.random() - 0.5) * 72),
      emoji: HEART_EMOJIS[Math.floor(Math.random() * HEART_EMOJIS.length)],
      dur: 0.75 + Math.random() * 0.45,
    }));
    setHearts((p) => [...p, ...batch]);
    setTimeout(() => setHearts((p) => p.filter((h) => !batch.some((b) => b.id === h.id))), 1400);
  };

  const handleLike = () => {
    addToPlaylist(song!.id);
    if (!isLiked) fireHearts();
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value) / 100;
    setVolume(v);
    setMuted(v === 0);
    if (audioRef.current) { audioRef.current.volume = v; audioRef.current.muted = false; }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const next = !muted;
    setMuted(next);
    audioRef.current.muted = next;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = (parseFloat(e.target.value) / 100) * duration;
    if (audioRef.current) audioRef.current.currentTime = t;
    setProgress(t);
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  };

  const cycleRepeat = () => {
    if (repeat === "off") setRepeat("all");
    else if (repeat === "all") setRepeat("one");
    else setRepeat("off");
  };

  useEffect(() => { fetchSingleSong(); }, [selectedSong]);

  if (!song) return null;

  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;
  const artistName = song.description || "";

  return (
    <div
      className="h-[80px] flex items-center px-4 gap-4"
      style={{
        background: "linear-gradient(to right, #0d0b18, #160d28, #0d0b18)",
        borderTop: "1px solid rgba(6,182,212,0.12)",
        boxShadow: "0 -4px 30px rgba(0,0,0,0.4)",
      }}
    >
      {/* ── LEFT: art + info + heart ── */}
      <div className="flex items-center gap-3 w-[260px] flex-shrink-0">
        {/* Album art */}
        <div
          className="relative flex-shrink-0 cursor-pointer group"
          onClick={() => artistName && navigate(`/artist/${encodeURIComponent(artistName)}`)}
        >
          {isPlaying && (
            <div
              className="absolute inset-0 rounded-xl animate-player-ring pointer-events-none"
              style={{ background: "rgba(6,182,212,0.5)" }}
            />
          )}
          <div
            className={`relative w-14 h-14 rounded-xl overflow-hidden shadow-lg flex-shrink-0 transition-all duration-500 ${
              isPlaying ? "ring-2 ring-cyan-500/60" : "ring-1 ring-white/8"
            }`}
            style={isPlaying ? { boxShadow: "0 0 22px rgba(6,182,212,0.35)" } : {}}
          >
            <img
              src={song.thumbnail || "/download.jpeg"}
              alt={song.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
              <span className="text-white text-lg font-bold">↗</span>
            </div>
          </div>
        </div>

        {/* Song info */}
        <div
          className="min-w-0 flex-1 cursor-pointer group"
          onClick={() => artistName && navigate(`/artist/${encodeURIComponent(artistName)}`)}
        >
          <p className="text-white text-sm font-semibold truncate group-hover:text-cyan-300 transition-colors duration-200">
            {song.title}
          </p>
          <p className="text-white/40 text-xs truncate mt-0.5 group-hover:text-white/60 transition-colors duration-200">
            {artistName.slice(0, 28)}
          </p>
        </div>

        {/* Heart button with flying hearts */}
        {isAuth && (
          <div className="relative flex-shrink-0">
            <button
              onClick={handleLike}
              className="transition-all duration-200 hover:scale-125 active:scale-90"
              title={isLiked ? "Remove from liked" : "Save to liked"}
            >
              {isLiked
                ? <FaHeart className="w-4 h-4 text-pink-500" style={{ filter: "drop-shadow(0 0 7px rgba(236,72,153,0.75))" }} />
                : <FaRegHeart className="w-4 h-4 text-white/35 hover:text-pink-400" />
              }
            </button>
            {hearts.map((h) => (
              <span
                key={h.id}
                className="heart-particle"
                style={{ left: `calc(50% + ${h.x}px)`, animationDuration: `${h.dur}s` }}
              >
                {h.emoji}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── CENTER: controls + progress ── */}
      <div className="flex-1 flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-5">
          <button
            onClick={() => setShuffle(!shuffle)}
            className={`transition-all duration-200 hover:scale-110 relative ${shuffle ? "text-cyan-400" : "text-white/40 hover:text-white"}`}
            title="Shuffle"
          >
            <MdShuffle className="w-4 h-4" />
            {shuffle && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400" />}
          </button>

          <button
            onClick={prevSong}
            className="text-white/50 hover:text-white transition-all duration-200 hover:scale-110 active:scale-90"
          >
            <GrChapterPrevious className="w-4 h-4" />
          </button>

          <button
            onClick={handlePlayPause}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-90"
            style={{
              background: "linear-gradient(135deg, #06b6d4, #f43f5e)",
              boxShadow: isPlaying ? "0 0 22px rgba(6,182,212,0.5)" : "0 4px 14px rgba(6,182,212,0.3)",
            }}
          >
            {isPlaying
              ? <FaPause className="text-white text-xs" />
              : <FaPlay className="text-white text-xs ml-0.5" />}
          </button>

          <button
            onClick={nextSong}
            className="text-white/50 hover:text-white transition-all duration-200 hover:scale-110 active:scale-90"
          >
            <GrChapterNext className="w-4 h-4" />
          </button>

          <button
            onClick={cycleRepeat}
            className={`transition-all duration-200 hover:scale-110 relative ${repeat !== "off" ? "text-cyan-400" : "text-white/40 hover:text-white"}`}
            title={`Repeat: ${repeat}`}
          >
            {repeat === "one" ? <MdRepeatOne className="w-4 h-4" /> : <MdRepeat className="w-4 h-4" />}
            {repeat !== "off" && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400" />}
          </button>
        </div>

        <div className="flex items-center gap-2 w-full max-w-lg">
          <span className="text-white/25 text-[10px] w-8 text-right tabular-nums">{fmt(progress)}</span>
          <input
            type="range" min={0} max={100}
            className="progress-bar flex-1"
            value={progressPct}
            onChange={handleSeek}
          />
          <span className="text-white/25 text-[10px] w-8 tabular-nums">{fmt(duration)}</span>
        </div>

        {song.audio && <audio ref={audioRef} src={song.audio} autoPlay={isPlaying} />}
      </div>

      {/* ── RIGHT: eq + queue + volume ── */}
      <div className="flex items-center gap-3 w-[200px] flex-shrink-0 justify-end">
        {isPlaying && (
          <div className="flex items-end gap-[3px] h-4">
            <div className="eq-bar" /><div className="eq-bar" /><div className="eq-bar" /><div className="eq-bar" />
          </div>
        )}
        <button className="text-white/35 hover:text-white transition-colors" title="Queue">
          <MdQueueMusic className="w-4 h-4" />
        </button>
        <button onClick={toggleMute} className="text-white/35 hover:text-white transition-colors flex-shrink-0">
          {muted || volume === 0 ? <MdVolumeOff className="w-4 h-4" /> : <MdVolumeUp className="w-4 h-4" />}
        </button>
        <input
          type="range" min={0} max={100} step={1}
          className="volume-bar w-20"
          value={muted ? 0 : volume * 100}
          onChange={handleVolume}
        />
      </div>
    </div>
  );
};

export default Player;
