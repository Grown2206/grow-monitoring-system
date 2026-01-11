import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // API Base URL
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      // Validate token
      validateToken(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  // Validate token with backend
  const validateToken = async (tokenToValidate) => {
    try {
      const response = await fetch(`${API_URL}/auth/validate`, {
        headers: {
          'Authorization': `Bearer ${tokenToValidate}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setToken(tokenToValidate);
      } else {
        // Token ungültig -> logout
        logout();
      }
    } catch (err) {
      console.error('Token-Validierung fehlgeschlagen:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  // Login
  const login = async (username, password) => {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login fehlgeschlagen');
      }

      // Token und User speichern
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      setToken(data.token);
      setUser(data.user);

      console.log('✅ Login erfolgreich:', data.user.username);
      return { success: true, user: data.user };

    } catch (err) {
      const errorMessage = err.message || 'Login fehlgeschlagen';
      setError(errorMessage);
      console.error('❌ Login-Fehler:', errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Register
  const register = async (username, password, email) => {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password, email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registrierung fehlgeschlagen');
      }

      // Auto-Login nach Registrierung
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      setToken(data.token);
      setUser(data.user);

      console.log('✅ Registrierung erfolgreich:', data.user.username);
      return { success: true, user: data.user };

    } catch (err) {
      const errorMessage = err.message || 'Registrierung fehlgeschlagen';
      setError(errorMessage);
      console.error('❌ Registrierungs-Fehler:', errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setError(null);
    console.log('✅ Logout erfolgreich');
  };

  // Token erneuern
  const refreshToken = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        setToken(data.token);
        console.log('✅ Token erneuert');
        return data.token;
      }
    } catch (err) {
      console.error('Token-Erneuerung fehlgeschlagen:', err);
    }
  };

  // Helper: Fetch mit automatischem Auth-Header
  const authFetch = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    // Bei 401 -> Token abgelaufen, logout
    if (response.status === 401) {
      logout();
      throw new Error('Sitzung abgelaufen - Bitte erneut anmelden');
    }

    return response;
  };

  const value = {
    user,
    token,
    loading,
    error,
    login,
    register,
    logout,
    refreshToken,
    authFetch,
    isAuthenticated: !!token && !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
