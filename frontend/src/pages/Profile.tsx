import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useUserData, CustomPlaylist } from "../context/UserContext";
import { useSongData, Song } from "../context/SongContext";
import {
  FaHeart, FaPlay, FaPlus, FaTrash, FaEdit, FaCheck, FaTimes,
  FaMusic, FaUserFriends, FaCompactDisc, FaClock, FaMicrophone,
} from "react-icons/fa";
import axios from "axios";

const server = import.meta.env.VITE_USER_SERVICE_URL ?? "http://localhost:5000";

interface ListenEvent {
  songId: string; songTitle: string; artistName: string;
  thumbnail: string; playedAt: string;
}

interface ListenStats {
  totalSongsPlayed: number;
  totalListenTime: number; // seconds
}

// ── Create Playlist Modal ──────────────────────────────────────────────────────
const CreatePlaylistModal = ({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => void }) => {
  const [name, setName] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#181818] rounded-2xl p-8 w-full max-w-sm shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-white text-xl font-bold mb-6">Create Playlist</h2>
        <input
          autoFocus
          className="auth-input mb-4"
          placeholder="Playlist name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && name.trim() && onCreate(name.trim())}
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-full border border-white/20 text-white/70 hover:text-white text-sm font-medium transition-all">
            Cancel
          </button>
          <button
            onClick={() => name.trim() && onCreate(name.trim())}
            disabled={!name.trim()}
            className="flex-1 py-2.5 rounded-full text-black font-bold text-sm transition-all disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #06b6d4, #f43f5e)" }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Playlist Card ──────────────────────────────────────────────────────────────
const PlaylistCard = ({
  playlist, onPlay, onDelete, onRename,
}: {
  playlist: CustomPlaylist;
  onPlay: (pl: CustomPlaylist) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(playlist.name);
  const cover = playlist.songs[0]?.thumbnail || null;

  return (
    <div className="group relative p-4 rounded-2xl transition-all duration-200 hover:bg-white/8 cursor-pointer" style={{ background: "rgba(255,255,255,0.04)" }}>
      {/* Cover */}
      <div
        className="w-full aspect-square rounded-xl mb-3 flex items-center justify-center overflow-hidden relative"
        style={{ background: cover ? undefined : "linear-gradient(135deg,#06b6d4,#f43f5e)" }}
        onClick={() => onPlay(playlist)}
      >
        {cover
          ? <img src={cover} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <FaMusic className="text-white text-3xl opacity-60" />}
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #06b6d4, #f43f5e)" }}>
            <FaPlay className="text-black text-sm ml-0.5" />
          </div>
        </div>
      </div>

      {/* Name */}
      {editing ? (
        <div className="flex items-center gap-1 mb-1" onClick={(e) => e.stopPropagation()}>
          <input
            autoFocus
            className="flex-1 bg-white/10 text-white text-sm rounded px-2 py-1 outline-none border border-cyan-500"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { onRename(playlist._id, draftName); setEditing(false); }
              if (e.key === "Escape") setEditing(false);
            }}
          />
          <button onClick={() => { onRename(playlist._id, draftName); setEditing(false); }} className="text-cyan-400 hover:text-cyan-300"><FaCheck className="w-3 h-3" /></button>
          <button onClick={() => setEditing(false)} className="text-white/40 hover:text-white"><FaTimes className="w-3 h-3" /></button>
        </div>
      ) : (
        <p className="text-white text-sm font-bold truncate mb-0.5">{playlist.name}</p>
      )}
      <p className="text-white/40 text-xs">{playlist.songs.length} songs</p>

      {/* Action buttons */}
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          className="w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white/60 hover:text-white transition-colors"
        >
          <FaEdit className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(playlist._id); }}
          className="w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white/60 hover:text-red-400 transition-colors"
        >
          <FaTrash className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

// ── Profile Page ───────────────────────────────────────────────────────────────
const Profile = () => {
  const navigate = useNavigate();
  const { user, isAuth, createPlaylist, deletePlaylist, renamePlaylist } = useUserData();
  const { songs, setSelectedSong, setIsPlaying, addExternalSong } = useSongData();

  const [recentHistory, setRecentHistory] = useState<ListenEvent[]>([]);
  const [listenStats, setListenStats] = useState<ListenStats | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!isAuth) return;
    const token = localStorage.getItem("token");
    axios
      .get(`${server}/api/v1/listen/history`, { headers: { token } })
      .then(({ data }) => setRecentHistory((data as ListenEvent[]).slice(0, 12)))
      .catch(() => {});
    axios
      .get(`${server}/api/v1/listen/stats`, { headers: { token } })
      .then(({ data }) => setListenStats(data as ListenStats))
      .catch(() => {});
  }, [isAuth]);

  if (!isAuth || !user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-white/50">Please log in to view your profile</p>
          <button onClick={() => navigate("/login")} className="auth-btn" style={{ width: 160 }}>Log In</button>
        </div>
      </Layout>
    );
  }

  const initials = user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const likedCount = user.playlist?.length ?? 0;
  const followedCount = user.followedArtists?.length ?? 0;
  const playlistCount = user.customPlaylists?.length ?? 0;

  async function handleCreatePlaylist(name: string) {
    setShowCreate(false);
    await createPlaylist(name);
  }

  function playPlaylist(pl: CustomPlaylist) {
    if (!pl.songs.length) return;
    const first = pl.songs[0];
    if (first.audio) {
      const song: Song = { id: first.id, title: first.title, description: first.artistName, thumbnail: first.thumbnail, audio: first.audio, album: "" };
      addExternalSong(song);
      setSelectedSong(first.id);
    } else {
      setSelectedSong(first.id);
    }
    setIsPlaying(true);
  }

  function playHistory(event: ListenEvent) {
    const cached = localStorage.getItem(`ext_song_${event.songId}`);
    if (cached) {
      const s = JSON.parse(cached) as Song;
      addExternalSong(s);
      setSelectedSong(s.id);
      setIsPlaying(true);
    } else {
      const dbSong = songs.find((s) => s.id === event.songId);
      if (dbSong) { setSelectedSong(dbSong.id); setIsPlaying(true); }
    }
  }

  const likedSongs: Song[] = [
    ...songs.filter((s) => user.playlist.includes(s.id.toString())),
    ...user.playlist.filter(id => id.startsWith("itunes_")).map(id => {
      try { const r = localStorage.getItem(`ext_song_${id}`); return r ? JSON.parse(r) as Song : null; } catch { return null; }
    }).filter((s): s is Song => s !== null),
  ].slice(0, 8);

  return (
    <Layout>
      {showCreate && <CreatePlaylistModal onClose={() => setShowCreate(false)} onCreate={handleCreatePlaylist} />}

      {/* ── Header ── */}
      <div
        className="flex flex-col sm:flex-row items-center sm:items-end gap-6 p-8 rounded-2xl mb-8 animate-fade-in"
        style={{ background: "linear-gradient(160deg,rgba(6,182,212,0.15) 0%,rgba(6,182,212,0.03) 100%)" }}
      >
        {/* Avatar */}
        <div
          className="w-32 h-32 rounded-full flex items-center justify-center flex-shrink-0 shadow-2xl text-4xl font-black text-white animate-scale-in"
          style={{ background: "linear-gradient(135deg,#06b6d4,#f43f5e)", boxShadow: "0 20px 60px rgba(6,182,212,0.35)" }}
        >
          {initials}
        </div>
        <div className="text-center sm:text-left animate-fade-in-up">
          <p className="text-white/60 text-xs uppercase tracking-widest font-bold mb-1">Profile</p>
          <h1 className="text-5xl font-black text-white mb-3">{user.name}</h1>
          <div className="flex items-center gap-4 text-sm text-white/60 justify-center sm:justify-start">
            <span><span className="text-white font-semibold">{playlistCount}</span> playlists</span>
            <span className="text-white/20">•</span>
            <span><span className="text-white font-semibold">{likedCount}</span> liked songs</span>
            <span className="text-white/20">•</span>
            <span><span className="text-white font-semibold">{followedCount}</span> following</span>
          </div>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { icon: <FaHeart className="text-cyan-400" />, label: "Liked Songs", value: likedCount, onClick: () => navigate("/playlist") },
          { icon: <FaUserFriends className="text-blue-400" />, label: "Following", value: followedCount, onClick: () => {} },
          { icon: <FaCompactDisc className="text-cyan-400" />, label: "Playlists", value: playlistCount, onClick: () => {} },
          { icon: <FaClock className="text-amber-400" />, label: "Minutes", value: listenStats ? Math.round((listenStats.totalListenTime || 0) / 60) : "—", onClick: () => {} },
        ].map((stat, i) => (
          <button
            key={i}
            onClick={stat.onClick}
            className="flex flex-col items-center gap-2 py-5 rounded-2xl transition-all hover:bg-white/8 active:scale-95 animate-fade-in-up"
            style={{ background: "rgba(255,255,255,0.04)", animationDelay: `${i * 80}ms` }}
          >
            <div className="text-2xl">{stat.icon}</div>
            <p className="text-white text-2xl font-black">{stat.value}</p>
            <p className="text-white/40 text-xs">{stat.label}</p>
          </button>
        ))}
      </div>

      {/* ── Your Playlists ── */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-black text-white">Your Playlists</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-black transition-all hover:scale-105 active:scale-95"
            style={{ background: "linear-gradient(135deg, #06b6d4, #f43f5e)", boxShadow: "0 4px 16px rgba(6,182,212,0.35)" }}
          >
            <FaPlus className="w-3 h-3" /> New Playlist
          </button>
        </div>

        {/* Liked Songs card always first */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <div
            className="group relative p-4 rounded-2xl cursor-pointer transition-all duration-200 hover:bg-white/8"
            style={{ background: "rgba(255,255,255,0.04)" }}
            onClick={() => navigate("/playlist")}
          >
            <div
              className="w-full aspect-square rounded-xl mb-3 flex items-center justify-center relative overflow-hidden"
              style={{ background: "linear-gradient(135deg,#450af5,#c4efd9)" }}
            >
              <FaHeart className="text-white text-3xl" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #06b6d4, #f43f5e)" }}>
                  <FaPlay className="text-black text-sm ml-0.5" />
                </div>
              </div>
            </div>
            <p className="text-white text-sm font-bold truncate mb-0.5">Liked Songs</p>
            <p className="text-white/40 text-xs">{likedCount} songs</p>
          </div>

          {(user.customPlaylists ?? []).map((pl) => (
            <PlaylistCard
              key={pl._id}
              playlist={pl}
              onPlay={playPlaylist}
              onDelete={deletePlaylist}
              onRename={renamePlaylist}
            />
          ))}

          {/* Create new card */}
          <button
            onClick={() => setShowCreate(true)}
            className="p-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all hover:border-cyan-500 hover:bg-white/4 aspect-square"
            style={{ borderColor: "rgba(255,255,255,0.12)" }}
          >
            <FaPlus className="text-white/30 text-2xl" />
            <span className="text-white/40 text-xs font-medium">Create playlist</span>
          </button>
        </div>
      </div>

      {/* ── Liked Songs preview ── */}
      {likedSongs.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-black text-white">Liked Songs</h2>
            <button onClick={() => navigate("/playlist")} className="text-white/50 hover:text-white text-sm transition-colors">See all</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {likedSongs.map((song, i) => (
              <div
                key={song.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/8 transition-all cursor-pointer group animate-fade-in-up"
                style={{ animationDelay: `${i * 40}ms` }}
                onClick={() => { setSelectedSong(song.id); setIsPlaying(true); }}
              >
                <img src={song.thumbnail || "/download.jpeg"} className="w-10 h-10 rounded object-cover flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = "/download.jpeg"; }} />
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-medium truncate group-hover:text-cyan-400 transition-colors">{song.title}</p>
                  <p className="text-white/40 text-xs truncate">{song.description}</p>
                </div>
                <FaHeart className="w-3 h-3 text-cyan-400 flex-shrink-0 opacity-60" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recently Played ── */}
      {recentHistory.length > 0 && (
        <div className="mb-10">
          <h2 className="text-2xl font-black text-white mb-5">Recently Played</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {recentHistory.map((event, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/8 transition-all cursor-pointer group animate-fade-in-up"
                style={{ background: "rgba(255,255,255,0.04)", animationDelay: `${i * 30}ms` }}
                onClick={() => playHistory(event)}
              >
                <img src={event.thumbnail || "/download.jpeg"} className="w-10 h-10 rounded object-cover flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = "/download.jpeg"; }} />
                <div className="min-w-0">
                  <p className="text-white text-xs font-medium truncate group-hover:text-cyan-400 transition-colors">{event.songTitle}</p>
                  <p className="text-white/40 text-[11px] truncate">{event.artistName}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Saved Albums ── */}
      {(user.savedAlbums?.length ?? 0) > 0 && (
        <div className="mb-10">
          <h2 className="text-2xl font-black text-white mb-5">Saved Albums</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {user.savedAlbums.map((album, i) => (
              <button
                key={album.albumId}
                onClick={() => navigate(`/album/${album.albumId}`)}
                className="group text-left animate-fade-in-up"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="relative overflow-hidden rounded-xl mb-2 aspect-square">
                  {album.thumbnail ? (
                    <img
                      src={album.thumbnail}
                      alt={album.albumTitle}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg,#0891b2,#f43f5e)" }}>
                      <FaCompactDisc className="text-white text-3xl opacity-70" />
                    </div>
                  )}
                  {/* Hover play overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg,#06b6d4,#f43f5e)" }}>
                      <FaPlay className="text-white text-sm ml-0.5" />
                    </div>
                  </div>
                </div>
                <p className="text-white text-sm font-bold truncate">{album.albumTitle}</p>
                <p className="text-white/40 text-xs truncate">{album.artistName}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Followed Artists ── */}
      {(user.followedArtists?.length ?? 0) > 0 && (
        <div className="mb-10">
          <h2 className="text-2xl font-black text-white mb-5">Artists You Follow</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {user.followedArtists.map((artist, i) => {
              // Find a song from this artist to use as cover image
              const artistSong = songs.find(
                (s) => s.description === artist || s.description?.toLowerCase().includes(artist.toLowerCase())
              );
              const imgSrc = artistSong?.thumbnail ?? "";
              const initials = artist.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
              const gradients = [
                "linear-gradient(135deg,#06b6d4,#0e7490)",
                "linear-gradient(135deg,#f43f5e,#9f1239)",
                "linear-gradient(135deg,#a78bfa,#6d28d9)",
                "linear-gradient(135deg,#34d399,#065f46)",
                "linear-gradient(135deg,#f59e0b,#b45309)",
              ];
              return (
                <button
                  key={i}
                  onClick={() => navigate(`/artist/${encodeURIComponent(artist)}`)}
                  className="flex flex-col items-center gap-2 group text-center animate-fade-in-up"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  {/* Circular avatar */}
                  <div className="relative w-full aspect-square rounded-full overflow-hidden transition-transform duration-300 group-hover:scale-105"
                    style={{ maxWidth: 140 }}>
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={artist}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-2xl font-black"
                        style={{ background: gradients[i % gradients.length] }}>
                        {initials}
                      </div>
                    )}
                    {/* Hover mic overlay */}
                    <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <FaMicrophone className="text-white text-2xl" />
                    </div>
                  </div>
                  <p className="text-white text-sm font-bold truncate w-full px-1 group-hover:text-cyan-400 transition-colors">{artist}</p>
                  <p className="text-white/35 text-xs">Artist</p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Profile;
