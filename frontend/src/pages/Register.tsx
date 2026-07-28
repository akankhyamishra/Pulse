import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUserData } from "../context/UserContext";
import { motion, AnimatePresence } from "framer-motion";
import { FaEye, FaEyeSlash } from "react-icons/fa";

// ─── Register doodle: vinyl + waveform + notes scene ─────────────────────────

const NOTES = [
  { id:1, g:"♫", x:55,  y:130, size:26, c:"rgba(255,255,255,0.72)", dur:4.0, delay:0    },
  { id:2, g:"♪", x:360, y:100, size:22, c:"#06b6d4",                dur:3.6, delay:0.9  },
  { id:3, g:"♬", x:388, y:310, size:18, c:"#f43f5e",                dur:4.4, delay:1.6  },
  { id:4, g:"♩", x:38,  y:320, size:20, c:"#a78bfa",                dur:5.0, delay:2.2  },
  { id:5, g:"♪", x:200, y:55,  size:15, c:"rgba(255,255,255,0.55)", dur:3.8, delay:1.2  },
];

function RegisterDoodle() {
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden select-none">

      {/* Ambient */}
      <motion.div className="absolute rounded-full blur-3xl pointer-events-none"
        style={{ width:380, height:380, top:"10%", right:"8%",
          background:"radial-gradient(circle,rgba(244,63,94,0.09),transparent 70%)" }}
        animate={{ scale:[1,1.2,1], opacity:[0.45,0.75,0.45] }}
        transition={{ duration:8, repeat:Infinity, ease:"easeInOut" }}/>
      <motion.div className="absolute rounded-full blur-3xl pointer-events-none"
        style={{ width:360, height:360, bottom:"5%", left:"6%",
          background:"radial-gradient(circle,rgba(139,92,246,0.1),transparent 70%)" }}
        animate={{ scale:[1,1.15,1], opacity:[0.4,0.7,0.4] }}
        transition={{ duration:10, repeat:Infinity, ease:"easeInOut", delay:2 }}/>

      <svg viewBox="0 0 440 560" className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid meet" style={{ opacity:0.9 }}>

        {/* Stars */}
        {[[32,48],[408,66],[55,188],[400,192],[120,510],[330,498],[222,36]].map(([x,y],i) => {
          const r = 4.5;
          return (
            <motion.g key={i}
              animate={{ opacity:[0.3,0.85,0.3] }}
              transition={{ duration:2.2+i*0.3, repeat:Infinity, ease:"easeInOut", delay:i*0.42 }}>
              <line x1={x-r} y1={y}   x2={x+r} y2={y}   stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
              <line x1={x}   y1={y-r} x2={x}   y2={y+r} stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
              <line x1={x-r*.7} y1={y-r*.7} x2={x+r*.7} y2={y+r*.7} stroke="white" strokeWidth="1" strokeLinecap="round"/>
              <line x1={x-r*.7} y1={y+r*.7} x2={x+r*.7} y2={y-r*.7} stroke="white" strokeWidth="1" strokeLinecap="round"/>
            </motion.g>
          );
        })}

        {/* Waveform — upper area */}
        <motion.polyline
          points="95,180 116,152 137,196 158,140 179,188 200,156 221,180 242,148 263,194 284,158 305,180 326,150 347,188"
          stroke="#06b6d4" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round"
          animate={{ opacity:[0.45,0.75,0.45] }}
          transition={{ duration:3.2, repeat:Infinity, ease:"easeInOut" }}/>

        {/* Music staff lines */}
        {[0,1,2,3,4].map((i) => (
          <line key={i} x1="50" y1={294+i*12} x2="390" y2={294+i*12}
            stroke="white" strokeWidth="1" opacity={0.12}/>
        ))}

        {/* Floating notes */}
        {NOTES.map((n) => (
          <motion.text key={n.id} x={n.x} y={n.y} fontSize={n.size}
            fill={n.c} fontFamily="serif" fontWeight="bold"
            animate={{
              y:       [n.y, n.y-45, n.y-90, n.y-130],
              opacity: [0, 0.88, 0.7, 0],
            }}
            transition={{ duration:n.dur, repeat:Infinity, ease:"easeOut", delay:n.delay, repeatDelay:0.9 }}/>
        ))}

        {/* Guitar body doodle — bottom left */}
        <g opacity="0.38">
          {/* Lower bout */}
          <ellipse cx="88" cy="455" rx="42" ry="36" stroke="white" strokeWidth="2.5" fill="none"/>
          {/* Upper bout */}
          <ellipse cx="88" cy="404" rx="30" ry="26" stroke="white" strokeWidth="2" fill="none"/>
          {/* Waist */}
          <line x1="58" y1="428" x2="58" y2="432" stroke="white" strokeWidth="2.5"/>
          <line x1="118" y1="428" x2="118" y2="432" stroke="white" strokeWidth="2.5"/>
          {/* Sound hole */}
          <circle cx="88" cy="440" r="12" stroke="white" strokeWidth="1.8" fill="none"/>
          {/* Neck */}
          <rect x="82" y="365" width="12" height="40" rx="3" stroke="white" strokeWidth="2" fill="none"/>
          {/* Strings: 3 visible across body */}
          <line x1="80" y1="380" x2="80" y2="490" stroke="white" strokeWidth="1" opacity="0.6"/>
          <line x1="88" y1="380" x2="88" y2="490" stroke="white" strokeWidth="1" opacity="0.6"/>
          <line x1="96" y1="380" x2="96" y2="490" stroke="white" strokeWidth="1" opacity="0.6"/>
        </g>

        {/* Speaker / circle speaker — bottom right */}
        <g opacity="0.42">
          <circle cx="348" cy="450" r="52" stroke="white" strokeWidth="2.5" fill="none"/>
          <circle cx="348" cy="450" r="38" stroke="white" strokeWidth="1.5" fill="none" opacity="0.6"/>
          <circle cx="348" cy="450" r="24" stroke="white" strokeWidth="1.5" fill="none" opacity="0.5"/>
          <circle cx="348" cy="450" r="10" stroke="#f43f5e" strokeWidth="2" fill="rgba(244,63,94,0.12)"/>
          {/* Speaker mount bolts */}
          {[0,90,180,270].map((angle,i) => {
            const rad = (angle*Math.PI)/180;
            const bx = 348 + 46*Math.cos(rad);
            const by = 450 + 46*Math.sin(rad);
            return <circle key={i} cx={bx} cy={by} r="3" stroke="white" strokeWidth="1.5" fill="none" opacity="0.5"/>;
          })}
        </g>

        {/* Sound rays from speaker */}
        {[0,1,2].map((i) => (
          <motion.circle key={i} cx="348" cy="450" r={60+i*22}
            stroke="white" strokeWidth="1.2" fill="none" opacity="0.08"
            animate={{ r:[60+i*22, 60+i*22+30], opacity:[0.12,0] }}
            transition={{ duration:2.2, repeat:Infinity, ease:"easeOut", delay:i*0.7 }}/>
        ))}

        {/* Dots */}
        {[[200,240],[100,264],[300,260],[200,490]].map(([x,y],i) => (
          <motion.circle key={i} cx={x} cy={y} r="2.2" fill="white"
            animate={{ opacity:[0.12,0.45,0.12] }}
            transition={{ duration:2.8+i*0.4, repeat:Infinity, ease:"easeInOut", delay:i*0.55 }}/>
        ))}
      </svg>

      <div className="absolute bottom-7 left-8 text-white/14 text-[10px] font-light tracking-[0.4em] uppercase pointer-events-none">
        PULSE
      </div>
      <div className="absolute top-0 right-0 bottom-0 w-px pointer-events-none"
        style={{ background:"linear-gradient(to bottom,transparent,rgba(255,255,255,0.05) 30%,rgba(255,255,255,0.05) 70%,transparent)" }}/>
    </div>
  );
}

// ─── Register ─────────────────────────────────────────────────────────────────

const Register = () => {
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showPass, setShowPass] = useState(false);
  const [focused, setFocused]   = useState<"name"|"email"|"password"|"confirm"|null>(null);
  const [clientErr, setClientErr] = useState("");

  const navigate = useNavigate();
  const { registerUser, btnLoading } = useUserData();

  const inputStyle = (field: typeof focused) => ({
    background: "rgba(255,255,255,0.04)",
    border: focused === field
      ? "1.5px solid rgba(6,182,212,0.62)"
      : "1.5px solid rgba(255,255,255,0.07)",
    boxShadow: focused === field
      ? "0 0 20px rgba(6,182,212,0.12)"
      : "none",
  });

  async function submitHandler(e: React.FormEvent) {
    e.preventDefault();
    setClientErr("");
    if (name.trim().length < 2) {
      setClientErr("Name must be at least 2 characters"); return;
    }
    if (password.length < 8) {
      setClientErr("Password must be at least 8 characters"); return;
    }
    if (password !== confirm) {
      setClientErr("Passwords do not match"); return;
    }
    registerUser(name, email, password, navigate);
  }

  return (
    <div className="fixed inset-0 flex overflow-hidden" style={{ background:"#030d18" }}>

      {/* ══ LEFT — DOODLE ══ */}
      <div className="relative flex-1 overflow-hidden"
        style={{ background:"linear-gradient(148deg,#03091a 0%,#040c20 55%,#020810 100%)" }}>
        <RegisterDoodle/>
      </div>

      {/* ══ RIGHT — FORM ══ */}
      <motion.div
        className="relative flex flex-col justify-center overflow-auto"
        style={{
          width:460, flexShrink:0,
          background:"linear-gradient(160deg,#0a1628 0%,#071020 55%,#050c18 100%)",
          padding:"44px 44px",
          borderLeft:"1px solid rgba(255,255,255,0.04)",
        }}
        initial={{ opacity:0, x:60 }}
        animate={{ opacity:1, x:0 }}
        transition={{ duration:0.8, ease:[0.22,1,0.36,1] }}>

        <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl pointer-events-none"
          style={{ background:"radial-gradient(circle,rgba(244,63,94,0.08),transparent 70%)", transform:"translate(30%,-30%)" }}/>

        {/* Logo */}
        <motion.div className="mb-8"
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

        {/* Heading */}
        <motion.div className="mb-7"
          initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}>
          <h1 className="text-[34px] font-bold text-white leading-[1.14]">
            Create your<br/>
            <span style={{ background:"linear-gradient(125deg,#06b6d4,#8b5cf6,#f43f5e)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              account.
            </span>
          </h1>
          <p className="text-white/35 text-sm mt-2 font-light">Free forever. No credit card needed.</p>
        </motion.div>

        {/* Form */}
        <motion.form onSubmit={submitHandler} className="flex flex-col gap-3.5"
          initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.4 }}>

          {/* Name */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5 transition-colors duration-200"
              style={{ color: focused==="name" ? "#06b6d4" : "rgba(255,255,255,0.4)" }}>
              Your name
            </label>
            <input type="text" value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setFocused("name")} onBlur={() => setFocused(null)}
              placeholder="Enter your name" required autoComplete="name"
              className="w-full px-4 py-3 text-sm text-white placeholder-white/18 rounded-xl outline-none transition-all duration-200"
              style={inputStyle("name")}/>
          </div>

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
              className="w-full px-4 py-3 text-sm text-white placeholder-white/18 rounded-xl outline-none transition-all duration-200"
              style={inputStyle("email")}/>
          </div>

          {/* Password */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5 transition-colors duration-200"
              style={{ color: focused==="password" ? "#06b6d4" : "rgba(255,255,255,0.4)" }}>
              Password <span className="text-white/28 normal-case font-normal tracking-normal">(min 8 chars)</span>
            </label>
            <div className="relative">
              <input type={showPass ? "text" : "password"} value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocused("password")} onBlur={() => setFocused(null)}
                placeholder="Create a strong password" required autoComplete="new-password"
                className="w-full px-4 py-3 pr-12 text-sm text-white placeholder-white/18 rounded-xl outline-none transition-all duration-200"
                style={inputStyle("password")}/>
              <button type="button" tabIndex={-1} onClick={() => setShowPass(!showPass)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors">
                {showPass ? <FaEyeSlash size={14}/> : <FaEye size={14}/>}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5 transition-colors duration-200"
              style={{ color: focused==="confirm" ? "#06b6d4" : "rgba(255,255,255,0.4)" }}>
              Confirm password
            </label>
            <input type={showPass ? "text" : "password"} value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onFocus={() => setFocused("confirm")} onBlur={() => setFocused(null)}
              placeholder="Repeat your password" required autoComplete="new-password"
              className="w-full px-4 py-3 text-sm text-white placeholder-white/18 rounded-xl outline-none transition-all duration-200"
              style={inputStyle("confirm")}/>
          </div>

          {/* Client-side error */}
          <AnimatePresence>
            {clientErr && (
              <motion.p
                initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                className="text-rose-400 text-xs font-medium">
                {clientErr}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Submit */}
          <motion.button type="submit" disabled={btnLoading}
            className="relative overflow-hidden py-3.5 rounded-xl font-semibold text-sm text-white mt-1 disabled:opacity-60"
            style={{ background:"linear-gradient(130deg,#06b6d4,#8b5cf6 55%,#f43f5e)", boxShadow:"0 8px 28px rgba(139,92,246,0.38)" }}
            whileHover={{ scale:1.022, boxShadow:"0 12px 38px rgba(139,92,246,0.55)" }}
            whileTap={{ scale:0.978 }}>
            <span className="relative z-10">{btnLoading ? "Creating account…" : "Create Account"}</span>
            <motion.div className="absolute inset-0 pointer-events-none"
              style={{ background:"linear-gradient(105deg,transparent 35%,rgba(255,255,255,0.28) 50%,transparent 65%)" }}
              animate={{ x:["-120%","180%"] }}
              transition={{ duration:2.8, repeat:Infinity, ease:"easeInOut", repeatDelay:1 }}/>
          </motion.button>
        </motion.form>

        {/* Login link */}
        <motion.p className="text-center text-[12px] text-white/28 mt-6"
          initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.7 }}>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-white/55 hover:text-cyan-400 transition-colors">
            Sign in
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
};

export default Register;
