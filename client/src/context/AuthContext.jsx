import { createContext, useCallback, useContext, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';

const AuthContext = createContext(null);

const TOKEN_EXPIRY_KEY = 'ibosys_token_expires_at';

export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('ibosys_token');
    localStorage.removeItem('ibosys_user');
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const isTokenExpired = () => {
    const expiresAt = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!expiresAt) return false; // no expiry recorded, assume valid
    return Date.now() >= Number(expiresAt);
  };

  useEffect(() => {
    const token = localStorage.getItem('ibosys_token');
    const stored = localStorage.getItem('ibosys_user');
    if (token && stored && !isTokenExpired()) {
      let storedUser;
      try {
        storedUser = JSON.parse(stored);
        if (!storedUser || typeof storedUser !== 'object' || Array.isArray(storedUser)) {
          throw new TypeError('Saved user data is invalid');
        }
      } catch {
        logout();
        setLoading(false);
        return;
      }
      setUser(storedUser);
      api.getMe().then(u => {
        setUser(u);
        localStorage.setItem('ibosys_user', JSON.stringify(u));
      }).catch((error) => {
        // Only log out on auth-specific failures, not transient network errors
        const isAuthError = error?.response?.status === 401 || error?.response?.status === 403;
        if (isAuthError) {
          logout();
        }
      }).finally(() => setLoading(false));
    } else {
      if (token && stored && isTokenExpired()) {
        logout();
      }
      setLoading(false);
    }
  }, [logout]);

  const login = async (email, password) => {
    const data = await api.login({ email, password });
    localStorage.setItem('ibosys_token', data.token);
    localStorage.setItem('ibosys_user', JSON.stringify(data.user));
    // Store expiry so the client can detect stale tokens before the server rejects them
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(expiresAt));
    setUser(data.user);
    return data.user;
  };

  const refreshUser = async () => {
    const u = await api.getMe();
    setUser(u);
    localStorage.setItem('ibosys_user', JSON.stringify(u));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
