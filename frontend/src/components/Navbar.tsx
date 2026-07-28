import { useNavigate, useLocation } from "react-router-dom";
import { useUserData } from "../context/UserContext";
import { FaChevronLeft, FaChevronRight, FaUser } from "react-icons/fa";
import { RiEqualizerLine } from "react-icons/ri";
import { FiSearch } from "react-icons/fi";
import { HiSparkles } from "react-icons/hi2";

const PAGE_LABELS: Record<string, string> = {
  "/": "Home",
  "/search": "Search",
  "/ai-dj": "AI DJ",
  "/rooms": "Mood Rooms",
  "/profile": "Profile",
  "/playlist": "Liked Songs",
};

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuth, logoutUser, user } = useUserData();
  const initials = user?.name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) ?? "";

  const pageLabel = PAGE_LABELS[location.pathname] ?? "Pulse";

  return (
    <div className="animate-fade-in">
      <div className="w-full flex items-center gap-3">

        {/* ── Back / Forward ── */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-90"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <FaChevronLeft className="text-white/50 w-3 h-3" />
          </button>
          <button
            onClick={() => navigate(+1)}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-90"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <FaChevronRight className="text-white/50 w-3 h-3" />
          </button>
        </div>

        {/* ── Page title breadcrumb — grows to fill space ── */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className="text-white/15 text-xs select-none hidden sm:block">PULSE</span>
          <span className="text-white/15 text-xs select-none hidden sm:block">/</span>
          <span
            className="font-bold text-sm truncate"
            style={{
              background: "linear-gradient(90deg, #06b6d4, #a78bfa)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {pageLabel}
          </span>
        </div>

        {/* ── Search shortcut pill (middle) ── */}
        <button
          onClick={() => navigate("/search")}
          className="hidden md:flex items-center gap-2.5 px-4 py-1.5 rounded-full transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] group"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(6,182,212,0.12)",
            backdropFilter: "blur(12px)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(6,182,212,0.3)";
            (e.currentTarget as HTMLElement).style.background = "rgba(6,182,212,0.07)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(6,182,212,0.12)";
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
          }}
        >
          <FiSearch className="w-3.5 h-3.5 text-white/35 group-hover:text-cyan-400 transition-colors" />
          <span className="text-xs text-white/30 group-hover:text-white/60 transition-colors">Search anything…</span>
          <span className="text-[9px] text-white/20 ml-1 font-mono border border-white/15 rounded px-1 hidden lg:block">⌘K</span>
        </button>

        {/* ── Right section ── */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* AI DJ quick-access */}
          <button
            onClick={() => navigate("/ai-dj")}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 hover:scale-[1.04] active:scale-[0.96]"
            style={{
              background: "rgba(167,139,250,0.14)",
              border: "1px solid rgba(167,139,250,0.25)",
              color: "#c4b5fd",
            }}
          >
            <HiSparkles className="w-3 h-3" />
            AI DJ
          </button>

          {isAuth ? (
            <>
              <button
                onClick={() => navigate("/profile")}
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white transition-all hover:scale-110 active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #06b6d4, #f43f5e)",
                  boxShadow: "0 0 0 2px rgba(6,182,212,0.25)",
                }}
                title={user?.name}
              >
                {initials || <FaUser className="w-3 h-3" />}
              </button>
              <button
                onClick={() => logoutUser()}
                className="px-4 py-1.5 text-xs font-bold rounded-full transition-all duration-200 hover:scale-[1.04] active:scale-[0.96] text-white/70 hover:text-white"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(244,63,94,0.4)";
                  (e.currentTarget as HTMLElement).style.background = "rgba(244,63,94,0.1)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)";
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="flex items-center gap-1.5 px-5 py-1.5 text-sm font-bold text-white rounded-full transition-all duration-200 hover:scale-[1.04] active:scale-[0.96]"
              style={{
                background: "linear-gradient(135deg, #06b6d4, #f43f5e)",
                boxShadow: "0 4px 18px rgba(6,182,212,0.3)",
              }}
            >
              <RiEqualizerLine className="w-3.5 h-3.5" />
              Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
