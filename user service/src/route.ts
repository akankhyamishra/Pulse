import express from "express";
import jwt from "jsonwebtoken";
import {
  addToPlaylist,
  loginUser,
  logoutUser,
  myProfile,
  registerUser,
  toggleFollowArtist,
  logListen,
  getListenHistory,
  getListenStats,
  toggleSaveAlbum,
  getSavedAlbums,
  getMyPlaylists,
  createPlaylist,
  deletePlaylist,
  renamePlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
  joinRoom,
  leaveRoom,
  getRoomStats,
  saveWeather,
  saveScreenshotSearch,
  getScreenshotSearches,
  forgotPassword,
  resetPassword,
} from "./controller.js";
import { isAuth } from "./middleware.js";
import passport from "./oauth.js";

const router = express.Router();

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

const CLIENT = process.env.CLIENT_URL || "http://localhost:5173";

// ── Auth ──────────────────────────────────────────────────────────────────────
router.post("/user/register",                registerUser);
router.post("/user/login",                   loginUser);
router.post("/user/logout",                  logoutUser);
router.get("/user/me",                       isAuth, myProfile);
router.post("/user/forgot-password",         forgotPassword);
router.post("/user/reset-password/:token",   resetPassword);

// ── Google OAuth ──────────────────────────────────────────────────────────────
router.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);
router.get("/auth/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: `${CLIENT}/login?error=google` }),
  (req, res) => {
    const user = req.user as any;
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SEC as string, { expiresIn: "7d" });
    res.cookie("pulse_token", token, COOKIE_OPTS);
    res.redirect(CLIENT);
  }
);

// ── Facebook OAuth ────────────────────────────────────────────────────────────
router.get("/auth/facebook",
  passport.authenticate("facebook", { scope: ["email"], session: false })
);
router.get("/auth/facebook/callback",
  passport.authenticate("facebook", { session: false, failureRedirect: `${CLIENT}/login?error=facebook` }),
  (req, res) => {
    const user = req.user as any;
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SEC as string, { expiresIn: "7d" });
    res.cookie("pulse_token", token, COOKIE_OPTS);
    res.redirect(CLIENT);
  }
);

// Liked songs (playlist field on user)
router.post("/song/:id", isAuth, addToPlaylist);

// Artists
router.post("/artist/follow", isAuth, toggleFollowArtist);

// Listening history
router.post("/listen", isAuth, logListen);
router.get("/listen/history", isAuth, getListenHistory);
router.get("/listen/stats", isAuth, getListenStats);

// Saved albums
router.post("/album/save", isAuth, toggleSaveAlbum);
router.get("/album/saved", isAuth, getSavedAlbums);

// Custom playlists
router.get("/playlists", isAuth, getMyPlaylists);
router.post("/playlists", isAuth, createPlaylist);
router.delete("/playlists/:id", isAuth, deletePlaylist);
router.put("/playlists/:id/rename", isAuth, renamePlaylist);
router.post("/playlists/:id/songs", isAuth, addSongToPlaylist);
router.delete("/playlists/:id/songs/:songId", isAuth, removeSongFromPlaylist);

// Mood Rooms
router.post("/room/join", isAuth, joinRoom);
router.post("/room/leave", isAuth, leaveRoom);
router.get("/rooms/stats", getRoomStats);

// Weather
router.post("/weather/save", isAuth, saveWeather);

// Screenshot search history
router.post("/screenshot-searches", isAuth, saveScreenshotSearch);
router.get("/screenshot-searches", isAuth, getScreenshotSearches);

export default router;
