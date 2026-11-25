'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';

const TOKEN_KEY = 'novamart_token';
const AuthContext = createContext(null);

function readToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch (err) {
    return null;
  }
}
function writeToken(token) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch (err) {
    // storage unavailable (private mode): user stays logged in for this tab only
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // On first load, restore the saved session.
  useEffect(() => {
    let cancelled = false;
    const saved = readToken();
    if (!saved) {
      setReady(true);
      return undefined;
    }
    apiFetch('/auth/me', { token: saved })
      .then((data) => {
        if (cancelled) return;
        setToken(saved);
        setUser(data.user);
      })
      .catch((err) => {
        // Only forget the token if the server says it is invalid.
        if (err.status === 401) writeToken(null);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const applySession = useCallback((data) => {
    writeToken(data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const login = useCallback(
    async (email, password) => {
      applySession(await apiFetch('/auth/login', { method: 'POST', body: { email, password } }));
    },
    [applySession]
  );

  const register = useCallback(
    async (name, email, password) => {
      applySession(
        await apiFetch('/auth/register', { method: 'POST', body: { name, email, password } })
      );
    },
    [applySession]
  );

  const logout = useCallback(() => {
    writeToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ token, user, ready, login, register, logout }),
    [token, user, ready, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
