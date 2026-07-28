import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PlayListCard from "./PlayListCard";
import { useUserData } from "../context/UserContext";
import { useSongData } from "../context/SongContext";
import { FiHome, FiSearch, FiPlus } from "react-icons/fi";
import { MdDashboard } from "react-icons/md";
import { FaHeart, FaMusic, FaUser } from "react-icons/fa";
import { HiSparkles } from "react-icons/hi2";
import { BsEmojiSunglasses } from "react-icons/bs";
import { RiEqualizerLine } from "react-icons/ri";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, createPlaylist } = useUserData();
  const { albums } = useSongData();
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  const isActive = (path: string) => location.pathname === path;

  async function handleCreatePlaylist() {
    if (!newPlaylistName.trim()) return;
    await createPlaylist(newPlaylistName.trim());
    setNewPlaylistName("");
    setCreatingPlaylist(false);
  }

  const initials = user?.name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) ?? "?";

  /* ── Icon grid tile ── */
  const GridTile = ({
    path, icon, label, badge,
  }: { path: string; icon: React.ReactNode; label: string; badge?: React.ReactNode }) => {
    const active = isActive(path);
    return (
      <button
        onClick={() => navigate(path)}
        className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl transition-all duration-200 hover:scale-[1.05] active:scale-[0.96] relative"
        style={active ? {
          background: "linear-gradient(135deg, rgba(6,182,212,0.22), rgba(244,63,94,0.12))",
          border: "1px solid rgba(6,182,212,0.35)",
          boxShadow: "0 0 18px rgba(6,182,212,0.18), inset 0 0 12px rgba(6,182,212,0.08)",
        } : {
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {/* Glow dot at top-right when active */}
        {active && (
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: "#06b6d4", boxShadow: "0 0 6px #06b6d4" }}
          />
        )}
        <span style={{ color: active ? "#22d3ee" : "rgba(255,255,255,0.5)", fontSize: 22, lineHeight: 1 }}>
          {icon}
        </span>
        <span className="text-[10px] font-semibold tracking-wide"
          style={{ color: active ? "#e0f7fa" : "rgba(255,255,255,0.4)" }}>
          {label}
        </span>
        {badge && <span className="absolute top-1.5 left-2">{badge}</span>}
      </button>
    );
  };

  return (
    <div className="w-[240px] h-full flex-col gap-2 text-white hidden lg:flex animate-slide-in-left flex-shrink-0">

      {/* ── PULSE Brand header ── */}
      <div
        className="rounded-2xl px-4 py-4 flex-shrink-0"
        style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(6,182,212,0.12)", backdropFilter: "blur(24px)" }}
      >
        <button onClick={() => navigate("/")} className="flex items-center gap-3 group w-full mb-3">
          {/* Animated logo mark */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:rotate-12"
            style={{ background: "linear-gradient(135deg, #06b6d4, #f43f5e)", boxShadow: "0 4px 14px rgba(6,182,212,0.35)" }}
          >
            <RiEqualizerLine className="text-white w-5 h-5" />
          </div>
          <span
            className="text-xl font-black tracking-[0.2em]"
            style={{
              background: "linear-gradient(90deg, #06b6d4, #a78bfa, #f43f5e)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            PULSE
          </span>
        </button>

        {/* Mini EKG decoration */}
        <svg width="100%" height="16" viewBox="0 0 200 16" preserveAspectRatio="none">
          <polyline
            points="0,8 28,8 36,2 44,14 52,8 80,8 88,4 96,12 104,8 160,8 168,3 176,13 184,8 200,8"
            fill="none" stroke="url(#sbEkg)" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ strokeDasharray: 300, animation: "ekgDraw 2.4s ease-in-out infinite, ekgFade 2.4s ease-in-out infinite" }}
          />
          <defs>
            <linearGradient id="sbEkg" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.6"/>
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.6"/>
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* ── Icon-grid navigation ── */}
      <div
        className="rounded-2xl p-3 flex-shrink-0"
        style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(6,182,212,0.08)", backdropFilter: "blur(24px)" }}
      >
        {/* 2-column grid */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <GridTile path="/"      icon={<FiHome />}             label="Home" />
          <GridTile path="/search" icon={<FiSearch />}           label="Search" />
          <GridTile path="/ai-dj"  icon={<HiSparkles />}        label="AI DJ"
            badge={
              <span className="text-[7px] font-black px-1 py-0.5 rounded-full text-cyan-300"
                style={{ background: "rgba(6,182,212,0.25)" }}>AI</span>
            }
          />
          <GridTile path="/rooms" icon={<BsEmojiSunglasses />}  label="Mood Rooms"
            badge={user?.currentRoom
              ? <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#f43f5e" }} />
              : undefined}
          />
        </div>
        {/* Profile — full width below grid */}
        {user && (
          <button
            onClick={() => navigate("/profile")}
            className="flex items-center gap-3 px-3 py-2 rounded-xl w-full transition-all duration-200 hover:scale-[1.02] group"
            style={isActive("/profile") ? {
              background: "rgba(6,182,212,0.15)",
              border: "1px solid rgba(6,182,212,0.25)",
            } : {
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #06b6d4, #f43f5e)" }}
            >
              {initials}
            </div>
            <span className="text-xs font-semibold truncate"
              style={{ color: isActive("/profile") ? "#22d3ee" : "rgba(255,255,255,0.55)" }}>
              {user.name}
            </span>
            <FaUser className="w-3 h-3 ml-auto opacity-30 group-hover:opacity-60 transition-opacity" />
          </button>
        )}
      </div>

      {/* ── Library panel ── */}
      <div
        className="rounded-2xl flex-1 flex flex-col overflow-hidden"
        style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(6,182,212,0.07)", backdropFilter: "blur(24px)" }}
      >
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(6,182,212,0.09)" }}>
          <div className="flex items-center gap-2.5">
            <RiEqualizerLine className="w-4 h-4" style={{ color: "rgba(6,182,212,0.7)" }} />
            <span className="font-semibold text-xs tracking-wider uppercase text-white/55">Library</span>
          </div>
          {user && (
            <button
              onClick={() => setCreatingPlaylist(true)}
              className="w-6 h-6 rounded-full flex items-center justify-center text-white/35 hover:text-cyan-400 transition-all duration-200 hover:bg-white/8"
              title="New playlist"
            >
              <FiPlus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {creatingPlaylist && (
            <div className="mx-3 mt-3 flex flex-col gap-2 animate-fade-in">
              <input
                autoFocus
                className="auth-input text-sm py-2"
                placeholder="Playlist name…"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreatePlaylist();
                  if (e.key === "Escape") { setCreatingPlaylist(false); setNewPlaylistName(""); }
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setCreatingPlaylist(false); setNewPlaylistName(""); }}
                  className="flex-1 py-1.5 text-xs rounded-full border border-white/15 text-white/55 hover:text-white transition-all"
                >Cancel</button>
                <button
                  onClick={handleCreatePlaylist}
                  disabled={!newPlaylistName.trim()}
                  className="flex-1 py-1.5 text-xs rounded-full font-bold text-white disabled:opacity-40 transition-all"
                  style={{ background: "linear-gradient(135deg, #06b6d4, #f43f5e)" }}
                >Create</button>
              </div>
            </div>
          )}

          {user && (
            <button
              onClick={() => navigate("/playlist")}
              className="mx-2 mt-3 flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/6 transition-all group text-left w-[calc(100%-16px)]"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #f43f5e, #9333ea)" }}
              >
                <FaHeart className="text-white text-xs" />
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-semibold group-hover:text-cyan-400 transition-colors">Liked Songs</p>
                <p className="text-white/30 text-[10px]">{user.playlist?.length ?? 0} songs</p>
              </div>
            </button>
          )}

          {user && (user.customPlaylists ?? []).map((pl) => {
            const cover = pl.songs[0]?.thumbnail;
            return (
              <button
                key={pl._id}
                onClick={() => navigate(`/playlist/${pl._id}`)}
                className={`mx-2 mt-1 flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/6 transition-all group text-left w-[calc(100%-16px)] ${
                  location.pathname === `/playlist/${pl._id}` ? "bg-white/7" : ""
                }`}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={{ background: cover ? undefined : "linear-gradient(135deg, #0891b2, #f43f5e)" }}
                >
                  {cover
                    ? <img src={cover} className="w-full h-full object-cover" alt="" />
                    : <FaMusic className="text-white text-xs" />}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-xs font-semibold group-hover:text-cyan-400 transition-colors truncate">{pl.name}</p>
                  <p className="text-white/30 text-[10px]">{pl.songs.length} songs</p>
                </div>
              </button>
            );
          })}

          {!user && (
            <div className="mx-2 mt-3 rounded-xl overflow-hidden cursor-pointer flex-shrink-0" onClick={() => navigate("/playlist")}>
              <PlayListCard />
            </div>
          )}

          {albums.length > 0 && (
            <div className="mx-2 mt-3 flex flex-col gap-0.5">
              <p className="text-white/20 text-[9px] uppercase tracking-widest px-2 py-1 mb-0.5">Albums</p>
              {albums.map((album, i) => (
                <button
                  key={i}
                  onClick={() => navigate(`/album/${album.id}`)}
                  className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/6 transition-all group text-left w-full"
                >
                  <img src={album.thumbnail} alt={album.title} className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/download.jpeg"; }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-xs font-medium truncate group-hover:text-cyan-400 transition-colors">{album.title}</p>
                    <p className="text-white/30 text-[10px] truncate">{album.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {user?.role === "admin" && (
            <div className="mx-2 mt-3 mb-3">
              <button
                onClick={() => navigate("/admin/dashboard")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-xs transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-white"
                style={{
                  background: "linear-gradient(135deg, #06b6d4, #f43f5e)",
                  boxShadow: "0 4px 16px rgba(6,182,212,0.25)",
                }}
              >
                <MdDashboard className="w-4 h-4" />
                Admin Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
