import React from "react";
import { useNavigate } from "react-router-dom";
import { FaPlay } from "react-icons/fa";

interface AlbumCardProps {
  image: string;
  name: string;
  desc: string;
  id: string;
}

const AlbumCard: React.FC<AlbumCardProps> = ({ image, name, desc, id }) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate("/album/" + id)}
      className="card-lift min-w-[160px] p-3 rounded-2xl cursor-pointer group flex-shrink-0"
      style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.08)" }}
    >
      <div className="relative overflow-hidden rounded-xl mb-3">
        <img
          src={image}
          className="w-[148px] h-[148px] object-cover transition-transform duration-500 group-hover:scale-110"
          alt={name}
        />
        <div className="absolute inset-0 flex items-end justify-end p-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <button
            className="w-11 h-11 rounded-full flex items-center justify-center shadow-xl translate-y-3 group-hover:translate-y-0 transition-all duration-300"
            style={{
              background: "linear-gradient(135deg, #06b6d4, #f43f5e)",
              boxShadow: "0 8px 24px rgba(6,182,212,0.5)",
            }}
          >
            <FaPlay className="text-white text-sm ml-0.5" />
          </button>
        </div>
        <div
          className="absolute bottom-0 left-0 right-0 h-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.5), transparent)" }}
        />
      </div>

      <p className="font-bold text-sm text-white truncate mb-1">{name}</p>
      <p className="text-xs text-white/40 truncate">{desc}</p>
    </div>
  );
};

export default AlbumCard;
