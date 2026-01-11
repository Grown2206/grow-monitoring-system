import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogIn, UserPlus, Leaf, Lock, User, Mail, AlertCircle, Loader } from 'lucide-react';

const Login = ({ onSuccess }) => {
  const { login, register, loading, error } = useAuth();
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500 rounded-2xl mb-4">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Grow Monitoring System
          </h1>
          <p className="text-slate-300">
            {mode === 'login' ? 'Willkommen zurück!' : 'Erstelle deinen Account'}
          </p>
        </div>

        {/* Login/Register Card */}
        <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
          {/* Tab Switcher */}
          <div className="grid grid-cols-2 bg-slate-900/50">
            <button
              onClick={() => setMode('login')}
              className={`py-4 font-semibold transition-all ${
                mode === 'login'
                  ? 'bg-slate-800 text-emerald-400 border-b-2 border-emerald-500'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4 inline mr-2" />
              Login
            </button>
            <button
              onClick={() => setMode('register')}
              className={`py-4 font-semibold transition-all ${
                mode === 'register'
                  ? 'bg-slate-800 text-emerald-400 border-b-2 border-emerald-500'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4 inline mr-2" />
              Registrieren
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8">
            {/* Error Display */}
            {(formError || error) && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm">{formError || error}</p>
              </div>
            )}

            {/* Username */}
            <div className="mb-4">
              <label className="block text-slate-300 text-sm font-medium mb-2">
                Benutzername
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="dein-username"
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Email (nur bei Registrierung) */}
            {mode === 'register' && (
              <div className="mb-4">
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  E-Mail <span className="text-slate-500">(optional)</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="deine@email.de"
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div className="mb-6">
              <label className="block text-slate-300 text-sm font-medium mb-2">
                Passwort
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  disabled={loading}
                />
              </div>
              <p className="text-slate-500 text-xs mt-1">
                Mindestens 6 Zeichen
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-3 px-4 rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
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
          <div className="px-8 pb-8 pt-4 border-t border-slate-700">
            <p className="text-slate-400 text-xs text-center">
              {mode === 'login' ? (
                <>
                  Noch kein Account?{' '}
                  <button
                    onClick={() => setMode('register')}
                    className="text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    Jetzt registrieren
                  </button>
                </>
              ) : (
                <>
                  Bereits registriert?{' '}
                  <button
                    onClick={() => setMode('login')}
                    className="text-emerald-400 hover:text-emerald-300 font-medium"
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
          <p className="text-slate-500 text-xs">
            🔒 Deine Daten sind sicher verschlüsselt
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
