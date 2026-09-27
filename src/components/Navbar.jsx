import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import Avatar from './Avatar.jsx';
import ProfileModal from './ProfileModal.jsx';

export default function Navbar() {
  const { profile, isAdmin } = useApp();
  const [showModal, setShowModal] = useState(false);

  if (!profile) {
    return (
      <div className="navbar">
        <div className="nav-logo"><span className="dot" />Doodle Chat</div>
      </div>
    );
  }

  const linkClass = ({ isActive }) => 'nav-link' + (isActive ? ' active' : '');

  return (
    <>
      <div className="navbar">
        <div className="nav-left">
          <div className="nav-logo"><span className="dot" />Doodle Chat</div>
          <div className="nav-links">
            <NavLink to="/home" className={linkClass}>Home</NavLink>
            <NavLink to="/changelog" className={linkClass}>Changelog</NavLink>
            {isAdmin && <NavLink to="/admin" className={linkClass}>Admin</NavLink>}
            <NavLink to="/about" className={linkClass}>About</NavLink>
          </div>
        </div>
        <div className="nav-right">
          <div className="profile-chip" onClick={() => setShowModal(true)}>
            <span className="chip-avatar"><Avatar id={profile.avatarId} size="100%" /></span>
            <span>{profile.username}</span>
            {isAdmin && <span className="admin-pill">ADMIN</span>}
          </div>
        </div>
      </div>
      {showModal && <ProfileModal onClose={() => setShowModal(false)} />}
    </>
  );
}
