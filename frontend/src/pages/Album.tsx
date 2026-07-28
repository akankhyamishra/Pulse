import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import { useSongData } from "../context/SongContext";
import { useEffect } from "react";
import Loading from "../components/Loading";
import { FaHeart, FaRegHeart, FaPlay, FaPause, FaUserAlt } from "react-icons/fa";
import { useUserData } from "../context/UserContext";

const Album = () => {
  const {
    fetchAlbumsongs, albumSong, albumData,
    setIsPlaying, setSelectedSong, selectedSong, isPlaying, loading,
  } = useSongData();
  const { isAuth, addToPlaylist, user, followArtist } = useUserData();
  const params = useParams<{ id: string }>();

  useEffect(() => {
    if (params.id) fetchAlbumsongs(params.id);
  }, [params.id]);

  const isFollowing = albumData?.description
    ? user?.followedArtists?.includes(albumData.description) ?? false
    : false;

  return (
    <Layout>
      {loading ? (
        <Loading />
      ) : albumData ? (
        <>
          {/* Header */}
          <div
            className="flex gap-6 p-6 rounded-xl mb-6 mt-2 items-end"
            style={{ background: "linear-gradient(180deg, rgba(6,182,212,0.18) 0%, rgba(6,182,212,0.04) 100%)" }}
          >
            <img
              src={albumData.thumbnail}
              alt={albumData.title}
              className="w-44 h-44 rounded-lg object-cover flex-shrink-0"
              style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
              onError={(e) => { (e.target as HTMLImageElement).src = "/download.jpeg"; }}
            />
            <div className="flex flex-col">
              <p className="text-xs font-bold text-white uppercase tracking-widest mb-2">Album</p>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-3 leading-tight">{albumData.title}</h1>

              {/* Artist row with follow button */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #06b6d4, #0891b2)" }}>
                  <FaUserAlt className="text-white text-[10px]" />
                </div>
                <span className="text-white text-sm font-semibold">{albumData.description}</span>
                {isAuth && albumData.description && (
                  <button
                    onClick={() => followArtist(albumData.description)}
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

              <div className="flex items-center gap-2 text-sm">
                <span className="text-white font-semibold">Spotify Clone</span>
                <span className="text-white/40">•</span>
                <span className="text-white/60">{albumSong.length} song{albumSong.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
          </div>

          {/* Play button */}
          <div className="flex items-center gap-6 px-2 mb-6">
            <button
              className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ background: "#06b6d4", boxShadow: "0 8px 24px rgba(6,182,212,0.4)" }}
              onClick={() => {
                if (albumSong.length > 0) {
                  setSelectedSong(albumSong[0].id);
                  setIsPlaying(true);
                }
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

          {/* Song rows */}
          {albumSong.map((song, index) => {
            const isActive = selectedSong === song.id;
            const isLiked = user?.playlist?.includes(song.id.toString()) ?? false;
            return (
              <div
                key={song.id}
                className="grid grid-cols-[2rem_1fr_1fr_5rem] gap-4 px-4 py-3 rounded-lg group cursor-pointer transition-all duration-150 song-row"
                style={{ background: isActive ? "rgba(255,255,255,0.1)" : undefined }}
                onClick={() => { setSelectedSong(song.id); setIsPlaying(true); }}
              >
                {/* Index / eq / play */}
                <div className="flex items-center justify-center">
                  {isActive && isPlaying ? (
                    <div className="flex items-end gap-[2px] h-4">
                      <div className="eq-bar" /><div className="eq-bar" /><div className="eq-bar" />
                    </div>
                  ) : (
                    <>
                      <span className={`text-sm group-hover:hidden ${isActive ? "text-green-500" : "text-white/40"}`}>{index + 1}</span>
                      <FaPlay className="text-white text-xs hidden group-hover:block" />
                    </>
                  )}
                </div>

                {/* Title + thumbnail */}
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={song.thumbnail || "/download.jpeg"}
                    alt={song.title}
                    className="w-10 h-10 rounded object-cover flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/download.jpeg"; }}
                  />
                  <span className={`text-sm font-medium truncate ${isActive ? "text-green-400" : "text-white"}`}>{song.title}</span>
                </div>

                {/* Artist */}
                <div className="hidden sm:flex items-center">
                  <p className="text-white/40 text-sm truncate">{song.description?.slice(0, 40)}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 justify-end" onClick={(e) => e.stopPropagation()}>
                  {isAuth && (
                    <button
                      className={`transition-colors ${isLiked ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                      onClick={() => addToPlaylist(song.id)}
                      title={isLiked ? "Remove from liked" : "Add to liked songs"}
                    >
                      {isLiked ? (
                        <FaHeart className="w-3.5 h-3.5 text-green-400" />
                      ) : (
                        <FaRegHeart className="w-3.5 h-3.5 text-white/50 hover:text-white" />
                      )}
                    </button>
                  )}
                  <button
                    className="text-white/30 hover:text-green-500 transition-colors opacity-0 group-hover:opacity-100"
                    onClick={() => { setSelectedSong(song.id); setIsPlaying(true); }}
                  >
                    {isActive && isPlaying ? <FaPause className="w-3.5 h-3.5" /> : <FaPlay className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}

          {albumSong.length === 0 && (
            <p className="text-white/40 text-sm text-center py-16">No songs in this album yet</p>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center h-64">
          <p className="text-white/40">Album not found</p>
        </div>
      )}
    </Layout>
  );
};

export default Album;
