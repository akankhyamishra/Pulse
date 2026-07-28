import React, { ReactNode, useEffect, useRef } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Player from "./Player";

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${e.clientX - 170}px, ${e.clientY - 170}px)`;
      }
    };
    window.addEventListener("mousemove", move, { passive: true });
    return () => window.removeEventListener("mousemove", move);
  }, []);

  return (
    <div className="h-screen flex flex-col" style={{ background: "#030d18" }}>
      {/* Global cursor glow */}
      <div ref={cursorRef} className="cursor-glow" />

      <div className="flex flex-1 min-h-0 gap-2 p-2">
        <Sidebar />

        {/* Main content panel */}
        <div
          className="flex-1 rounded-2xl relative flex flex-col overflow-hidden"
          style={{
            background: "linear-gradient(160deg, #071d2e 0%, #050f1c 40%, #030c17 100%)",
          }}
        >
          {/* Aurora ambient blobs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <div
              className="aurora-blob aurora-1"
              style={{ background: "#06b6d4" }}
            />
            <div
              className="aurora-blob aurora-2"
              style={{ background: "#f43f5e" }}
            />
            <div
              className="aurora-blob aurora-3"
              style={{ background: "#ec4899" }}
            />
          </div>

          {/* Top gradient accent */}
          <div
            className="absolute top-0 left-0 right-0 h-64 pointer-events-none z-0"
            style={{
              background: "linear-gradient(180deg, rgba(6,182,212,0.07) 0%, transparent 100%)",
            }}
          />

          {/* Subtle grid texture */}
          <div
            className="absolute inset-0 pointer-events-none z-0 opacity-[0.025]"
            style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />

          {/* Sticky navbar */}
          <div className="relative z-20 px-6 pt-4 pb-2 flex-shrink-0">
            <Navbar />
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-auto relative z-10 px-6 pt-2 pb-6">
            {children}
          </div>
        </div>
      </div>

      <Player />
    </div>
  );
};

export default Layout;
