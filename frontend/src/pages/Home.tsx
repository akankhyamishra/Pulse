import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AlbumCard from "../components/AlbumCard";
import Layout from "../components/Layout";
import Loading from "../components/Loading";
import SongCard from "../components/SongCard";
import { useSongData } from "../context/SongContext";
import { useUserData } from "../context/UserContext";
import { FaPlay, FaSync, FaVolumeUp, FaVolumeMute, FaChartLine, FaFire } from "react-icons/fa";

const AI_SERVICE = import.meta.env.VITE_AI_SERVICE_URL ?? "http://localhost:8001";

const WMO_EMOJI: Record<number, string> = {
  0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️",
  45: "🌫️", 48: "🌫️",
  51: "🌦️", 53: "🌧️", 55: "🌧️",
  61: "🌧️", 63: "🌧️", 65: "⛈️",
  71: "❄️", 73: "❄️", 75: "🌨️", 77: "🌨️",
  80: "🌦️", 81: "⛈️", 82: "⛈️",
  85: "🌨️", 86: "🌨️",
  95: "⛈️", 96: "🌩️", 99: "🌩️",
};

const WMO_LABEL: Record<number, string> = {
  0: "Clear Sky", 1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast",
  45: "Foggy", 48: "Foggy",
  51: "Light Drizzle", 53: "Drizzle", 55: "Heavy Drizzle",
  61: "Light Rain", 63: "Moderate Rain", 65: "Heavy Rain",
  71: "Light Snow", 73: "Snow", 75: "Heavy Snow", 77: "Snow Grains",
  80: "Rain Showers", 81: "Heavy Showers", 82: "Violent Showers",
  85: "Snow Showers", 86: "Heavy Snow Showers",
  95: "Thunderstorm", 96: "Thunderstorm + Hail", 99: "Thunderstorm + Hail",
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

interface WeatherInfo {
  city: string; country: string; condition: string;
  temp: number; icon: string; weatherCode: number;
}

interface WeatherTrack {
  id: string; title: string; artist: string;
  album: string; thumbnail: string; previewUrl: string;
}

interface WeatherMusic {
  condition: string; weather_emoji: string; temp: number;
  city: string; time_of_day: string; mood: string;
  vibe: string; mood_emoji: string; color: string;
  tracks: WeatherTrack[];
}

interface VideoItem {
  videoId: string; title: string;
  channelTitle: string; thumbnail: string;
  genre?: string; viewCount?: number; viewCountFmt?: string;
  isFallback?: boolean; youtubeSearch?: string;
}

interface TrendingSong {
  title: string; artist: string; artworkUrl: string;
  genre: string; trend_score: number; trend_label: string;
  regions_str: string; releaseDate: string;
  reddit_mentions?: number; yt_views?: number;
}

interface TrendingData {
  songs: TrendingSong[];
  prediction: string;
  generated_at: string;
  sources: { itunes_regions: string[]; reddit_active: boolean; youtube_active: boolean };
  from_cache: boolean;
}

// ── Video Carousel ─────────────────────────────────────────────────────────────

function VideoCarousel() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [_source, setSource] = useState<string>("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  const [loading, setLoading] = useState(true);
  const iframeKey = useRef(0);

  useEffect(() => {
    const itunesFallback = () =>
      fetch("https://rss.applemarketingtools.com/api/v2/in/music/most-played/10/songs.json")
        .then((r) => r.json())
        .then((d) => {
          const results = d?.feed?.results ?? [];
          if (results.length) {
            setVideos(results.map((s: Record<string, string>) => ({
              videoId: "",
              title: s.name ?? "",
              channelTitle: s.artistName ?? "",
              thumbnail: (s.artworkUrl100 ?? "").replace("100x100bb", "600x600bb"),
              isFallback: true,
              youtubeSearch: `${s.artistName ?? ""} ${s.name ?? ""} official video`,
            })));
            setSource("itunes");
          }
        })
        .catch(() => {});

    fetch(`${AI_SERVICE}/api/ai/trending-videos?limit=8`)
      .then((r) => r.json())
      .then((d) => {
        if (d.videos?.length) {
          setVideos(d.videos);
          setSource(d.source ?? "");
        } else {
          return itunesFallback();
        }
      })
      .catch(() => itunesFallback())
      .finally(() => setLoading(false));
  }, []);

  function switchVideo(idx: number) {
    iframeKey.current += 1;
    setActiveIdx(idx);
    setMuted(true);
  }

  const active = videos[activeIdx];
  const isEmbedMode = videos.length > 0 && !!videos[0].videoId;

  if (loading) {
    return (
      <div className="mb-6 rounded-2xl overflow-hidden animate-pulse" style={{ background: "rgba(255,255,255,0.05)", height: 280 }} />
    );
  }

  if (!videos.length) return null;

  // ── Fallback: iTunes cards (no YouTube API key) ──────────────────────────────
  if (!isEmbedMode) {
    return (
      <section className="mb-8 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-3">
          <FaFire className="text-orange-400" />
          <h2 className="text-lg font-bold text-white">Trending Now</h2>
          <span className="text-white/30 text-xs ml-1">· Live iTunes Charts · click to watch on YouTube</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
          {videos.map((v, i) => {
            const query = v.youtubeSearch ?? `${v.channelTitle} ${v.title} official video`;
            const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
            return (
              <a
                key={i}
                href={ytUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 w-36 rounded-xl overflow-hidden group cursor-pointer transition-all duration-200 hover:scale-[1.04] no-underline"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <div className="relative w-36 h-36">
                  <img
                    src={v.thumbnail}
                    alt={v.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/download.jpeg"; }}
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg" style={{ background: "#ff0000" }}>
                      <FaPlay className="text-white text-xs ml-0.5" />
                    </div>
                  </div>
                  <div className="absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white" style={{ background: "rgba(0,0,0,0.75)" }}>
                    {i + 1}
                  </div>
                </div>
                <div className="p-2.5">
                  <p className="text-white text-xs font-semibold truncate">{v.title}</p>
                  <p className="text-white/40 text-xs mt-0.5 truncate">{v.channelTitle}</p>
                </div>
              </a>
            );
          })}
        </div>
      </section>
    );
  }

  // ── Embed mode: YouTube player + sidebar ─────────────────────────────────────
  return (
    <section className="mb-8 animate-fade-in-up">
      <div className="flex items-center gap-2 mb-3">
        <FaFire className="text-orange-400" />
        <h2 className="text-lg font-bold text-white">Trending Now</h2>
        <span className="text-white/30 text-xs ml-1">· Hindi & English Hits</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        {/* ── Featured video player ── */}
        <div className="flex-1 min-w-0 rounded-2xl overflow-hidden relative group" style={{ background: "#000", aspectRatio: "16/9", minHeight: 200 }}>
          <iframe
            key={`${active.videoId}-${iframeKey.current}-${muted ? "m" : "u"}`}
            src={`https://www.youtube-nocookie.com/embed/${active.videoId}?autoplay=1&mute=${muted ? 1 : 0}&controls=1&modestbranding=1&rel=0&loop=1&playlist=${active.videoId}`}
            className="absolute inset-0 w-full h-full border-0"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            title={active.title}
          />
          <button
            onClick={() => { iframeKey.current += 1; setMuted(!muted); }}
            className="absolute top-3 right-3 z-10 p-2 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "rgba(0,0,0,0.6)" }}
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? <FaVolumeMute className="w-3 h-3" /> : <FaVolumeUp className="w-3 h-3" />}
          </button>
          <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)" }}
          >
            <p className="text-white text-sm font-semibold truncate">{active.title}</p>
            <p className="text-white/60 text-xs">{active.channelTitle}</p>
          </div>
        </div>

        {/* ── Thumbnail sidebar ── */}
        <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:overflow-x-hidden hide-scrollbar"
          style={{ maxHeight: 320, minWidth: 160 }}
        >
          {videos.map((v, i) => (
            <button
              key={v.videoId}
              onClick={() => switchVideo(i)}
              className="flex-shrink-0 flex lg:flex-row items-center gap-2 rounded-xl overflow-hidden text-left transition-all duration-200 hover:scale-[1.02]"
              style={{
                background: i === activeIdx ? "rgba(6,182,212,0.15)" : "rgba(255,255,255,0.05)",
                border: i === activeIdx ? "1px solid rgba(6,182,212,0.4)" : "1px solid rgba(255,255,255,0.06)",
                minWidth: 200,
              }}
            >
              <div className="relative flex-shrink-0 w-20 h-14 lg:w-16 lg:h-12 overflow-hidden rounded-lg">
                <img
                  src={v.thumbnail}
                  alt={v.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = "/download.jpeg"; }}
                />
                {i === activeIdx && (
                  <div className="absolute inset-0 bg-cyan-500/20 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center">
                      <FaPlay className="text-black text-[6px]" />
                    </div>
                  </div>
                )}
              </div>
              <div className="p-2 min-w-0">
                <p className="text-white text-xs font-medium truncate leading-tight" style={{ maxWidth: 140 }}>{v.title}</p>
                <p className="text-white/40 text-xs mt-0.5 truncate" style={{ maxWidth: 140 }}>{v.channelTitle}</p>
                {v.viewCountFmt && (
                  <p className="text-white/25 text-[10px] mt-0.5">{v.viewCountFmt}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Trending Predictions ───────────────────────────────────────────────────────

function TrendingPredictions({ onPlay }: { onPlay: (song: TrendingSong) => void }) {
  const [data, setData] = useState<TrendingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch(`${AI_SERVICE}/api/ai/trending`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <FaChartLine className="text-cyan-400" />
          <h2 className="text-lg font-bold text-white">Trend Predictions</h2>
          <span className="text-white/30 text-xs">· Next Week</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }}>
              <div className="w-full aspect-square" style={{ background: "rgba(255,255,255,0.07)" }} />
              <div className="p-2 space-y-1.5">
                <div className="h-3 rounded w-3/4" style={{ background: "rgba(255,255,255,0.08)" }} />
                <div className="h-2 rounded w-1/2" style={{ background: "rgba(255,255,255,0.05)" }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!data || !data.songs.length) return null;

  const visible = expanded ? data.songs : data.songs.slice(0, 10);

  function scoreColor(score: number) {
    if (score >= 75) return "#ef4444";
    if (score >= 55) return "#f43f5e";
    if (score >= 40) return "#06b6d4";
    return "#6b7280";
  }

  return (
    <section className="mb-8 animate-fade-in-up">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FaChartLine className="text-cyan-400" />
          <h2 className="text-lg font-bold text-white">Trend Predictions</h2>
          <span className="text-white/30 text-xs">· Next Week</span>
          {data.from_cache && <span className="text-white/20 text-[10px]">cached</span>}
        </div>
        <div className="flex items-center gap-2 text-white/30 text-xs">
          {data.sources.reddit_active && <span>Reddit ✓</span>}
          {data.sources.youtube_active && <span>YouTube ✓</span>}
          <span>iTunes ✓</span>
        </div>
      </div>

      {/* Gemini analyst note */}
      {data.prediction && (
        <div className="mb-4 rounded-xl p-4"
          style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.12), rgba(59,130,246,0.08))", border: "1px solid rgba(6,182,212,0.2)" }}
        >
          <p className="text-xs text-cyan-400 uppercase tracking-widest mb-1.5 font-semibold">🤖 AI Analyst Note</p>
          <p className="text-white/70 text-sm leading-relaxed">{data.prediction}</p>
        </div>
      )}

      {/* Song grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {visible.map((song, i) => (
          <div
            key={`${song.title}-${song.artist}-${i}`}
            className="rounded-xl overflow-hidden group cursor-pointer transition-all duration-200 hover:scale-[1.03]"
            style={{ background: "rgba(255,255,255,0.05)" }}
            onClick={() => onPlay(song)}
          >
            <div className="relative aspect-square">
              <img
                src={song.artworkUrl || "/download.jpeg"}
                alt={song.title}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = "/download.jpeg"; }}
              />
              {/* Rank badge */}
              <div className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                style={{ background: "rgba(0,0,0,0.7)" }}
              >
                {i + 1}
              </div>
              {/* Trend label */}
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: scoreColor(song.trend_score), color: "#fff" }}
              >
                {song.trend_label}
              </div>
              {/* Play overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center shadow-lg">
                  <FaPlay className="text-black text-xs ml-0.5" />
                </div>
              </div>
            </div>
            <div className="p-2.5">
              <p className="text-white text-xs font-semibold truncate">{song.title}</p>
              <p className="text-white/40 text-xs truncate mt-0.5">{song.artist}</p>
              <div className="flex items-center justify-between mt-1.5">
                {/* Score bar */}
                <div className="flex-1 h-1 rounded-full overflow-hidden mr-2" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${song.trend_score}%`, background: scoreColor(song.trend_score) }}
                  />
                </div>
                <span className="text-[10px] font-bold" style={{ color: scoreColor(song.trend_score) }}>
                  {song.trend_score}
                </span>
              </div>
              {song.regions_str && (
                <p className="text-white/20 text-[9px] mt-1 uppercase tracking-wide">{song.regions_str}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {data.songs.length > 10 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          {expanded ? "Show less ↑" : `Show all ${data.songs.length} predictions ↓`}
        </button>
      )}
    </section>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function Home() {
  const { albums, songs, loading, setSelectedSong, setIsPlaying, addExternalSong } = useSongData();
  const { user, saveWeather } = useUserData();
  const navigate = useNavigate();

  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [weatherMusic, setWeatherMusic] = useState<WeatherMusic | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchedRef = useRef(false);
  const userLoadedRef = useRef(false);

  const fetchWeatherMusic = useCallback(async (w: WeatherInfo) => {
    try {
      const r = await fetch(`${AI_SERVICE}/api/ai/weather-music`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weather_code: w.weatherCode,
          temp: w.temp,
          city: w.city,
          hour: new Date().getHours(),
          limit: 8,
        }),
      });
      if (r.ok) setWeatherMusic(await r.json());
    } catch {}
  }, []);

  const fetchWeatherByCoords = useCallback(async (
    lat: number, lon: number,
    cityOverride?: string, countryOverride?: string,
  ) => {
    const [meteoResp, geoResp] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`),
      cityOverride
        ? Promise.resolve(null)
        : fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, {
            headers: { "Accept-Language": "en" },
          }),
    ]);

    const meteo = await meteoResp.json();
    const code: number = meteo.current?.weather_code ?? 0;
    const temp: number = meteo.current?.temperature_2m ?? 20;

    let city = cityOverride ?? "Unknown";
    let country = countryOverride ?? "";
    if (geoResp && !cityOverride) {
      try {
        const geo = await geoResp.json();
        city = geo.address?.city ?? geo.address?.town ?? geo.address?.county ?? "Unknown";
        country = (geo.address?.country_code ?? "").toUpperCase();
      } catch {}
    }

    const w: WeatherInfo = { city, country, condition: WMO_LABEL[code] ?? "Clear", temp, icon: WMO_EMOJI[code] ?? "🌤️", weatherCode: code };
    setWeather(w);
    await fetchWeatherMusic(w);

    saveWeather({ city, country, condition: w.condition, description: w.condition.toLowerCase(), temp, icon: w.icon, weatherCode: code });
  }, [fetchWeatherMusic, saveWeather]);

  const doFetchWeather = useCallback(async () => {
    setWeatherLoading(true);
    setWeatherMusic(null);

    const geoSuccess = await new Promise<boolean>((resolve) => {
      if (!navigator.geolocation) { resolve(false); return; }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try { await fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude); resolve(true); }
          catch { resolve(false); }
        },
        () => resolve(false),
        { timeout: 6000, maximumAge: 300_000 },
      );
    });

    if (!geoSuccess) {
      try {
        const r = await fetch("https://ipapi.co/json/");
        const geo = await r.json();
        if (geo.latitude && geo.longitude) {
          await fetchWeatherByCoords(geo.latitude, geo.longitude, geo.city, (geo.country_code ?? "").toUpperCase());
        }
      } catch {}
    }

    setWeatherLoading(false);
  }, [fetchWeatherByCoords]);

  useEffect(() => {
    if (!user || userLoadedRef.current) return;
    userLoadedRef.current = true;
    fetchedRef.current = true;

    const saved = user.lastWeather;
    if (saved) {
      const age = Date.now() - new Date(saved.fetchedAt).getTime();
      if (age < 3 * 60 * 60 * 1000) {
        const cached: WeatherInfo = { city: saved.city, country: saved.country, condition: saved.condition, temp: saved.temp, icon: saved.icon, weatherCode: saved.weatherCode };
        setWeather(cached);
        fetchWeatherMusic(cached);
        return;
      }
    }
    doFetchWeather();
  }, [user]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!fetchedRef.current) { fetchedRef.current = true; doFetchWeather(); }
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    fetchedRef.current = false;
    userLoadedRef.current = false;
    setWeather(null);
    await doFetchWeather();
    setRefreshing(false);
  }

  function playWeatherTrack(track: WeatherTrack) {
    addExternalSong({ id: track.id, title: track.title, description: track.artist, thumbnail: track.thumbnail, audio: track.previewUrl, album: track.album ?? "" });
    setSelectedSong(track.id);
    setIsPlaying(true);
  }

  function playTrendingSong(song: TrendingSong) {
    // Search iTunes for a playable preview of this song
    const query = encodeURIComponent(`${song.title} ${song.artist}`);
    fetch(`https://itunes.apple.com/search?term=${query}&media=music&limit=1`)
      .then((r) => r.json())
      .then((d) => {
        const track = d.results?.[0];
        if (!track) return;
        addExternalSong({
          id: track.trackId?.toString() ?? song.title,
          title: track.trackName ?? song.title,
          description: track.artistName ?? song.artist,
          thumbnail: track.artworkUrl100?.replace("100x100bb", "300x300bb") ?? song.artworkUrl,
          audio: track.previewUrl ?? "",
          album: track.collectionName ?? "",
        });
        setSelectedSong(track.trackId?.toString() ?? song.title);
        setIsPlaying(true);
      })
      .catch(() => {});
  }

  return (
    <div>
      {loading ? (
        <Loading />
      ) : (
        <Layout>
          {/* ── Video Carousel (top of page) ── */}
          <VideoCarousel />

          {/* ── Greeting ── */}
          <div className="mb-6 animate-fade-in-up">
            <h1 className="text-2xl font-bold text-white">
              {getGreeting()}
              {user && (
                <span
                  className="ml-2"
                  style={{
                    background: "linear-gradient(135deg, #06b6d4, #f43f5e)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {user.name}
                </span>
              )}
            </h1>
          </div>

          {/* ── Weather widget ── */}
          {(weatherLoading || weather) && (
            <div className="mb-6 animate-fade-in-up">
              {weatherLoading && !weather ? (
                <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div className="w-10 h-10 rounded-full animate-pulse" style={{ background: "rgba(255,255,255,0.1)" }} />
                  <div className="space-y-2 flex-1">
                    <div className="h-3 rounded w-32 animate-pulse" style={{ background: "rgba(255,255,255,0.1)" }} />
                    <div className="h-2 rounded w-20 animate-pulse" style={{ background: "rgba(255,255,255,0.07)" }} />
                  </div>
                </div>
              ) : weather ? (
                <div
                  className="rounded-2xl p-4 flex items-center gap-4"
                  style={{
                    background: weatherMusic
                      ? `linear-gradient(135deg, ${weatherMusic.color}22, rgba(255,255,255,0.04))`
                      : "rgba(255,255,255,0.05)",
                    border: weatherMusic
                      ? `1px solid ${weatherMusic.color}33`
                      : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div className="text-4xl select-none">{weather.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-white font-black text-xl">{Math.round(weather.temp)}°C</span>
                      <span className="text-white/60 text-sm">{weather.condition}</span>
                    </div>
                    <p className="text-white/40 text-xs mt-0.5">
                      {weather.city}{weather.country ? `, ${weather.country}` : ""}
                    </p>
                  </div>
                  {weatherMusic && (
                    <div className="text-right hidden md:block">
                      <p className="text-white/60 text-sm">{weatherMusic.mood_emoji} {weatherMusic.mood}</p>
                      <p className="text-white/30 text-xs mt-0.5 max-w-[200px] truncate">{weatherMusic.vibe}</p>
                    </div>
                  )}
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing || weatherLoading}
                    className="p-2 rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30"
                    title="Refresh weather"
                  >
                    <FaSync className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
                  </button>
                </div>
              ) : null}

              {weatherMusic && weatherMusic.tracks.length > 0 && (
                <div className="mt-4">
                  <p className="text-white/40 text-xs uppercase tracking-widest mb-3 px-1">
                    {weatherMusic.mood_emoji} Music for your {weather?.condition?.toLowerCase()} {weatherMusic.time_of_day}
                  </p>
                  <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                    {weatherMusic.tracks.map((track) => (
                      <div
                        key={track.id}
                        className="flex-shrink-0 w-36 rounded-xl overflow-hidden group cursor-pointer transition-all duration-200 hover:scale-[1.04]"
                        style={{ background: "rgba(255,255,255,0.05)" }}
                        onClick={() => playWeatherTrack(track)}
                      >
                        <div className="relative w-36 h-36">
                          <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = "/download.jpeg"; }} />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg" style={{ background: weatherMusic.color }}>
                              <FaPlay className="text-white text-xs ml-0.5" />
                            </div>
                          </div>
                        </div>
                        <div className="p-2.5">
                          <p className="text-white text-xs font-semibold truncate">{track.title}</p>
                          <p className="text-white/40 text-xs truncate mt-0.5">{track.artist}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Quick access grid ── */}
          {albums.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mb-8 animate-fade-in-up delay-50">
              {albums.slice(0, 6).map((album, i) => (
                <button
                  key={i}
                  onClick={() => navigate(`/album/${album.id}`)}
                  className="flex items-center gap-3 rounded-lg overflow-hidden group relative transition-all duration-200 hover:bg-white/20 text-left"
                  style={{ background: "rgba(255,255,255,0.1)" }}
                >
                  <img src={album.thumbnail} alt={album.title} className="w-14 h-14 object-cover flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/download.jpeg"; }} />
                  <span className="font-bold text-sm text-white truncate pr-12">{album.title}</span>
                  <div
                    className="absolute right-3 w-10 h-10 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200"
                    style={{ background: "linear-gradient(135deg,#06b6d4,#f43f5e)", boxShadow: "0 6px 20px rgba(6,182,212,0.5)" }}
                  >
                    <FaPlay className="text-black text-xs ml-0.5" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ── Trending Predictions (AI) ── */}
          <TrendingPredictions onPlay={playTrendingSong} />

          {/* ── Featured Charts ── */}
          {albums.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4 animate-fade-in-up delay-100">
                <h2 className="text-xl font-bold text-white">Featured Charts</h2>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                {albums.map((e, i) => (
                  <div key={i} className="animate-fade-in-up" style={{ animationDelay: `${150 + i * 60}ms` }}>
                    <AlbumCard image={e.thumbnail} name={e.title} desc={e.description} id={e.id} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Today's biggest hits ── */}
          {songs.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4 animate-fade-in-up delay-200">
                <h2 className="text-xl font-bold text-white">Today's biggest hits</h2>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                {songs.map((e, i) => (
                  <div key={i} className="animate-fade-in-up" style={{ animationDelay: `${240 + i * 60}ms` }}>
                    <SongCard image={e.thumbnail} name={e.title} desc={e.description} id={e.id} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {albums.length === 0 && songs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 animate-fade-in">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(6,182,212,0.1)" }}>
                <span className="text-2xl">🎵</span>
              </div>
              <p className="text-white/50 text-sm font-medium">No music yet</p>
              <p className="text-white/25 text-xs mt-1">Add songs via the Admin dashboard</p>
            </div>
          )}
        </Layout>
      )}
    </div>
  );
}
