import { createContext, useContext, useState, useEffect } from 'react';
import API from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('pluto_user');
    return u ? JSON.parse(u) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('pluto_token');
    if (token) {
      API.get('/auth/me').then(res => {
        setUser(res.data);
        localStorage.setItem('pluto_user', JSON.stringify(res.data));
      }).catch(() => {
        localStorage.removeItem('pluto_token');
        localStorage.removeItem('pluto_user');
        setUser(null);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('pluto_token', token);
    localStorage.setItem('pluto_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('pluto_token');
    localStorage.removeItem('pluto_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
