import React from "react";
import { FaHeart, FaRegHeart, FaPlay } from "react-icons/fa";
import { useUserData } from "../context/UserContext";
import { useSongData } from "../context/SongContext";

interface SongCardProps {
  image: string;
  name: string;
  desc: string;
  id: string;
}

const SongCard: React.FC<SongCardProps> = ({ image, name, desc, id }) => {
  const { addToPlaylist, isAuth, user } = useUserData();
  const { setSelectedSong, setIsPlaying } = useSongData();

  const isLiked = user?.playlist?.includes(id.toString()) ?? false;

  return (
    <div
      className="card-lift min-w-[160px] p-3 rounded-2xl cursor-pointer group flex-shrink-0"
      style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.08)" }}
    >
      <div className="relative overflow-hidden rounded-xl mb-3">
        <img
          src={image || "/download.jpeg"}
          className="w-[148px] h-[148px] object-cover transition-transform duration-500 group-hover:scale-110"
          alt={name}
          onError={(e) => { (e.target as HTMLImageElement).src = "/download.jpeg"; }}
        />
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 60%)" }}
        />
        <div className="absolute bottom-2 left-0 right-0 flex justify-end gap-2 px-2 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          {isAuth && (
            <button
              onClick={(e) => { e.stopPropagation(); addToPlaylist(id); }}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-90"
              style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
              title={isLiked ? "Remove from liked" : "Add to liked songs"}
            >
              {isLiked
                ? <FaHeart className="text-pink-400 text-xs" />
                : <FaRegHeart className="text-white/80 text-xs" />}
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedSong(id); setIsPlaying(true); }}
            className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 active:scale-90"
            style={{
              background: "linear-gradient(135deg, #06b6d4, #f43f5e)",
              boxShadow: "0 6px 20px rgba(6,182,212,0.45)",
            }}
            title="Play"
          >
            <FaPlay className="text-white text-sm ml-0.5" />
          </button>
        </div>
      </div>

      <p className="font-bold text-sm text-white truncate mb-1">{name}</p>
      <p className="text-xs text-white/40 truncate">{desc}</p>

      {isLiked && (
        <div className="flex items-center gap-1 mt-1">
          <FaHeart className="text-pink-400 text-[10px]" />
          <span className="text-pink-400 text-[10px] font-medium">Liked</span>
        </div>
      )}
    </div>
  );
};

export default SongCard;
