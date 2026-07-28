import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { FiLock, FiEye, FiEyeOff, FiCheck } from "react-icons/fi";

const api = axios.create({ baseURL: import.meta.env.VITE_USER_SERVICE_URL ?? "http://localhost:5000", withCredentials: true });

export default function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const navigate  = useNavigate();

  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [showPw, setShowPw]         = useState(false);
  const [loading, setLoading]       = useState(false);
  const [done, setDone]             = useState(false);
  const [error, setError]           = useState("");

  function validate() {
    if (password.length < 8)    return "Password must be at least 8 characters";
    if (password !== confirm)   return "Passwords do not match";
    return "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    setLoading(true);
    try {
      await api.post(`/api/v1/user/reset-password/${token}`, { password });
      setDone(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Reset link is invalid or has expired.");
    } finally {
      setLoading(false);
    }
  }

  const strength = password.length === 0 ? 0
    : password.length < 8 ? 1
    : password.length < 12 ? 2
    : /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password) ? 4
    : 3;

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"];
  const strengthColor = ["", "#ef4444", "#f59e0b", "#10b981", "#06b6d4"];

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #0a0a0f 100%)" }}>
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full opacity-10 blur-3xl" style={{ background: "radial-gradient(circle, #06b6d4, transparent)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-10 blur-3xl" style={{ background: "radial-gradient(circle, #8b5cf6, transparent)" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div
          className="rounded-2xl p-8"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(24px)" }}
        >
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="flex items-end gap-[3px] h-5">
              {[3, 5, 4, 6, 4].map((h, i) => (
                <motion.div
                  key={i}
                  className="w-[3px] rounded-full"
                  style={{ height: `${h * 3}px`, background: i === 2 ? "#06b6d4" : "#8b5cf6", opacity: 0.8 }}
                  animate={{ scaleY: [1, 1.4, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1, ease: "easeInOut" }}
                />
              ))}
            </div>
            <span className="text-white font-black text-xl tracking-tight">PULSE</span>
          </div>

          <AnimatePresence mode="wait">
            {done ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4"
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ background: "rgba(6,182,212,0.15)", border: "1px solid rgba(6,182,212,0.3)" }}
                >
                  <FiCheck className="text-cyan-400 text-2xl" />
                </div>
                <h2 className="text-white text-xl font-bold mb-2">Password reset!</h2>
                <p className="text-white/40 text-sm">Redirecting you to login…</p>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="text-white text-2xl font-black mb-1">Set new password</h2>
                <p className="text-white/40 text-sm mb-7">Choose a strong password for your account.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* New password */}
                  <div>
                    <label className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-2 block">New Password</label>
                    <div className="relative">
                      <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm" />
                      <input
                        type={showPw ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="w-full pl-10 pr-10 py-3 rounded-xl text-white text-sm outline-none transition-all"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.08)" }}
                        onFocus={(e) => (e.target.style.border = "1.5px solid rgba(139,92,246,0.6)")}
                        onBlur={(e) => (e.target.style.border = "1.5px solid rgba(255,255,255,0.08)")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(!showPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                      >
                        {showPw ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>

                    {/* Strength bar */}
                    {password.length > 0 && (
                      <div className="mt-2">
                        <div className="flex gap-1 mb-1">
                          {[1, 2, 3, 4].map((level) => (
                            <div
                              key={level}
                              className="flex-1 h-1 rounded-full transition-all duration-300"
                              style={{ background: strength >= level ? strengthColor[strength] : "rgba(255,255,255,0.1)" }}
                            />
                          ))}
                        </div>
                        <p className="text-xs" style={{ color: strengthColor[strength] }}>{strengthLabel[strength]}</p>
                      </div>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div>
                    <label className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-2 block">Confirm Password</label>
                    <div className="relative">
                      <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm" />
                      <input
                        type={showPw ? "text" : "password"}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder="Repeat your password"
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-white text-sm outline-none transition-all"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: confirm && confirm !== password
                            ? "1.5px solid rgba(239,68,68,0.6)"
                            : confirm && confirm === password
                            ? "1.5px solid rgba(16,185,129,0.6)"
                            : "1.5px solid rgba(255,255,255,0.08)",
                        }}
                      />
                      {confirm && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm">
                          {confirm === password
                            ? <FiCheck className="text-emerald-400" />
                            : <span className="text-red-400">✕</span>}
                        </span>
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-red-400 text-xs py-2 px-3 rounded-lg"
                        style={{ background: "rgba(239,68,68,0.1)" }}
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileTap={{ scale: 0.97 }}
                    className="w-full py-3 rounded-xl text-sm font-bold text-black transition-all disabled:opacity-60 mt-2"
                    style={{ background: "linear-gradient(90deg, #06b6d4, #8b5cf6)" }}
                  >
                    {loading ? "Resetting…" : "Reset Password"}
                  </motion.button>
                </form>

                <p className="text-center text-white/30 text-sm mt-6">
                  <Link to="/login" className="text-white/50 hover:text-white transition-colors">
                    Back to login
                  </Link>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
