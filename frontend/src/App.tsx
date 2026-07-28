import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import { useUserData } from "./context/UserContext";
import Loading from "./components/Loading";
import Register from "./pages/Register";
import Album from "./pages/Album";
import PlayList from "./pages/PlayList";
import Admin from "./pages/Admin";
import Search from "./pages/Search";
import Artist from "./pages/Artist";
import Profile from "./pages/Profile";
import CustomPlaylist from "./pages/CustomPlaylist";
import AiDJ from "./pages/AiDJ";
import MoodRooms from "./pages/MoodRooms";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

const App = () => {
  const { isAuth, loading } = useUserData();
  return (
    <>
      {loading ? (
        <Loading />
      ) : (
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/artist/:name" element={<Artist />} />
            <Route path="/album/:id" element={<Album />} />
            <Route path="/playlist" element={isAuth ? <PlayList /> : <Login />} />
            <Route path="/playlist/:id" element={isAuth ? <CustomPlaylist /> : <Login />} />
            <Route path="/profile" element={isAuth ? <Profile /> : <Login />} />
            <Route path="/ai-dj" element={<AiDJ />} />
            <Route path="/rooms" element={<MoodRooms />} />
            <Route path="/admin/dashboard" element={isAuth ? <Admin /> : <Login />} />
            <Route path="/login" element={isAuth ? <Home /> : <Login />} />
            <Route path="/register" element={isAuth ? <Home /> : <Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
          </Routes>
        </BrowserRouter>
      )}
    </>
  );
};

export default App;
