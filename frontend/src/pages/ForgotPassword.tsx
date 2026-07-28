import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { FiMail, FiArrowLeft, FiCheck } from "react-icons/fi";

const api = axios.create({ baseURL: import.meta.env.VITE_USER_SERVICE_URL ?? "http://localhost:5000", withCredentials: true });

export default function ForgotPassword() {
  const [email, setEmail]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Please enter your email address"); return; }
    setLoading(true);
    try {
      await api.post("/api/v1/user/forgot-password", { email: email.trim().toLowerCase() });
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.message || "Something went wrong, please try again.");
    } finally {
      setLoading(false);
    }
  }

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
        className="w-full max-w-md relative"
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
            {sent ? (
              <motion.div
                key="sent"
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
                <h2 className="text-white text-xl font-bold mb-2">Check your inbox</h2>
                <p className="text-white/50 text-sm leading-relaxed mb-6">
                  If <span className="text-cyan-400">{email}</span> is registered with PULSE, you'll receive a reset link shortly.
                </p>
                <p className="text-white/30 text-xs mb-6">Didn't get it? Check your spam folder.</p>
                <Link to="/login" className="text-cyan-400 hover:text-cyan-300 text-sm font-semibold transition-colors">
                  ← Back to login
                </Link>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="text-white text-2xl font-black mb-1">Forgot password?</h2>
                <p className="text-white/40 text-sm mb-7">Enter your email and we'll send you a reset link.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-2 block">Email</label>
                    <div className="relative">
                      <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        autoFocus
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-white text-sm outline-none transition-all"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1.5px solid rgba(255,255,255,0.08)",
                        }}
                        onFocus={(e) => (e.target.style.border = "1.5px solid rgba(6,182,212,0.6)")}
                        onBlur={(e) => (e.target.style.border = "1.5px solid rgba(255,255,255,0.08)")}
                      />
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
                    className="w-full py-3 rounded-xl text-sm font-bold text-black transition-all disabled:opacity-60"
                    style={{ background: "linear-gradient(90deg, #06b6d4, #8b5cf6)" }}
                  >
                    {loading ? "Sending…" : "Send Reset Link"}
                  </motion.button>
                </form>

                <p className="text-center text-white/30 text-sm mt-6">
                  <Link to="/login" className="text-white/50 hover:text-white transition-colors inline-flex items-center gap-1">
                    <FiArrowLeft className="text-xs" /> Back to login
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
