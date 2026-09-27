import { Navigate, Route, Routes } from 'react-router-dom';
import { useApp } from './context/AppContext.jsx';
import Navbar from './components/Navbar.jsx';
import ToastHost from './components/Toast.jsx';
import NameSetup from './pages/NameSetup.jsx';
import Home from './pages/Home.jsx';
import Create from './pages/Create.jsx';
import Join from './pages/Join.jsx';
import Chat from './pages/Chat.jsx';
import Admin from './pages/Admin.jsx';
import About from './pages/About.jsx';
import Changelog from './pages/Changelog.jsx';

export default function App() {
  const { profile, loading } = useApp();

  if (loading) {
    return <div className="page"><div className="loading-note">Booting up…</div></div>;
  }

  return (
    <>
      <Navbar />
      {!profile ? (
        <NameSetup />
      ) : (
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/create" element={<Create />} />
          <Route path="/join" element={<Join />} />
          <Route path="/session/:code" element={<Chat />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/about" element={<About />} />
          <Route path="/changelog" element={<Changelog />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      )}
      <ToastHost />
    </>
  );
}
