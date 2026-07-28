import React from "react";

// Flat minimal style — warm cream cat on dark, like the Dribbble reference
const CAT   = "#f5e3c0";
const DARK  = "#1a0e05";
const EAR_P = "#f4a0bc";

const Loading = () => (
  <div
    className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden select-none"
    style={{ background: "#030d18" }}
  >
    {/* Ambient glow */}
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div style={{
        position: "absolute", width: 520, height: 520,
        top: "5%", left: "18%",
        background: "radial-gradient(circle, rgba(6,182,212,0.12), transparent 68%)",
        filter: "blur(80px)",
        animation: "orbPulse 5s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", width: 400, height: 400,
        bottom: "5%", right: "12%",
        background: "radial-gradient(circle, rgba(244,63,94,0.09), transparent 68%)",
        filter: "blur(80px)",
        animation: "orbPulse 7s ease-in-out infinite 2s",
      }} />
    </div>

    <div className="relative flex flex-col items-center">
      {/* Bouncing wrapper */}
      <div className="animate-pulse-jam" style={{ transformOrigin: "bottom center", overflow: "visible" }}>
        <svg
          width="240" height="268"
          viewBox="0 0 240 268"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          overflow="visible"
        >
          <defs>
            <linearGradient id="hpBand" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>
          </defs>

          {/* ── BODY ── */}
          <ellipse cx="112" cy="200" rx="58" ry="54"
            fill={CAT} stroke={DARK} strokeWidth="5.5" />

          {/* ── LEFT EAR ── */}
          <path d="M80 100 L58 44 L110 80 Z"
            fill={CAT} stroke={DARK} strokeWidth="5.5" strokeLinejoin="round" />
          {/* inner pink */}
          <path d="M84 96 L66 54 L106 78 Z" fill={EAR_P} opacity="0.9" />

          {/* ── RIGHT EAR ── */}
          <path d="M144 100 L166 44 L114 80 Z"
            fill={CAT} stroke={DARK} strokeWidth="5.5" strokeLinejoin="round" />
          {/* inner pink */}
          <path d="M140 96 L158 54 L118 78 Z" fill={EAR_P} opacity="0.9" />

          {/* ── HEAD ── */}
          <circle cx="112" cy="112" r="58"
            fill={CAT} stroke={DARK} strokeWidth="5.5" />

          {/* ── HEADPHONE BAND ── */}
          <path d="M50 92 Q50 36 112 34 Q174 36 174 92"
            stroke="url(#hpBand)" strokeWidth="13" fill="none" strokeLinecap="round" />

          {/* ── LEFT HEADPHONE CUP ── */}
          <circle className="ear-cup"
            cx="46" cy="108" r="26"
            fill="#06b6d4" stroke={DARK} strokeWidth="4.5" />
          {/* speaker grille */}
          <circle cx="46" cy="108" r="15" fill="rgba(0,0,0,0.24)" />
          {/* specular dot */}
          <circle cx="39" cy="100" r="6" fill="rgba(255,255,255,0.52)" />

          {/* ── RIGHT HEADPHONE CUP ── */}
          <circle className="ear-cup-r"
            cx="178" cy="108" r="26"
            fill="#f43f5e" stroke={DARK} strokeWidth="4.5" />
          <circle cx="178" cy="108" r="15" fill="rgba(0,0,0,0.24)" />
          <circle cx="171" cy="100" r="6" fill="rgba(255,255,255,0.52)" />

          {/* ── CLOSED HAPPY EYES (∩ arcs, squint with beat) ── */}
          {/* Eyes: head center (112, 112). Left arc: x74→106, right arc: x118→150 */}
          <path className="eye-sq-l"
            d="M74 110 Q90 97 106 110"
            stroke={DARK} strokeWidth="5.5" fill="none" strokeLinecap="round" />
          <path className="eye-sq-r"
            d="M118 110 Q134 97 150 110"
            stroke={DARK} strokeWidth="5.5" fill="none" strokeLinecap="round" />

          {/* ── NOSE ── */}
          <circle cx="112" cy="127" r="5.5" fill="#f472b6" />

          {/* ── MOUTH ── */}
          <path d="M103 135 Q112 144 121 135"
            stroke={DARK} strokeWidth="3.5" fill="none" strokeLinecap="round" />

          {/* ── BLUSH ── */}
          <ellipse cx="86"  cy="134" rx="15" ry="9" fill={EAR_P} opacity="0.65" />
          <ellipse cx="138" cy="134" rx="15" ry="9" fill={EAR_P} opacity="0.65" />

          {/* ── PAWS ── */}
          <ellipse cx="84"  cy="248" rx="26" ry="17" fill={CAT} stroke={DARK} strokeWidth="5" />
          <ellipse cx="140" cy="248" rx="26" ry="17" fill={CAT} stroke={DARK} strokeWidth="5" />
          {/* toe lines */}
          <path d="M70 249 Q84 244 98 249"  stroke={DARK} strokeWidth="1.8" fill="none" opacity="0.35" />
          <path d="M126 249 Q140 244 154 249" stroke={DARK} strokeWidth="1.8" fill="none" opacity="0.35" />

          {/* ── TAIL (animates around its base) ── */}
          <g className="cat-tail" style={{ transformOrigin: "162px 222px" }}>
            {/* body fill pass */}
            <path d="M160 224 Q208 210 220 182 Q232 154 214 140"
              stroke={CAT} strokeWidth="21" fill="none" strokeLinecap="round" />
            {/* outline */}
            <path d="M160 224 Q208 210 220 182 Q232 154 214 140"
              stroke={DARK} strokeWidth="5.5" fill="none" strokeLinecap="round" opacity="0.45" />
            {/* fluffy tip */}
            <circle cx="214" cy="140" r="15"
              fill={CAT} stroke={DARK} strokeWidth="5" />
          </g>

          {/* ── STAGGERED MUSIC NOTES (like ZZZs in the Dribbble reference) ──
               Three notes, diagonal staircase upper-right of cat,
               each 0.6s later than the last so they stream sequentially ── */}

          {/* Note 1 — smallest, lowest */}
          <text className="animate-note-float"
            x="196" y="132" fontSize="17"
            fill="#06b6d4" fontFamily="serif" fontWeight="bold"
            style={{ "--note-dur": "2.0s", "--note-delay": "0s" } as React.CSSProperties}
          >♪</text>

          {/* Note 2 — medium */}
          <text className="animate-note-float"
            x="210" y="106" fontSize="23"
            fill="#a78bfa" fontFamily="serif" fontWeight="bold"
            style={{ "--note-dur": "2.0s", "--note-delay": "0.62s" } as React.CSSProperties}
          >♫</text>

          {/* Note 3 — largest, highest */}
          <text className="animate-note-float"
            x="222" y="76" fontSize="30"
            fill="#f43f5e" fontFamily="serif" fontWeight="bold"
            style={{ "--note-dur": "2.0s", "--note-delay": "1.24s" } as React.CSSProperties}
          >♪</text>

          {/* Bonus: a couple on the left so it feels alive all around */}
          <text className="animate-note-float"
            x="8" y="112" fontSize="19"
            fill="#f43f5e" fontFamily="serif"
            style={{ "--note-dur": "2.6s", "--note-delay": "0.3s" } as React.CSSProperties}
          >♬</text>
          <text className="animate-note-float"
            x="16" y="80" fontSize="14"
            fill="#67e8f9" fontFamily="serif"
            style={{ "--note-dur": "3.0s", "--note-delay": "1.0s" } as React.CSSProperties}
          >♩</text>
        </svg>
      </div>

      {/* Ground glow — squishes as cat rises */}
      <div
        className="animate-shadow-jam"
        style={{
          width: 100, height: 18,
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(6,182,212,0.28), transparent 72%)",
          filter: "blur(8px)",
          marginTop: -20,
        }}
      />
    </div>
  </div>
);

export default Loading;
