import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUserData } from "../context/UserContext";
import { motion, AnimatePresence } from "framer-motion";
import { FaEye, FaEyeSlash, FaGoogle, FaFacebook } from "react-icons/fa";

// ─── Doodle illustration ───────────────────────────────────────────────────────

const NOTES = [
  { id:1, glyph:"♪", x: 68,  y: 92,  size:28, c:"rgba(255,255,255,0.75)", dur:4.2, delay:0,   driftX:  8 },
  { id:2, glyph:"♫", x: 355, y: 110, size:24, c:"#06b6d4",                dur:3.8, delay:1.1, driftX:-10 },
  { id:3, glyph:"♬", x: 40,  y: 295, size:20, c:"#f43f5e",                dur:4.6, delay:0.6, driftX: 14 },
  { id:4, glyph:"♩", x: 390, y: 320, size:22, c:"rgba(255,255,255,0.6)",  dur:5.0, delay:2.0, driftX:-12 },
  { id:5, glyph:"♪", x: 200, y: 58,  size:16, c:"#a78bfa",                dur:3.5, delay:1.8, driftX:  6 },
];

const STARS = [
  { x: 30,  y: 55,  r: 5   },
  { x: 412, y: 72,  r: 4   },
  { x: 62,  y: 185, r: 3.5 },
  { x: 406, y: 188, r: 4.5 },
  { x: 130, y: 478, r: 3   },
  { x: 380, y: 462, r: 4   },
  { x: 230, y: 32,  r: 3   },
];

function Star({ x, y, r, delay }: { x:number; y:number; r:number; delay:number }) {
  return (
    <motion.g
      animate={{ opacity: [0.35, 0.9, 0.35] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay }}>
      <line x1={x-r} y1={y}   x2={x+r} y2={y}   stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1={x}   y1={y-r} x2={x}   y2={y+r} stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1={x-r*.7} y1={y-r*.7} x2={x+r*.7} y2={y+r*.7} stroke="white" strokeWidth="1" strokeLinecap="round"/>
      <line x1={x-r*.7} y1={y+r*.7} x2={x+r*.7} y2={y-r*.7} stroke="white" strokeWidth="1" strokeLinecap="round"/>
    </motion.g>
  );
}

function MusicDoodle() {
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden select-none">

      {/* ── Ambient glows ── */}
      <motion.div className="absolute rounded-full blur-3xl pointer-events-none"
        style={{ width:420, height:420, top:"5%", left:"8%",
          background:"radial-gradient(circle, rgba(139,92,246,0.11), transparent 70%)" }}
        animate={{ scale:[1,1.18,1], opacity:[0.5,0.8,0.5] }}
        transition={{ duration:7, repeat:Infinity, ease:"easeInOut" }}/>
      <motion.div className="absolute rounded-full blur-3xl pointer-events-none"
        style={{ width:340, height:340, bottom:"8%", right:"10%",
          background:"radial-gradient(circle, rgba(6,182,212,0.1), transparent 70%)" }}
        animate={{ scale:[1,1.15,1], opacity:[0.4,0.75,0.4] }}
        transition={{ duration:9, repeat:Infinity, ease:"easeInOut", delay:3 }}/>

      {/* ── Static doodle layer (stars, piano, waveform, sound waves, dots) ── */}
      <svg
        viewBox="0 0 440 540"
        className="absolute inset-0 w-full h-full"
        style={{ opacity: 0.92 }}
        preserveAspectRatio="xMidYMid meet">

        {/* Stars */}
        {STARS.map((s, i) => <Star key={i} {...s} delay={i * 0.38}/>)}

        {/* Scattered dots */}
        {[[95,148],[345,148],[108,390],[332,390],[220,510]].map(([x,y],i) => (
          <motion.circle key={i} cx={x} cy={y} r="2.5" fill="white"
            animate={{ opacity:[0.15,0.5,0.15] }}
            transition={{ duration:3+i*0.4, repeat:Infinity, ease:"easeInOut", delay:i*0.6 }}/>
        ))}

        {/* ── SOUND WAVES — left (cyan) ── */}
        {[0,1,2].map((i) => (
          <motion.path key={`wl-${i}`}
            d={`M ${42-i*14} ${208-i*12} Q ${22-i*20} 230 ${42-i*14} ${252+i*12}`}
            stroke="#06b6d4" strokeWidth={2.4-i*0.5} fill="none" strokeLinecap="round"
            animate={{ opacity:[0.8,0.25,0.8] }}
            transition={{ duration:2.2, repeat:Infinity, ease:"easeInOut", delay:i*0.32 }}/>
        ))}

        {/* ── SOUND WAVES — right (rose) ── */}
        {[0,1,2].map((i) => (
          <motion.path key={`wr-${i}`}
            d={`M ${398+i*14} ${208-i*12} Q ${418+i*20} 230 ${398+i*14} ${252+i*12}`}
            stroke="#f43f5e" strokeWidth={2.4-i*0.5} fill="none" strokeLinecap="round"
            animate={{ opacity:[0.8,0.25,0.8] }}
            transition={{ duration:2.2, repeat:Infinity, ease:"easeInOut", delay:0.4+i*0.32 }}/>
        ))}

        {/* ── WAVEFORM — middle area ── */}
        <motion.polyline
          points="118,378 138,352 158,394 178,344 198,390 218,356 238,378 258,350 278,396 298,358 318,378"
          stroke="#a78bfa" strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round"
          animate={{ opacity:[0.55,0.85,0.55] }}
          transition={{ duration:3, repeat:Infinity, ease:"easeInOut" }}/>

        {/* ── PIANO KEYS — bottom right ── */}
        {/* Outer border */}
        <rect x="248" y="456" width="176" height="58" rx="6"
          stroke="white" strokeWidth="2.5" fill="none" opacity="0.55"/>
        {/* White key dividers */}
        {[273,298,323,348,373,398].map((x,i) => (
          <line key={i} x1={x} y1="456" x2={x} y2="514"
            stroke="white" strokeWidth="1.4" opacity="0.38"/>
        ))}
        {/* Black keys */}
        {[260,285,335,360,385].map((x,i) => (
          <rect key={i} x={x} y="456" width="18" height="36" rx="3"
            stroke="white" strokeWidth="1.5" fill="#030d18" opacity="0.88"/>
        ))}

        {/* ── TREBLE CLEF tiny doodle — top-center ── */}
        <text x="210" y="88" fontSize="42" fill="none" stroke="white" strokeWidth="1.2"
          opacity="0.3" fontFamily="serif">𝄞</text>

        {/* ── FLOATING NOTES (text elements, positioned) ── */}
        {NOTES.map((n) => (
          <motion.text key={n.id} x={n.x} y={n.y} fontSize={n.size}
            fill={n.c} fontFamily="serif" fontWeight="bold"
            style={{ userSelect:"none" }}
            animate={{
              y:       [n.y, n.y - 50, n.y - 90, n.y - 130],
              x:       [n.x, n.x + n.driftX*0.3, n.x + n.driftX*0.7, n.x + n.driftX],
              opacity: [0, 0.9, 0.7, 0],
            }}
            transition={{ duration:n.dur, repeat:Infinity, ease:"easeOut", delay:n.delay, repeatDelay:0.8 }}/>
        ))}
      </svg>

      {/* ── HEADPHONES (floating, centered focal point) ── */}
      <motion.div
        className="relative z-10"
        initial={{ opacity:0, scale:0.7, y:20 }}
        animate={{ opacity:1, scale:1, y:0 }}
        transition={{ duration:0.9, ease:[0.34,1.56,0.64,1] }}>
        <motion.div
          animate={{ y: [-10, 10, -10] }}
          transition={{ duration:3.6, repeat:Infinity, ease:"easeInOut" }}>
          <svg viewBox="0 0 290 195" width="270" height="182" style={{ overflow:"visible" }}>
            <defs>
              <linearGradient id="bandG" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#06b6d4"/>
                <stop offset="50%"  stopColor="#a78bfa"/>
                <stop offset="100%" stopColor="#f43f5e"/>
              </linearGradient>
            </defs>

            {/* Band */}
            <path d="M 30 98 Q 145 12 260 98"
              stroke="url(#bandG)" strokeWidth="7" fill="none" strokeLinecap="round"/>
            {/* Band shine */}
            <path d="M 50 88 Q 145 18 240 88"
              stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.18"/>

            {/* Left cup outer */}
            <circle cx="24"  cy="118" r="32" stroke="white" strokeWidth="4.5" fill="rgba(6,182,212,0.06)"/>
            {/* Left cup inner ring */}
            <circle cx="24"  cy="118" r="16" stroke="#06b6d4" strokeWidth="2.5" fill="none" opacity="0.7"/>
            {/* Left cup center dot */}
            <circle cx="24"  cy="118" r="5"  fill="#06b6d4" opacity="0.85"/>
            {/* Left ear cushion lines */}
            <path d="M 2 108 Q 24 102 46 108" stroke="white" strokeWidth="1.6" fill="none" opacity="0.35"/>
            <path d="M 2 128 Q 24 134 46 128" stroke="white" strokeWidth="1.6" fill="none" opacity="0.35"/>

            {/* Right cup outer */}
            <circle cx="266" cy="118" r="32" stroke="white" strokeWidth="4.5" fill="rgba(244,63,94,0.06)"/>
            {/* Right cup inner ring */}
            <circle cx="266" cy="118" r="16" stroke="#f43f5e" strokeWidth="2.5" fill="none" opacity="0.7"/>
            {/* Right cup center dot */}
            <circle cx="266" cy="118" r="5"  fill="#f43f5e" opacity="0.85"/>
            {/* Right ear cushion lines */}
            <path d="M 244 108 Q 266 102 288 108" stroke="white" strokeWidth="1.6" fill="none" opacity="0.35"/>
            <path d="M 244 128 Q 266 134 288 128" stroke="white" strokeWidth="1.6" fill="none" opacity="0.35"/>

            {/* Cable */}
            <path d="M 145 162 Q 150 178 145 192"
              stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.38"/>
            <circle cx="145" cy="194" r="4" stroke="white" strokeWidth="2" fill="none" opacity="0.38"/>
          </svg>
        </motion.div>
      </motion.div>

      {/* ── VINYL RECORD — bottom-left ── */}
      <motion.div
        className="absolute pointer-events-none"
        style={{ bottom:"10%", left:"7%" }}
        initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.6, duration:0.8 }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 22, repeat:Infinity, ease:"linear" }}>
          <svg viewBox="0 0 110 110" width="96" height="96">
            <circle cx="55" cy="55" r="51" stroke="white" strokeWidth="2.8" fill="rgba(255,255,255,0.03)" opacity="0.65"/>
            <circle cx="55" cy="55" r="39" stroke="white" strokeWidth="1.5" fill="none" opacity="0.38"/>
            <circle cx="55" cy="55" r="29" stroke="white" strokeWidth="1.2" fill="none" opacity="0.32"/>
            <circle cx="55" cy="55" r="19" stroke="white" strokeWidth="1.2" fill="none" opacity="0.28"/>
            <circle cx="55" cy="55" r="11" stroke="#a78bfa" strokeWidth="2" fill="rgba(139,92,246,0.15)" opacity="0.75"/>
            <circle cx="55" cy="55" r="4"  fill="white" opacity="0.8"/>
          </svg>
        </motion.div>
      </motion.div>

      {/* ── PULSE wordmark — corner ── */}
      <div className="absolute bottom-7 left-8 text-white/14 text-[10px] font-light tracking-[0.4em] uppercase pointer-events-none">
        PULSE
      </div>

      {/* Right separator */}
      <div className="absolute top-0 right-0 bottom-0 w-px pointer-events-none"
        style={{ background:"linear-gradient(to bottom,transparent,rgba(255,255,255,0.05) 30%,rgba(255,255,255,0.05) 70%,transparent)" }}/>
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────

const Login = () => {
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [focused, setFocused]  = useState<"email"|"password"|null>(null);

  const navigate = useNavigate();
  const { loginUser, btnLoading } = useUserData();

  async function submitHandler(e: React.FormEvent) {
    e.preventDefault();
    loginUser(email, password, navigate);
  }

  const inputStyle = (field: "email"|"password") => ({
    background: "rgba(255,255,255,0.04)",
    border: focused === field
      ? `1.5px solid ${field === "email" ? "rgba(6,182,212,0.65)" : "rgba(139,92,246,0.65)"}`
      : "1.5px solid rgba(255,255,255,0.07)",
    boxShadow: focused === field
      ? `0 0 22px ${field === "email" ? "rgba(6,182,212,0.13)" : "rgba(139,92,246,0.13)"}`
      : "none",
  });

  return (
    <div className="fixed inset-0 flex overflow-hidden" style={{ background:"#030d18" }}>

      {/* ══ LEFT — DOODLE HERO ══ */}
      <div className="relative flex-1 overflow-hidden"
        style={{ background:"linear-gradient(148deg,#03091a 0%,#040c20 55%,#020810 100%)" }}>
        <MusicDoodle/>
      </div>

      {/* ══ RIGHT — LOGIN FORM ══ */}
      <motion.div
        className="relative flex flex-col justify-center overflow-auto"
        style={{
          width:460, flexShrink:0,
          background:"linear-gradient(160deg,#0a1628 0%,#071020 55%,#050c18 100%)",
          padding:"48px 44px",
          borderLeft:"1px solid rgba(255,255,255,0.04)",
        }}
        initial={{ opacity:0, x:60 }}
        animate={{ opacity:1, x:0 }}
        transition={{ duration:0.8, ease:[0.22,1,0.36,1] }}>

        {/* Corner glow */}
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl pointer-events-none"
          style={{ background:"radial-gradient(circle,rgba(139,92,246,0.09),transparent 70%)", transform:"translate(30%,-30%)" }}/>

        {/* ── LOGO ── */}
        <motion.div className="mb-10"
          initial={{ opacity:0, y:-14 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}>
          <div className="flex items-center gap-3">
            <div className="flex items-end gap-[3px]" style={{ height:20 }}>
              {[0,1,2,3,4].map((i) => (
                <motion.div key={i} className="rounded-full"
                  style={{ width:4, background:"linear-gradient(to top,#06b6d4,#8b5cf6)" }}
                  animate={{ height:["35%","100%","35%"] }}
                  transition={{ duration:0.75+i*0.1, repeat:Infinity, ease:"easeInOut", delay:i*0.13 }}/>
              ))}
            </div>
            <span className="text-xl font-black text-white tracking-tight">PULSE</span>
          </div>
        </motion.div>

        {/* ── HEADING ── */}
        <motion.div className="mb-8"
          initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}>
          <h1 className="text-[36px] font-bold text-white leading-[1.14]">
            Welcome<br/>
            <span style={{ background:"linear-gradient(125deg,#06b6d4,#8b5cf6,#f43f5e)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              back.
            </span>
          </h1>
          <p className="text-white/35 text-sm mt-2 font-light">Sign in to continue listening</p>
        </motion.div>

        {/* ── FORM ── */}
        <motion.form onSubmit={submitHandler} className="flex flex-col gap-4"
          initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.4 }}>

          {/* Email */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5 transition-colors duration-200"
              style={{ color: focused==="email" ? "#06b6d4" : "rgba(255,255,255,0.4)" }}>
              Email address
            </label>
            <input type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocused("email")} onBlur={() => setFocused(null)}
              placeholder="name@domain.com" required autoComplete="email"
              className="w-full px-4 py-3.5 text-sm text-white placeholder-white/18 rounded-xl outline-none transition-all duration-200"
              style={inputStyle("email")}/>
          </div>

          {/* Password */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5 transition-colors duration-200"
              style={{ color: focused==="password" ? "#8b5cf6" : "rgba(255,255,255,0.4)" }}>
              Password
            </label>
            <div className="relative">
              <input type={showPass ? "text" : "password"} value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocused("password")} onBlur={() => setFocused(null)}
                placeholder="••••••••" required autoComplete="current-password"
                className="w-full px-4 py-3.5 pr-12 text-sm text-white placeholder-white/18 rounded-xl outline-none transition-all duration-200"
                style={inputStyle("password")}/>
              <button type="button" tabIndex={-1} onClick={() => setShowPass(!showPass)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors">
                {showPass ? <FaEyeSlash size={14}/> : <FaEye size={14}/>}
              </button>
            </div>
          </div>

          {/* Remember + Forgot */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer" onClick={() => setRemember(!remember)}>
              <div className="w-4 h-4 rounded flex items-center justify-center transition-all duration-200"
                style={{
                  border: remember ? "1.5px solid #06b6d4" : "1.5px solid rgba(255,255,255,0.2)",
                  background: remember ? "#06b6d4" : "transparent",
                  boxShadow: remember ? "0 0 12px rgba(6,182,212,0.4)" : "none",
                }}>
                <AnimatePresence>
                  {remember && (
                    <motion.svg initial={{ scale:0 }} animate={{ scale:1 }} exit={{ scale:0 }}
                      transition={{ type:"spring", stiffness:320 }}
                      width="10" height="10" viewBox="0 0 10 10">
                      <path d="M 1.5 5 L 4 7.5 L 8.5 2.5" stroke="white" strokeWidth="1.6"
                        fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </motion.svg>
                  )}
                </AnimatePresence>
              </div>
              <span className="text-white/35 text-xs">Remember me</span>
            </label>
            <button type="button" className="text-xs text-white/28 hover:text-cyan-400 transition-colors">
              Forgot password?
            </button>
          </div>

          {/* Sign In */}
          <motion.button type="submit" disabled={btnLoading}
            className="relative overflow-hidden py-3.5 rounded-xl font-semibold text-sm text-white mt-1 disabled:opacity-60"
            style={{ background:"linear-gradient(130deg,#06b6d4,#8b5cf6 55%,#f43f5e)", boxShadow:"0 8px 28px rgba(139,92,246,0.38)" }}
            whileHover={{ scale:1.022, boxShadow:"0 12px 38px rgba(139,92,246,0.55)" }}
            whileTap={{ scale:0.978 }}>
            <span className="relative z-10">{btnLoading ? "Signing in…" : "Sign In"}</span>
            {/* shimmer */}
            <motion.div className="absolute inset-0 pointer-events-none"
              style={{ background:"linear-gradient(105deg,transparent 35%,rgba(255,255,255,0.28) 50%,transparent 65%)" }}
              animate={{ x:["-120%","180%"] }}
              transition={{ duration:2.8, repeat:Infinity, ease:"easeInOut", repeatDelay:1 }}/>
          </motion.button>
        </motion.form>

        {/* Divider */}
        <motion.div className="flex items-center gap-4 my-6"
          initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.6 }}>
          <div className="flex-1 h-px" style={{ background:"rgba(255,255,255,0.06)" }}/>
          <span className="text-white/22 text-[11px] tracking-wider">or continue with</span>
          <div className="flex-1 h-px" style={{ background:"rgba(255,255,255,0.06)" }}/>
        </motion.div>

        {/* Social */}
        <motion.div className="grid grid-cols-2 gap-3"
          initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.68 }}>
          {[
            { icon:<FaGoogle size={13} className="text-rose-400"/>,   label:"Google"   },
            { icon:<FaFacebook size={14} className="text-blue-400"/>, label:"Facebook" },
          ].map(({ icon, label }) => (
            <motion.button key={label} type="button"
              className="flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-medium text-white/55 hover:text-white/90 transition-colors"
              style={{ background:"rgba(255,255,255,0.035)", border:"1.5px solid rgba(255,255,255,0.07)" }}
              whileHover={{ scale:1.022, background:"rgba(255,255,255,0.065)" }}
              whileTap={{ scale:0.978 }}>
              {icon}<span>{label}</span>
            </motion.button>
          ))}
        </motion.div>

        {/* Sign up */}
        <motion.p className="text-center text-[12px] text-white/28 mt-7"
          initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.76 }}>
          No account?{" "}
          <Link to="/register" className="font-semibold text-white/55 hover:text-cyan-400 transition-colors">
            Sign up free
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
};

export default Login;
