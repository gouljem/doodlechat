import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const STORAGE_KEY = 'doodlechat_username';
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToastState] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) { setLoading(false); return; }
    api.getUser(saved)
      .then((u) => setProfile(u))
      .catch(() => localStorage.removeItem(STORAGE_KEY))
      .finally(() => setLoading(false));
  }, []);

  const showToast = useCallback((message) => {
    setToastState(message);
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => setToastState(null), 2200);
  }, []);

  const login = useCallback(async (username, avatarId) => {
    const u = await api.createUser(username, avatarId);
    localStorage.setItem(STORAGE_KEY, u.username);
    setProfile(u);
    return u;
  }, []);

  const updateProfile = useCallback(async (newUsername, avatarId) => {
    const u = await api.updateUser(profile.username, newUsername, avatarId);
    localStorage.setItem(STORAGE_KEY, u.username);
    setProfile(u);
    return u;
  }, [profile]);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setProfile(null);
  }, []);

  const isAdmin = !!profile && profile.username.trim().toLowerCase() === 'phil';

  return (
    <AppContext.Provider value={{ profile, loading, login, updateProfile, logout, isAdmin, toast, showToast }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
