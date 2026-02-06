import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme';
import { LogIn, UserPlus, Leaf, Lock, User, Mail, AlertCircle, Loader } from 'lucide-react';

const Login = ({ onSuccess }) => {
  const { login, register, loading, error } = useAuth();
  const { currentTheme } = useTheme();
  const [mode, setMode] = useState('login'); // 'login' oder 'register'
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: ''
  });
  const [formError, setFormError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Validierung
    if (!formData.username || !formData.password) {
      setFormError('Bitte fülle alle Felder aus');
      return;
    }

    if (formData.password.length < 6) {
      setFormError('Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }

    let result;
    if (mode === 'login') {
      result = await login(formData.username, formData.password);
    } else {
      result = await register(formData.username, formData.password, formData.email);
    }

    if (result.success) {
      // Erfolg - rufe onSuccess callback auf
      if (onSuccess) {
        onSuccess(result.user);
      }
    } else {
      setFormError(result.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: `linear-gradient(135deg, ${currentTheme.bg.main}, ${currentTheme.accent.color}15, ${currentTheme.bg.main})` }}>
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ backgroundColor: currentTheme.accent.color }}>
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: currentTheme.text.primary }}>
            Grow Monitoring System
          </h1>
          <p style={{ color: currentTheme.text.secondary }}>
            {mode === 'login' ? 'Willkommen zurück!' : 'Erstelle deinen Account'}
          </p>
        </div>

        {/* Login/Register Card */}
        <div className="rounded-2xl shadow-2xl border overflow-hidden"
          style={{ backgroundColor: currentTheme.bg.card, borderColor: currentTheme.border.default }}>
          {/* Tab Switcher */}
          <div className="grid grid-cols-2" style={{ backgroundColor: `${currentTheme.bg.main}80` }}>
            <button
              onClick={() => setMode('login')}
              className="py-4 font-semibold transition-all"
              style={{
                backgroundColor: mode === 'login' ? currentTheme.bg.card : 'transparent',
                color: mode === 'login' ? currentTheme.accent.color : currentTheme.text.muted,
                borderBottom: mode === 'login' ? `2px solid ${currentTheme.accent.color}` : '2px solid transparent'
              }}
            >
              <LogIn className="w-4 h-4 inline mr-2" />
              Login
            </button>
            <button
              onClick={() => setMode('register')}
              className="py-4 font-semibold transition-all"
              style={{
                backgroundColor: mode === 'register' ? currentTheme.bg.card : 'transparent',
                color: mode === 'register' ? currentTheme.accent.color : currentTheme.text.muted,
                borderBottom: mode === 'register' ? `2px solid ${currentTheme.accent.color}` : '2px solid transparent'
              }}
            >
              <UserPlus className="w-4 h-4 inline mr-2" />
              Registrieren
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8">
            {/* Error Display */}
            {(formError || error) && (
              <div className="mb-6 p-4 rounded-lg flex items-start gap-3"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#f87171' }} />
                <p className="text-sm" style={{ color: '#fca5a5' }}>{formError || error}</p>
              </div>
            )}

            {/* Username */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: currentTheme.text.secondary }}>
                Benutzername
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: currentTheme.text.muted }} />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="dein-username"
                  className="w-full rounded-lg pl-10 pr-4 py-3 outline-none transition-all"
                  style={{
                    backgroundColor: currentTheme.bg.input || currentTheme.bg.main,
                    border: `1px solid ${currentTheme.border.default}`,
                    color: currentTheme.text.primary
                  }}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Email (nur bei Registrierung) */}
            {mode === 'register' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" style={{ color: currentTheme.text.secondary }}>
                  E-Mail <span style={{ color: currentTheme.text.muted }}>(optional)</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: currentTheme.text.muted }} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="deine@email.de"
                    className="w-full rounded-lg pl-10 pr-4 py-3 outline-none transition-all"
                    style={{
                      backgroundColor: currentTheme.bg.input || currentTheme.bg.main,
                      border: `1px solid ${currentTheme.border.default}`,
                      color: currentTheme.text.primary
                    }}
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" style={{ color: currentTheme.text.secondary }}>
                Passwort
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: currentTheme.text.muted }} />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full rounded-lg pl-10 pr-4 py-3 outline-none transition-all"
                  style={{
                    backgroundColor: currentTheme.bg.input || currentTheme.bg.main,
                    border: `1px solid ${currentTheme.border.default}`,
                    color: currentTheme.text.primary
                  }}
                  disabled={loading}
                />
              </div>
              <p className="text-xs mt-1" style={{ color: currentTheme.text.muted }}>
                Mindestens 6 Zeichen
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full font-semibold py-3 px-4 rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 text-white"
              style={{
                background: `linear-gradient(135deg, ${currentTheme.accent.color}, ${currentTheme.accent.dark || currentTheme.accent.color})`
              }}
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  {mode === 'login' ? 'Anmeldung läuft...' : 'Registrierung läuft...'}
                </>
              ) : (
                <>
                  {mode === 'login' ? (
                    <>
                      <LogIn className="w-5 h-5" />
                      Anmelden
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      Registrieren
                    </>
                  )}
                </>
              )}
            </button>
          </form>

          {/* Info Footer */}
          <div className="px-8 pb-8 pt-4 border-t" style={{ borderColor: currentTheme.border.default }}>
            <p className="text-xs text-center" style={{ color: currentTheme.text.muted }}>
              {mode === 'login' ? (
                <>
                  Noch kein Account?{' '}
                  <button
                    onClick={() => setMode('register')}
                    className="font-medium"
                    style={{ color: currentTheme.accent.color }}
                  >
                    Jetzt registrieren
                  </button>
                </>
              ) : (
                <>
                  Bereits registriert?{' '}
                  <button
                    onClick={() => setMode('login')}
                    className="font-medium"
                    style={{ color: currentTheme.accent.color }}
                  >
                    Zum Login
                  </button>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Security Note */}
        <div className="mt-6 text-center">
          <p className="text-xs" style={{ color: currentTheme.text.muted }}>
            Deine Daten sind sicher verschlüsselt
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
