import { AuthenticatedRequest } from "./middleware.js";
import { User, IPlaylistSong } from "./model.js";
import TryCatch from "./TryCatch.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { cacheGet, cacheSet, cacheDel } from "./redis.js";
import { publishEvent } from "./events.js";

function createMailTransport() {
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

async function sendResetEmail(to: string, name: string, resetUrl: string) {
  const transporter = createMailTransport();
  await transporter.sendMail({
    from: `"PULSE Music" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Reset your PULSE password",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#111;color:#fff;border-radius:12px;padding:32px">
        <h2 style="color:#06b6d4;margin-top:0">Reset your password</h2>
        <p>Hi ${name},</p>
        <p>Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
        <a href="${resetUrl}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#06b6d4;color:#000;font-weight:700;border-radius:8px;text-decoration:none">
          Reset Password
        </a>
        <p style="color:#666;font-size:13px">If you did not request this, you can safely ignore this email.</p>
        <hr style="border-color:#333;margin:24px 0"/>
        <p style="color:#444;font-size:12px">PULSE Music · This link expires in 1 hour</p>
      </div>
    `,
  });
}

// ─── Listening history ────────────────────────────────────────────────────────

export const logListen = TryCatch(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?._id;
  const { songId, songTitle, artistName, albumName, thumbnail, platform, listenedFor } =
    req.body as {
      songId: string; songTitle: string; artistName: string;
      albumName: string; thumbnail: string; platform: string; listenedFor: number;
    };

  const user = await User.findById(userId);
  if (!user) { res.status(404).json({ message: "User not found" }); return; }

  // Keep history capped at 200 entries (drop oldest)
  if (user.listeningHistory.length >= 200) {
    user.listeningHistory.splice(0, user.listeningHistory.length - 199);
  }

  user.listeningHistory.push({
    songId, songTitle, artistName, albumName, thumbnail,
    playedAt: new Date(),
    platform: platform || "web",
    listenedFor: listenedFor || 0,
  });

  await user.save();
  res.json({ message: "Listen logged" });
});

export const getListenHistory = TryCatch(async (req: AuthenticatedRequest, res) => {
  const user = await User.findById(req.user?._id).select("listeningHistory");
  if (!user) { res.status(404).json({ message: "User not found" }); return; }
  // Return newest first
  res.json([...user.listeningHistory].reverse());
});

export const getListenStats = TryCatch(async (req: AuthenticatedRequest, res) => {
  const user = await User.findById(req.user?._id).select("listeningHistory");
  if (!user) { res.status(404).json({ message: "User not found" }); return; }

  const history = user.listeningHistory;
  const totalTime = history.reduce((sum, e) => sum + (e.listenedFor || 0), 0);

  // Most played artists
  const artistCount: Record<string, number> = {};
  history.forEach((e) => {
    if (e.artistName) artistCount[e.artistName] = (artistCount[e.artistName] || 0) + 1;
  });
  const topArtists = Object.entries(artistCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Hour distribution (when do they listen?)
  const hourDist: number[] = Array(24).fill(0);
  history.forEach((e) => {
    if (e.playedAt) hourDist[new Date(e.playedAt).getHours()]++;
  });

  res.json({ totalSongsPlayed: history.length, totalListenTime: totalTime, topArtists, hourDist });
});

// ─── Saved albums ─────────────────────────────────────────────────────────────

export const toggleSaveAlbum = TryCatch(async (req: AuthenticatedRequest, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) { res.status(404).json({ message: "User not found" }); return; }

  const { albumId, albumTitle, artistName, thumbnail } = req.body as {
    albumId: string; albumTitle: string; artistName: string; thumbnail: string;
  };

  const idx = user.savedAlbums.findIndex((a) => a.albumId === albumId);
  if (idx > -1) {
    user.savedAlbums.splice(idx, 1);
    await user.save();
    res.json({ message: "Album removed from library", saved: false });
  } else {
    user.savedAlbums.push({ albumId, albumTitle, artistName, thumbnail, savedAt: new Date() });
    await user.save();
    res.json({ message: "Album saved to library", saved: true });
  }
});

export const getSavedAlbums = TryCatch(async (req: AuthenticatedRequest, res) => {
  const user = await User.findById(req.user?._id).select("savedAlbums");
  if (!user) { res.status(404).json({ message: "User not found" }); return; }
  res.json([...user.savedAlbums].reverse());
});

// ─── Custom playlists ─────────────────────────────────────────────────────────

const PLAYLIST_CACHE_KEY = (uid: string) => `user:playlists:${uid}`;

export const getMyPlaylists = TryCatch(async (req: AuthenticatedRequest, res) => {
  const uid = req.user?._id?.toString()!;
  const cached = await cacheGet(PLAYLIST_CACHE_KEY(uid));
  if (cached) { res.json(JSON.parse(cached)); return; }

  const user = await User.findById(uid).select("customPlaylists");
  if (!user) { res.status(404).json({ message: "User not found" }); return; }

  const result = [...user.customPlaylists].reverse();
  await cacheSet(PLAYLIST_CACHE_KEY(uid), JSON.stringify(result), 300);
  res.json(result);
});

export const createPlaylist = TryCatch(async (req: AuthenticatedRequest, res) => {
  const uid = req.user?._id?.toString()!;
  const { name } = req.body as { name: string };
  if (!name?.trim()) { res.status(400).json({ message: "Playlist name required" }); return; }

  const user = await User.findById(uid);
  if (!user) { res.status(404).json({ message: "User not found" }); return; }

  user.customPlaylists.push({ name: name.trim(), songs: [], createdAt: new Date() } as any);
  await user.save();
  await cacheDel(PLAYLIST_CACHE_KEY(uid));

  const created = user.customPlaylists[user.customPlaylists.length - 1];
  await publishEvent("user.playlist.created", { userId: uid, playlistId: created._id, name });
  res.status(201).json(created);
});

export const deletePlaylist = TryCatch(async (req: AuthenticatedRequest, res) => {
  const uid = req.user?._id?.toString()!;
  const { id } = req.params;

  const user = await User.findById(uid);
  if (!user) { res.status(404).json({ message: "User not found" }); return; }

  const idx = user.customPlaylists.findIndex((p) => p._id.toString() === id);
  if (idx === -1) { res.status(404).json({ message: "Playlist not found" }); return; }

  user.customPlaylists.splice(idx, 1);
  await user.save();
  await cacheDel(PLAYLIST_CACHE_KEY(uid));
  await publishEvent("user.playlist.deleted", { userId: uid, playlistId: id });
  res.json({ message: "Playlist deleted" });
});

export const renamePlaylist = TryCatch(async (req: AuthenticatedRequest, res) => {
  const uid = req.user?._id?.toString()!;
  const { id } = req.params;
  const { name } = req.body as { name: string };

  const user = await User.findById(uid);
  if (!user) { res.status(404).json({ message: "User not found" }); return; }

  const pl = user.customPlaylists.find((p) => p._id.toString() === id);
  if (!pl) { res.status(404).json({ message: "Playlist not found" }); return; }

  pl.name = name.trim();
  await user.save();
  await cacheDel(PLAYLIST_CACHE_KEY(uid));
  res.json(pl);
});

export const addSongToPlaylist = TryCatch(async (req: AuthenticatedRequest, res) => {
  const uid = req.user?._id?.toString()!;
  const { id } = req.params;
  const song = req.body as IPlaylistSong;

  const user = await User.findById(uid);
  if (!user) { res.status(404).json({ message: "User not found" }); return; }

  const pl = user.customPlaylists.find((p) => p._id.toString() === id);
  if (!pl) { res.status(404).json({ message: "Playlist not found" }); return; }

  // Avoid duplicates
  if (pl.songs.some((s) => s.id === song.id)) {
    res.json({ message: "Song already in playlist" }); return;
  }
  pl.songs.push(song);
  await user.save();
  await cacheDel(PLAYLIST_CACHE_KEY(uid));
  res.json({ message: "Song added", playlist: pl });
});

export const removeSongFromPlaylist = TryCatch(async (req: AuthenticatedRequest, res) => {
  const uid = req.user?._id?.toString()!;
  const { id, songId } = req.params;

  const user = await User.findById(uid);
  if (!user) { res.status(404).json({ message: "User not found" }); return; }

  const pl = user.customPlaylists.find((p) => p._id.toString() === id);
  if (!pl) { res.status(404).json({ message: "Playlist not found" }); return; }

  pl.songs = pl.songs.filter((s) => s.id !== songId);
  await user.save();
  await cacheDel(PLAYLIST_CACHE_KEY(uid));
  res.json({ message: "Song removed", playlist: pl });
});

// ─── Shared helpers ───────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
  path:     "/",
};

function issueToken(userId: unknown): string {
  return jwt.sign({ _id: userId }, process.env.JWT_SEC as string, { expiresIn: "7d" });
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const registerUser = TryCatch(async (req, res) => {
  const { name, email, password } = req.body as {
    name: string; email: string; password: string;
  };

  // Input validation
  if (!name || name.trim().length < 2) {
    res.status(400).json({ message: "Name must be at least 2 characters" });
    return;
  }
  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ message: "Invalid email address" });
    return;
  }
  if (!password || password.length < 8) {
    res.status(400).json({ message: "Password must be at least 8 characters" });
    return;
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(409).json({ message: "An account with this email already exists" });
    return;
  }

  const hashPassword = await bcrypt.hash(password, 12);
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase(),
    password: hashPassword,
  });

  const token = issueToken(user._id);
  res.cookie("pulse_token", token, COOKIE_OPTS);

  // Never send password hash to client
  const { password: _pw, ...safeUser } = user.toObject();
  res.status(201).json({ message: "Account created successfully", user: safeUser });
});

export const loginUser = TryCatch(async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };

  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ message: "Invalid email address" });
    return;
  }
  if (!password) {
    res.status(400).json({ message: "Password is required" });
    return;
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  // Generic message prevents email enumeration
  if (!user) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }

  const token = issueToken(user._id);
  res.cookie("pulse_token", token, COOKIE_OPTS);

  const { password: _pw, ...safeUser } = user.toObject();
  res.status(200).json({ message: "Welcome back!", user: safeUser });
});

export const logoutUser = TryCatch(async (_req, res) => {
  res.clearCookie("pulse_token", { path: "/" });
  res.json({ message: "Logged out successfully" });
});

export const myProfile = TryCatch(async (req: AuthenticatedRequest, res) => {
  res.json(req.user);
});

export const forgotPassword = TryCatch(async (req, res) => {
  const { email } = req.body as { email: string };
  if (!email || !EMAIL_RE.test(email)) {
    res.status(400).json({ message: "Valid email is required" });
    return;
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  // Always return the same message to prevent email enumeration
  const genericMsg = "If that email is registered, a reset link has been sent.";

  if (!user) {
    res.json({ message: genericMsg });
    return;
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

  user.resetToken = hashedToken;
  user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save();

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${rawToken}`;
  await sendResetEmail(user.email, user.name, resetUrl);

  res.json({ message: genericMsg });
});

export const resetPassword = TryCatch(async (req, res) => {
  const { token } = req.params as { token: string };
  const { password } = req.body as { password: string };

  if (!password || password.length < 8) {
    res.status(400).json({ message: "Password must be at least 8 characters" });
    return;
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetToken: hashedToken,
    resetTokenExpiry: { $gt: new Date() },
  }).select("+resetToken +resetTokenExpiry");

  if (!user) {
    res.status(400).json({ message: "Reset link is invalid or has expired" });
    return;
  }

  user.password = await bcrypt.hash(password, 12);
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  await user.save();

  res.clearCookie("pulse_token", { path: "/" });
  res.json({ message: "Password reset successfully. Please log in with your new password." });
});

export const toggleFollowArtist = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const userId = req.user?._id;
    const { name } = req.body as { name: string };

    if (!name) {
      res.status(400).json({ message: "Artist name required" });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (!user.followedArtists) user.followedArtists = [];

    const idx = user.followedArtists.indexOf(name);
    if (idx > -1) {
      user.followedArtists.splice(idx, 1);
      await user.save();
      res.json({ message: "Unfollowed artist" });
    } else {
      user.followedArtists.push(name);
      await user.save();
      res.json({ message: "Now following " + name });
    }
  }
);

export const addToPlaylist = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const userId = req.user?._id;

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({
        message: "NO user with this id",
      });
      return;
    }

    if (user?.playlist.includes(req.params.id)) {
      const index = user.playlist.indexOf(req.params.id);

      user.playlist.splice(index, 1);

      await user.save();

      res.json({
        message: " Removed from playlist",
      });
      return;
    }

    user.playlist.push(req.params.id);

    await user.save();

    res.json({
      message: "Added to PlayList",
    });
  }
);

// ─── Mood Rooms ───────────────────────────────────────────────────────────────

const VALID_ROOMS = ["coding", "gym", "roadtrip", "heartbreak", "late_night", "chill", "party", "focus"];

export const joinRoom = TryCatch(async (req: AuthenticatedRequest, res) => {
  const { room } = req.body as { room: string };
  if (!VALID_ROOMS.includes(room)) {
    res.status(400).json({ message: "Invalid room" }); return;
  }
  await User.findByIdAndUpdate(req.user?._id, { currentRoom: room, roomJoinedAt: new Date() });
  res.json({ message: `Joined ${room} room`, currentRoom: room });
});

export const leaveRoom = TryCatch(async (req: AuthenticatedRequest, res) => {
  await User.findByIdAndUpdate(req.user?._id, { $unset: { currentRoom: 1, roomJoinedAt: 1 } });
  res.json({ message: "Left room", currentRoom: null });
});

export const getRoomStats = TryCatch(async (_req, res) => {
  const stats: Record<string, number> = {};
  await Promise.all(
    VALID_ROOMS.map(async (room) => {
      stats[room] = await User.countDocuments({ currentRoom: room });
    })
  );
  res.json(stats);
});

// ─── Weather ──────────────────────────────────────────────────────────────────

export const saveWeather = TryCatch(async (req: AuthenticatedRequest, res) => {
  const { city, country, condition, description, temp, icon, weatherCode } = req.body as {
    city: string; country: string; condition: string;
    description: string; temp: number; icon: string; weatherCode: number;
  };
  await User.findByIdAndUpdate(req.user?._id, {
    lastWeather: { city, country, condition, description, temp, icon, weatherCode, fetchedAt: new Date() },
  });
  res.json({ message: "Weather saved" });
});

// ─── Screenshot search history ────────────────────────────────────────────────

export const saveScreenshotSearch = TryCatch(async (req: AuthenticatedRequest, res) => {
  const { imageUrl, songTitle, artist, confidence, sourceType, tracksFound } = req.body as {
    imageUrl: string; songTitle: string; artist: string;
    confidence: string; sourceType: string; tracksFound: number;
  };

  const entry = { imageUrl, songTitle, artist, confidence, sourceType, tracksFound, searchedAt: new Date() };

  await User.findByIdAndUpdate(req.user?._id, {
    $push: {
      screenshotSearches: {
        $each: [entry],
        $position: 0,  // newest first
        $slice: 20,    // keep only last 20
      },
    },
  });

  res.json({ message: "Screenshot search saved", entry });
});

export const getScreenshotSearches = TryCatch(async (req: AuthenticatedRequest, res) => {
  const user = await User.findById(req.user?._id).select("screenshotSearches");
  if (!user) { res.status(404).json({ message: "User not found" }); return; }
  res.json(user.screenshotSearches ?? []);
});
