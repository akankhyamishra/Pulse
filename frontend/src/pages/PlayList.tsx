import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { Song, useSongData } from "../context/SongContext";
import { useUserData } from "../context/UserContext";
import { FaHeart, FaPlay, FaPause, FaRegHeart } from "react-icons/fa";
import Loading from "../components/Loading";

const PlayList = () => {
  const { songs, setIsPlaying, setSelectedSong, selectedSong, isPlaying, loading, addExternalSong } =
    useSongData();
  const { user, addToPlaylist, isAuth } = useUserData();
  const [myPlayList, setMyPlayList] = useState<Song[]>([]);

  useEffect(() => {
    if (!user?.playlist) return;

    // Songs from the DB
    const dbLiked = songs.filter((s) => user.playlist.includes(s.id.toString()));

    // iTunes songs persisted in localStorage
    const itunesLiked: Song[] = user.playlist
      .filter((id) => id.startsWith("itunes_"))
      .map((id) => {
        try {
          const raw = localStorage.getItem(`ext_song_${id}`);
          return raw ? (JSON.parse(raw) as Song) : null;
        } catch {
          return null;
        }
      })
      .filter((s): s is Song => s !== null);

    // Register iTunes songs back into SongContext so the player can play them
    itunesLiked.forEach((s) => addExternalSong(s));

    setMyPlayList([...dbLiked, ...itunesLiked]);
  }, [songs, user]);

  return (
    <Layout>
      {loading ? (
        <Loading />
      ) : (
        <>
          {/* Header */}
          <div
            className="flex gap-6 p-6 rounded-xl mb-6 mt-2 items-end animate-fade-in-up"
            style={{
              background:
                "linear-gradient(180deg, rgba(8,145,178,0.22) 0%, rgba(8,145,178,0.04) 100%)",
            }}
          >
            <div
              className="w-44 h-44 rounded-lg flex-shrink-0 flex items-center justify-center shadow-2xl"
              style={{
                background: "linear-gradient(135deg, #0891b2, #06b6d4)",
                boxShadow: "0 20px 60px rgba(8,145,178,0.4)",
              }}
            >
              <FaHeart className="text-white text-5xl" />
            </div>
            <div className="flex flex-col">
              <p className="text-xs font-bold text-white uppercase tracking-widest mb-2">Playlist</p>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-3 leading-tight">
                Liked Songs
              </h1>
              <p className="text-white/60 text-sm mb-4">{user?.name}'s favourite tracks</p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-white font-semibold">PULSE</span>
                <span className="text-white/40">•</span>
                <span className="text-white/60">
                  {myPlayList.length} song{myPlayList.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>

          {myPlayList.length > 0 ? (
            <>
              {/* Play button */}
              <div className="flex items-center gap-6 px-2 mb-6">
                <button
                  className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{
                    background: "#06b6d4",
                    boxShadow: "0 8px 24px rgba(6,182,212,0.4)",
                  }}
                  onClick={() => {
                    setSelectedSong(myPlayList[0].id);
                    setIsPlaying(true);
                  }}
                >
                  <FaPlay className="text-black text-lg ml-1" />
                </button>
              </div>

              {/* Table header */}
              <div className="grid grid-cols-[2rem_1fr_1fr_5rem] gap-4 px-4 py-2 mb-1 border-b border-white/10">
                <span className="text-white/40 text-xs uppercase tracking-wider text-center">#</span>
                <span className="text-white/40 text-xs uppercase tracking-wider">Title</span>
                <span className="text-white/40 text-xs uppercase tracking-wider hidden sm:block">Artist</span>
                <span className="text-white/40 text-xs uppercase tracking-wider text-right">Actions</span>
              </div>

              {myPlayList.map((song, index) => {
                const isActive = selectedSong === song.id;
                const isLiked = user?.playlist?.includes(song.id.toString()) ?? false;
                return (
                  <div
                    key={song.id}
                    className="grid grid-cols-[2rem_1fr_1fr_5rem] gap-4 px-4 py-3 rounded-lg group cursor-pointer transition-all duration-150 song-row animate-fade-in-up"
                    style={{
                      background: isActive ? "rgba(255,255,255,0.1)" : undefined,
                      animationDelay: `${Math.min(index * 40, 500)}ms`,
                    }}
                    onClick={() => {
                      setSelectedSong(song.id);
                      setIsPlaying(true);
                    }}
                  >
                    <div className="flex items-center justify-center">
                      {isActive && isPlaying ? (
                        <div className="flex items-end gap-[2px] h-4">
                          <div className="eq-bar" /><div className="eq-bar" /><div className="eq-bar" />
                        </div>
                      ) : (
                        <>
                          <span className={`text-sm group-hover:hidden ${isActive ? "text-cyan-400" : "text-white/40"}`}>
                            {index + 1}
                          </span>
                          <FaPlay className="text-white text-xs hidden group-hover:block" />
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={song.thumbnail || "/download.jpeg"}
                        alt={song.title}
                        className="w-10 h-10 rounded object-cover flex-shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).src = "/download.jpeg"; }}
                      />
                      <span className={`text-sm font-medium truncate ${isActive ? "text-cyan-400" : "text-white"}`}>
                        {song.title}
                      </span>
                    </div>

                    <div className="hidden sm:flex items-center">
                      <p className="text-white/40 text-sm truncate">{song.description?.slice(0, 40)}</p>
                    </div>

                    <div
                      className="flex items-center gap-3 justify-end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isAuth && (
                        <button
                          className={`transition-all duration-200 hover:scale-110 ${isLiked ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                          onClick={() => addToPlaylist(song.id)}
                          title="Remove from liked"
                        >
                          {isLiked
                            ? <FaHeart className="w-3.5 h-3.5 text-pink-400" />
                            : <FaRegHeart className="w-3.5 h-3.5 text-white/50" />}
                        </button>
                      )}
                      <button
                        className="text-white/30 hover:text-cyan-400 transition-colors opacity-0 group-hover:opacity-100"
                        onClick={() => { setSelectedSong(song.id); setIsPlaying(true); }}
                      >
                        {isActive && isPlaying
                          ? <FaPause className="w-3.5 h-3.5" />
                          : <FaPlay className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-48">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ background: "rgba(8,145,178,0.1)" }}
              >
                <FaHeart className="text-white/30 text-xl" />
              </div>
              <p className="text-white/50 text-sm font-medium">No liked songs yet</p>
              <p className="text-white/25 text-xs mt-1">
                Hit the heart icon on any song to save it here
              </p>
            </div>
          )}
        </>
      )}
    </Layout>
  );
};

export default PlayList;
