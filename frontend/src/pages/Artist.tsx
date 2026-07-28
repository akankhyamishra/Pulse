import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { Song, useSongData } from "../context/SongContext";
import { useUserData } from "../context/UserContext";
import {
  FaPlay, FaPause, FaHeart, FaRegHeart, FaInstagram, FaCheckCircle,
} from "react-icons/fa";
import { MdShuffle } from "react-icons/md";
import axios from "axios";

interface ItunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  artworkUrl100: string;
  previewUrl: string;
}

const Artist = () => {
  const { name: encodedName } = useParams<{ name: string }>();
  const artistName = decodeURIComponent(encodedName || "");
  const navigate = useNavigate();

  const [tracks, setTracks] = useState<ItunesTrack[]>([]);
  const [artistArt, setArtistArt] = useState("");
  const [pageLoading, setPageLoading] = useState(true);

  const { setSelectedSong, setIsPlaying, addExternalSong, isPlaying, selectedSong } = useSongData();
  const { user, followArtist, addToPlaylist, isAuth } = useUserData();

  const isFollowing = user?.followedArtists?.includes(artistName) ?? false;

  useEffect(() => {
    if (!artistName) return;
    setPageLoading(true);
    setTracks([]);
    setArtistArt("");
    axios
      .get("https://itunes.apple.com/search", {
        params: { term: artistName, entity: "musicTrack", limit: 50, media: "music", attribute: "artistTerm" },
      })
      .then(({ data }) => {
        const all: ItunesTrack[] = (data.results as ItunesTrack[]).filter((t) => t.previewUrl);
        // Prefer exact artist matches, fall back to all results
        const exact = all.filter((t) => t.artistName.toLowerCase() === artistName.toLowerCase());
        const final = exact.length > 0 ? exact : all;
        setTracks(final);
        if (final.length > 0)
          setArtistArt(final[0].artworkUrl100.replace("100x100bb", "600x600bb"));
      })
      .catch(console.error)
      .finally(() => setPageLoading(false));
  }, [artistName]);

  function playTrack(track: ItunesTrack) {
    const song: Song = {
      id: `itunes_${track.trackId}`,
      title: track.trackName,
      description: track.artistName,
      thumbnail: track.artworkUrl100.replace("100x100bb", "300x300bb"),
      audio: track.previewUrl,
      album: track.collectionName,
    };
    addExternalSong(song);
    setSelectedSong(song.id);
    setIsPlaying(true);
  }

  const instagramUrl = `https://www.google.com/search?q=${encodeURIComponent(artistName + " instagram official")}`;

  return (
    <Layout>
      {pageLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
        </div>
      ) : (
        <>
          {/* ── FULL-WIDTH HERO ── */}
          <div
            className="relative -mx-6 -mt-2 mb-0 overflow-hidden"
            style={{ height: 500 }}
          >
            {/* Background image */}
            {artistArt && (
              <img
                src={artistArt}
                alt=""
                className="absolute inset-0 w-full h-full object-cover animate-hero-reveal"
                style={{ filter: "brightness(0.55) saturate(1.4)" }}
              />
            )}

            {/* Side vignette */}
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(to right, rgba(0,0,0,0.55) 0%, transparent 55%)" }}
            />
            {/* Bottom gradient — blends into page bg */}
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(13,13,13,0) 35%, rgba(13,13,13,1) 100%)" }}
            />

            {/* Hero content */}
            <div className="absolute bottom-0 left-0 right-0 px-8 pb-8 flex flex-col gap-3">
              {/* Verified badge */}
              <div className="flex items-center gap-2 animate-fade-in delay-200">
                <FaCheckCircle className="text-blue-400 w-4 h-4" />
                <span className="text-white text-xs font-bold uppercase tracking-widest">
                  Verified Artist
                </span>
              </div>

              {/* Name */}
              <h1
                className="text-6xl md:text-8xl font-black text-white leading-none animate-slide-up-fade delay-300"
                style={{ textShadow: "0 4px 32px rgba(0,0,0,0.6)" }}
              >
                {artistName}
              </h1>

              {/* Meta */}
              <p className="text-white/50 text-sm animate-slide-up-fade delay-400">
                {tracks.length} songs · 30-second previews via iTunes
              </p>
            </div>
          </div>

          {/* ── CONTROLS BAR ── */}
          <div
            className="flex items-center gap-4 px-6 py-5 animate-fade-in-up delay-500"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            {/* Play */}
            <button
              onClick={() => tracks.length > 0 && playTrack(tracks[0])}
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 active:scale-95"
              style={{ background: "#06b6d4", boxShadow: "0 8px 28px rgba(6,182,212,0.45)" }}
            >
              <FaPlay className="text-black text-xl ml-1" />
            </button>

            {/* Shuffle */}
            <button
              onClick={() => {
                if (tracks.length === 0) return;
                const rand = tracks[Math.floor(Math.random() * tracks.length)];
                playTrack(rand);
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-all hover:scale-110 active:scale-95"
              style={{ border: "1px solid rgba(255,255,255,0.15)" }}
              title="Shuffle"
            >
              <MdShuffle className="w-5 h-5" />
            </button>

            {/* Follow */}
            {isAuth && (
              <button
                onClick={() => followArtist(artistName)}
                className={`px-6 py-2 text-sm font-bold rounded-full border transition-all hover:scale-105 active:scale-95 ${
                  isFollowing
                    ? "bg-green-500 text-black border-green-500 shadow-lg"
                    : "text-white border-white/30 hover:border-white"
                }`}
                style={isFollowing ? { boxShadow: "0 4px 16px rgba(6,182,212,0.35)" } : {}}
              >
                {isFollowing ? "Following ✓" : "Follow"}
              </button>
            )}

            {/* Instagram */}
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-full text-white/60 hover:text-white transition-all hover:scale-105 text-sm font-medium"
              style={{ border: "1px solid rgba(255,255,255,0.15)" }}
              title="Find on Instagram"
            >
              <FaInstagram className="w-4 h-4" />
              <span className="hidden sm:inline">Instagram</span>
            </a>
          </div>

          {/* ── SONG LIST ── */}
          {tracks.length > 0 ? (
            <div className="px-0 mt-4">
              {/* Table header */}
              <div className="grid grid-cols-[2rem_1fr_1fr_5rem] gap-4 px-4 py-2 mb-1 border-b border-white/8">
                <span className="text-white/30 text-xs uppercase tracking-wider text-center">#</span>
                <span className="text-white/30 text-xs uppercase tracking-wider">Title</span>
                <span className="text-white/30 text-xs uppercase tracking-wider hidden sm:block">Album</span>
                <span className="text-white/30 text-xs uppercase tracking-wider text-right">Actions</span>
              </div>

              {tracks.map((track, i) => {
                const songId = `itunes_${track.trackId}`;
                const isActive = selectedSong === songId;
                const isLiked = user?.playlist?.includes(songId) ?? false;

                return (
                  <div
                    key={track.trackId}
                    className="grid grid-cols-[2rem_1fr_1fr_5rem] gap-4 px-4 py-3 rounded-lg group cursor-pointer transition-all duration-150 song-row animate-fade-in-up"
                    style={{
                      background: isActive ? "rgba(255,255,255,0.1)" : undefined,
                      animationDelay: `${Math.min(i * 35, 600)}ms`,
                    }}
                    onClick={() => playTrack(track)}
                  >
                    {/* Index / eq */}
                    <div className="flex items-center justify-center">
                      {isActive && isPlaying ? (
                        <div className="flex items-end gap-[2px] h-4">
                          <div className="eq-bar" /><div className="eq-bar" /><div className="eq-bar" />
                        </div>
                      ) : (
                        <>
                          <span className={`text-sm group-hover:hidden ${isActive ? "text-green-500" : "text-white/40"}`}>
                            {i + 1}
                          </span>
                          <FaPlay className="text-white text-xs hidden group-hover:block" />
                        </>
                      )}
                    </div>

                    {/* Title + art */}
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={track.artworkUrl100.replace("100x100bb", "60x60bb")}
                        alt={track.trackName}
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0 shadow-md"
                      />
                      <span className={`text-sm font-medium truncate ${isActive ? "text-green-400" : "text-white"}`}>
                        {track.trackName}
                      </span>
                    </div>

                    {/* Album */}
                    <div className="hidden sm:flex items-center">
                      <p className="text-white/35 text-sm truncate hover:text-white/60 transition-colors">
                        {track.collectionName}
                      </p>
                    </div>

                    {/* Actions */}
                    <div
                      className="flex items-center gap-3 justify-end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isAuth && (
                        <button
                          className={`transition-all duration-200 hover:scale-110 ${isLiked ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                          onClick={() => addToPlaylist(songId)}
                          title={isLiked ? "Unlike" : "Like"}
                        >
                          {isLiked
                            ? <FaHeart className="w-3.5 h-3.5 text-green-400" />
                            : <FaRegHeart className="w-3.5 h-3.5 text-white/50 hover:text-white" />}
                        </button>
                      )}
                      <button
                        className="text-white/30 hover:text-green-400 transition-colors opacity-0 group-hover:opacity-100"
                        onClick={() => playTrack(track)}
                      >
                        {isActive && isPlaying
                          ? <FaPause className="w-3.5 h-3.5" />
                          : <FaPlay className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 mt-4">
              <p className="text-white/40 text-sm">No preview tracks found for {artistName}</p>
              <button onClick={() => navigate(-1)} className="mt-4 text-green-400 text-sm hover:underline">
                Go back
              </button>
            </div>
          )}
        </>
      )}
    </Layout>
  );
};

export default Artist;
