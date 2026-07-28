import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useUserData, PlaylistSong } from "../context/UserContext";
import { useSongData, Song } from "../context/SongContext";
import { FaPlay, FaTrash, FaMusic } from "react-icons/fa";

const CustomPlaylist = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, removeSongFromPlaylist } = useUserData();
  const { setSelectedSong, setIsPlaying, selectedSong, isPlaying, addExternalSong } = useSongData();

  const playlist = user?.customPlaylists?.find((p) => p._id === id);

  if (!playlist) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-white/50">Playlist not found</p>
          <button onClick={() => navigate("/profile")} className="text-green-400 hover:underline text-sm">← Back to profile</button>
        </div>
      </Layout>
    );
  }

  const cover = playlist.songs[0]?.thumbnail;

  function playSong(song: PlaylistSong) {
    if (song.audio) {
      const s: Song = { id: song.id, title: song.title, description: song.artistName, thumbnail: song.thumbnail, audio: song.audio, album: "" };
      addExternalSong(s);
    }
    setSelectedSong(song.id);
    setIsPlaying(true);
  }

  return (
    <Layout>
      {/* Header */}
      <div
        className="flex flex-col sm:flex-row items-center sm:items-end gap-6 p-8 rounded-2xl mb-6 animate-fade-in"
        style={{ background: "linear-gradient(160deg,rgba(8,145,178,0.2) 0%,rgba(8,145,178,0.04) 100%)" }}
      >
        <div
          className="w-44 h-44 rounded-2xl flex-shrink-0 flex items-center justify-center overflow-hidden shadow-2xl"
          style={{ background: cover ? undefined : "linear-gradient(135deg,#0891b2,#06b6d4)", boxShadow: "0 20px 60px rgba(8,145,178,0.4)" }}
        >
          {cover
            ? <img src={cover} className="w-full h-full object-cover" />
            : <FaMusic className="text-white text-5xl opacity-60" />}
        </div>
        <div>
          <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Playlist</p>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-3">{playlist.name}</h1>
          <p className="text-white/50 text-sm">{user?.name} · {playlist.songs.length} song{playlist.songs.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Controls */}
      {playlist.songs.length > 0 && (
        <div className="flex items-center gap-4 px-2 mb-6">
          <button
            onClick={() => playSong(playlist.songs[0])}
            className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            style={{ background: "#06b6d4", boxShadow: "0 8px 24px rgba(6,182,212,0.4)" }}
          >
            <FaPlay className="text-black text-lg ml-1" />
          </button>
        </div>
      )}

      {/* Song list */}
      {playlist.songs.length > 0 ? (
        <>
          <div className="grid grid-cols-[2rem_1fr_4rem] gap-4 px-4 py-2 mb-1 border-b border-white/10">
            <span className="text-white/40 text-xs uppercase tracking-wider text-center">#</span>
            <span className="text-white/40 text-xs uppercase tracking-wider">Title</span>
            <span className="text-white/40 text-xs uppercase tracking-wider text-right">Remove</span>
          </div>
          {playlist.songs.map((song, i) => {
            const isActive = selectedSong === song.id;
            return (
              <div
                key={song.id}
                className="grid grid-cols-[2rem_1fr_4rem] gap-4 px-4 py-3 rounded-lg group cursor-pointer transition-all song-row animate-fade-in-up"
                style={{ background: isActive ? "rgba(255,255,255,0.1)" : undefined, animationDelay: `${Math.min(i * 40, 500)}ms` }}
                onClick={() => playSong(song)}
              >
                <div className="flex items-center justify-center">
                  {isActive && isPlaying ? (
                    <div className="flex items-end gap-[2px] h-4">
                      <div className="eq-bar" /><div className="eq-bar" /><div className="eq-bar" />
                    </div>
                  ) : (
                    <>
                      <span className={`text-sm group-hover:hidden ${isActive ? "text-green-500" : "text-white/40"}`}>{i + 1}</span>
                      <FaPlay className="text-white text-xs hidden group-hover:block" />
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3 min-w-0">
                  <img src={song.thumbnail || "/download.jpeg"} className="w-10 h-10 rounded object-cover flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = "/download.jpeg"; }} />
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${isActive ? "text-green-400" : "text-white"}`}>{song.title}</p>
                    <p className="text-white/40 text-xs truncate">{song.artistName}</p>
                  </div>
                </div>
                <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => removeSongFromPlaylist(playlist._id, song.id)}
                    className="text-white/30 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove from playlist"
                  >
                    <FaTrash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16">
          <FaMusic className="text-white/20 text-4xl mb-4" />
          <p className="text-white/40 text-sm">This playlist is empty</p>
          <p className="text-white/25 text-xs mt-1">Add songs from Search or Artist pages</p>
        </div>
      )}
    </Layout>
  );
};

export default CustomPlaylist;
