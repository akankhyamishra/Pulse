import { FaMusic } from "react-icons/fa";
import { useUserData } from "../context/UserContext";

const PlayListCard = () => {
  const { user, isAuth } = useUserData();

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 hover:bg-white/6 group"
    >
      {/* Icon */}
      <div
        className="w-11 h-11 flex items-center justify-center rounded-lg flex-shrink-0 transition-transform duration-200 group-hover:scale-105"
        style={{
          background: "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)",
        }}
      >
        <FaMusic className="text-white text-base" />
      </div>

      {/* Info */}
      <div className="min-w-0">
        <p className="font-semibold text-sm text-white truncate">My Playlist</p>
        <p className="text-xs text-white/40 mt-0.5 truncate">
          Playlist &bull;{" "}
          {isAuth ? user?.name : "User"}
        </p>
      </div>
    </div>
  );
};

export default PlayListCard;
