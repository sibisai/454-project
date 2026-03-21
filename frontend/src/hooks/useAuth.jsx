import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api, { setAuthTokens, clearAuthTokens, getRefreshToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [restoring, setRestoring] = useState(true);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAuthTokens(data.access_token, data.refresh_token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (email, password, displayName) => {
    await api.post('/auth/register', {
      email,
      password,
      display_name: displayName,
    });
    return login(email, password);
  }, [login]);

  const logout = useCallback(() => {
    clearAuthTokens();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
      return data;
    } catch {
      clearAuthTokens();
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!getRefreshToken()) {
      setRestoring(false);
      return;
    }
    refreshUser().finally(() => setRestoring(false));
  }, [refreshUser]);

  const value = {
    user,
    isAuthenticated: !!user,
    restoring,
    login,
    register,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
