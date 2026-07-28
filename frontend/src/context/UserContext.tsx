import axios from "axios";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import toast, { Toaster } from "react-hot-toast";

// All requests go with cookies — no token in localStorage
const api = axios.create({
  baseURL: import.meta.env.VITE_USER_SERVICE_URL ?? "http://localhost:5000",
  withCredentials: true,
});

export interface PlaylistSong {
  id: string;
  title: string;
  artistName: string;
  thumbnail: string;
  audio: string;
}

export interface CustomPlaylist {
  _id: string;
  name: string;
  songs: PlaylistSong[];
  createdAt: string;
}

export interface UserWeather {
  city: string;
  country: string;
  condition: string;
  description: string;
  temp: number;
  icon: string;
  weatherCode: number;
  fetchedAt: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  playlist: string[];
  followedArtists: string[];
  savedAlbums: { albumId: string; albumTitle: string; artistName: string; thumbnail: string }[];
  customPlaylists: CustomPlaylist[];
  currentRoom?: string;
  lastWeather?: UserWeather;
}

interface UserContextType {
  user: User | null;
  isAuth: boolean;
  loading: boolean;
  btnLoading: boolean;
  loginUser:    (email: string, password: string, navigate: (path: string) => void) => Promise<void>;
  registerUser: (name: string, email: string, password: string, navigate: (path: string) => void) => Promise<void>;
  logoutUser:   () => Promise<void>;
  addToPlaylist:         (id: string) => void;
  followArtist:          (name: string) => Promise<void>;
  logListen:             (song: { songId: string; songTitle: string; artistName: string; albumName: string; thumbnail: string; listenedFor: number }) => Promise<void>;
  toggleSaveAlbum:       (album: { albumId: string; albumTitle: string; artistName: string; thumbnail: string }) => Promise<void>;
  createPlaylist:        (name: string) => Promise<CustomPlaylist | null>;
  deletePlaylist:        (id: string) => Promise<void>;
  renamePlaylist:        (id: string, name: string) => Promise<void>;
  addSongToPlaylist:     (playlistId: string, song: PlaylistSong) => Promise<void>;
  removeSongFromPlaylist:(playlistId: string, songId: string) => Promise<void>;
  joinRoom:    (room: string) => Promise<void>;
  leaveRoom:   () => Promise<void>;
  saveWeather: (weather: Omit<UserWeather, "fetchedAt">) => Promise<void>;
  saveScreenshotSearch: (data: {
    imageUrl: string; songTitle: string; artist: string;
    confidence: string; sourceType: string; tracksFound: number;
  }) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser]           = useState<User | null>(null);
  const [loading, setLoading]     = useState(true);
  const [isAuth, setIsAuth]       = useState(false);
  const [btnLoading, setBtnLoading] = useState(false);

  async function fetchUser() {
    try {
      const { data } = await api.get("/api/v1/user/me");
      setUser(data);
      setIsAuth(true);
    } catch {
      setUser(null);
      setIsAuth(false);
    } finally {
      setLoading(false);
    }
  }

  async function registerUser(
    name: string,
    email: string,
    password: string,
    navigate: (path: string) => void,
  ) {
    setBtnLoading(true);
    try {
      const { data } = await api.post("/api/v1/user/register", { name, email, password });
      toast.success(data.message);
      setUser(data.user);
      setIsAuth(true);
      navigate("/");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Registration failed");
    } finally {
      setBtnLoading(false);
    }
  }

  async function loginUser(
    email: string,
    password: string,
    navigate: (path: string) => void,
  ) {
    setBtnLoading(true);
    try {
      const { data } = await api.post("/api/v1/user/login", { email, password });
      toast.success(data.message);
      setUser(data.user);
      setIsAuth(true);
      navigate("/");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      setBtnLoading(false);
    }
  }

  async function logoutUser() {
    try {
      await api.post("/api/v1/user/logout");
    } catch { /* best-effort */ }
    setUser(null);
    setIsAuth(false);
    // Clear any leftover localStorage keys from the old auth system
    localStorage.removeItem("token");
    toast.success("Logged out");
  }

  async function addToPlaylist(id: string) {
    try {
      const { data } = await api.post(`/api/v1/song/${id}`);
      toast.success(data.message);
      fetchUser();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "An error occurred");
    }
  }

  async function followArtist(name: string) {
    try {
      const { data } = await api.post("/api/v1/artist/follow", { name });
      toast.success(data.message);
      fetchUser();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "An error occurred");
    }
  }

  async function logListen(song: {
    songId: string; songTitle: string; artistName: string;
    albumName: string; thumbnail: string; listenedFor: number;
  }) {
    try {
      const platform = `${navigator.platform} | ${navigator.userAgent.slice(0, 80)}`;
      await api.post("/api/v1/listen", { ...song, platform });
    } catch { /* silent */ }
  }

  async function toggleSaveAlbum(album: {
    albumId: string; albumTitle: string; artistName: string; thumbnail: string;
  }) {
    try {
      const { data } = await api.post("/api/v1/album/save", album);
      toast.success(data.message);
      fetchUser();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "An error occurred");
    }
  }

  async function createPlaylist(name: string): Promise<CustomPlaylist | null> {
    try {
      const { data } = await api.post("/api/v1/playlists", { name });
      await fetchUser();
      return data as CustomPlaylist;
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create playlist");
      return null;
    }
  }

  async function deletePlaylist(id: string) {
    try {
      const { data } = await api.delete(`/api/v1/playlists/${id}`);
      toast.success(data.message);
      fetchUser();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete playlist");
    }
  }

  async function renamePlaylist(id: string, name: string) {
    try {
      await api.put(`/api/v1/playlists/${id}/rename`, { name });
      fetchUser();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to rename playlist");
    }
  }

  async function addSongToPlaylist(playlistId: string, song: PlaylistSong) {
    try {
      await api.post(`/api/v1/playlists/${playlistId}/songs`, song);
      toast.success("Added to playlist");
      fetchUser();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add song");
    }
  }

  async function removeSongFromPlaylist(playlistId: string, songId: string) {
    try {
      await api.delete(`/api/v1/playlists/${playlistId}/songs/${encodeURIComponent(songId)}`);
      fetchUser();
    } catch { /* silent */ }
  }

  async function joinRoom(room: string) {
    try {
      const { data } = await api.post("/api/v1/room/join", { room });
      toast.success(`Joined ${room.replace("_", " ")} room`);
      setUser((prev) => prev ? { ...prev, currentRoom: data.currentRoom } : prev);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to join room");
    }
  }

  async function leaveRoom() {
    try {
      await api.post("/api/v1/room/leave");
      setUser((prev) => prev ? { ...prev, currentRoom: undefined } : prev);
    } catch { /* silent */ }
  }

  async function saveWeather(weather: Omit<UserWeather, "fetchedAt">) {
    try {
      await api.post("/api/v1/weather/save", weather);
      setUser((prev) =>
        prev ? { ...prev, lastWeather: { ...weather, fetchedAt: new Date().toISOString() } } : prev
      );
    } catch { /* silent */ }
  }

  async function saveScreenshotSearch(data: {
    imageUrl: string; songTitle: string; artist: string;
    confidence: string; sourceType: string; tracksFound: number;
  }) {
    try {
      await api.post("/api/v1/screenshot-searches", data);
    } catch { /* silent */ }
  }

  useEffect(() => { fetchUser(); }, []);

  return (
    <UserContext.Provider
      value={{
        user, loading, isAuth, btnLoading,
        loginUser, registerUser, logoutUser,
        addToPlaylist, followArtist, logListen,
        toggleSaveAlbum, createPlaylist, deletePlaylist,
        renamePlaylist, addSongToPlaylist, removeSongFromPlaylist,
        joinRoom, leaveRoom, saveWeather, saveScreenshotSearch,
      }}
    >
      {children}
      <Toaster />
    </UserContext.Provider>
  );
};

export const useUserData = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUserData must be used within a UserProvider");
  return context;
};
