import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AuthContext = createContext(null);

const TOKEN_KEY = 'sentinel_auth_token';
const API_BASE  = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

/** Decode JWT payload without verifying signature (verification happens server-side) */
function decodeToken(token) {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    // Check if token is expired
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken]   = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser]     = useState(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) return null;
    const payload = decodeToken(stored);
    if (!payload) return null;
    return {
      email:    payload.sub,
      fullName: payload.name,
      role:     payload.role,
      userId:   payload.userId,
    };
  });

  // Silently log out if token is expired on mount
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored && !decodeToken(stored)) {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
    }
  }, []);

  /** Call /api/auth/login, store token, update user state */
  const login = useCallback(async (email, password) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    const { token: newToken, user: userInfo } = data;
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser({
      email:    userInfo.email,
      fullName: userInfo.fullName,
      role:     userInfo.role,
      userId:   userInfo.id,
    });

    return userInfo;
  }, []);

  /** Call /api/auth/register, store token, update user state */
  const register = useCallback(async (email, password, fullName, role) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password, fullName, role }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    const { token: newToken, user: userInfo } = data;
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser({
      email:    userInfo.email,
      fullName: userInfo.fullName,
      role:     userInfo.role,
      userId:   userInfo.id,
    });

    return userInfo;
  }, []);

  /** Clear token and redirect to login */
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  /** Convenience: build Authorization header object */
  const authHeaders = useCallback(() => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type':  'application/json',
  }), [token]);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, register, authHeaders }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Hook to consume auth context */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
