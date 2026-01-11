import React, { useState, useEffect } from 'react';
import {
  Cloud, CloudRain, CloudSun, Sun, Wind, Droplets, MapPin,
  ArrowUpRight, ArrowDownRight, Snowflake, CloudLightning
} from 'lucide-react';
import { weatherAPI } from '../../utils/api';
import { colors } from '../../theme';

// Mapping von WMO Wetter-Codes zu Icons und Text
const getWeatherInfo = (code) => {
  if (code === 0) return { icon: Sun, label: 'Klar', color: colors.yellow[400] };
  if (code >= 1 && code <= 3) return { icon: CloudSun, label: 'Bewölkt', color: colors.slate[300] };
  if (code >= 45 && code <= 48) return { icon: Cloud, label: 'Nebel', color: colors.slate[400] };
  if (code >= 51 && code <= 67) return { icon: CloudRain, label: 'Regen', color: colors.blue[400] };
  if (code >= 71 && code <= 77) return { icon: Snowflake, label: 'Schnee', color: colors.cyan[200] };
  if (code >= 95) return { icon: CloudLightning, label: 'Gewitter', color: colors.purple[400] };
  return { icon: Cloud, label: 'Unbekannt', color: colors.slate[400] };
};

export default function WeatherWidget({ theme }) {
  // Fallback theme für Backwards-Kompatibilität
  const defaultTheme = {
    bg: { card: '#0f172a', main: '#020617', hover: '#1e293b' },
    border: { default: '#1e293b', light: '#334155' },
    text: { primary: '#f1f5f9', secondary: '#94a3b8', muted: '#64748b' },
    accent: { color: '#10b981', light: '#34d399', rgb: '16, 185, 129' }
  };
  const t = theme || defaultTheme;

  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState('Standort wird ermittelt...');
  const [error, setError] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    // 1. Standort holen
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(fetchWeather, (err) => {
        // Geolocation-Fehler ignorieren, Fallback auf Berlin verwenden
        fetchWeather({ coords: { latitude: 52.52, longitude: 13.405 } }, "Berlin (Fallback)");
      });
    } else {
      fetchWeather({ coords: { latitude: 52.52, longitude: 13.405 } }, "Berlin (Fallback)");
    }

    // 2. Hole Grow-Empfehlungen vom Backend
    fetchRecommendations();

    // Aktualisiere Empfehlungen alle 15 Minuten
    const interval = setInterval(fetchRecommendations, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchRecommendations = async () => {
    try {
      const data = await weatherAPI.getRecommendations();
      if (data.success && data.recommendations) {
        setRecommendations(data.recommendations);
      }
    } catch (err) {
      console.error('Fehler beim Laden der Empfehlungen:', err);
    }
  };

  const fetchWeather = async (position, fallbackName) => {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    try {
      // 2. Ortsnamen holen (Reverse Geocoding via Open-Meteo)
      if (!fallbackName) {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/get?latitude=${lat}&longitude=${lon}&count=1&language=de&format=json`);
        const geoData = await geoRes.json();
        if (geoData.results && geoData.results[0]) {
          setLocationName(geoData.results[0].name);
        } else {
          setLocationName("Lokaler Standort");
        }
      } else {
        setLocationName(fallbackName);
      }

      // 3. Wetterdaten holen (Live + Forecast)
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
      );
      const data = await res.json();
      setWeather(data);
    } catch (err) {
      console.error(err);
      setError("Wetterdaten nicht verfügbar");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        className="h-full rounded-3xl p-6 flex items-center justify-center animate-pulse border"
        style={{ backgroundColor: t.bg.card, borderColor: t.border.default }}
      >
        <Sun className="animate-spin" style={{ color: t.border.light }} />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="h-full rounded-3xl p-6 flex items-center justify-center text-sm border"
        style={{ backgroundColor: t.bg.card, borderColor: t.border.default, color: colors.red[400] }}
      >
        {error}
      </div>
    );
  }

  const currentInfo = getWeatherInfo(weather.current.weather_code);
  const CurrentIcon = currentInfo.icon;

  return (
    <div
      className="rounded-3xl p-5 md:p-6 shadow-xl flex flex-col justify-between h-full relative overflow-hidden group border"
      style={{
        background: `linear-gradient(to bottom right, ${t.bg.card}, ${t.bg.hover})`,
        borderColor: `${t.border.default}80`
      }}
    >

      {/* Hintergrund Effekt */}
      <div
        className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none opacity-50"
        style={{ background: `radial-gradient(circle, ${currentInfo.color}20, transparent)` }}
      ></div>

      {/* Header: Ort & Aktuell */}
      <div className="z-10">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div
              className="flex items-center gap-1.5 text-xs uppercase font-bold tracking-wider mb-1"
              style={{ color: t.text.secondary }}
            >
              <MapPin size={12} /> {locationName}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl md:text-4xl font-bold" style={{ color: t.text.primary }}>
                {Math.round(weather.current.temperature_2m)}°
              </span>
              <div className="text-sm font-medium" style={{ color: t.text.secondary }}>
                <div>{currentInfo.label}</div>
                <div className="flex items-center gap-2 text-xs mt-0.5" style={{ color: t.text.muted }}>
                  <span className="flex items-center gap-1">
                    <Wind size={10}/> {weather.current.wind_speed_10m} km/h
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div
            className="p-3 rounded-2xl border shadow-sm"
            style={{
              backgroundColor: `${t.bg.main}80`,
              borderColor: `${t.border.light}80`,
              color: currentInfo.color
            }}
          >
            <CurrentIcon size={32} />
          </div>
        </div>

        {/* Zusatzdaten */}
        <div className="flex gap-3 md:gap-4 mb-6 flex-wrap">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium"
            style={{
              backgroundColor: 'rgba(96, 165, 250, 0.1)',
              borderColor: 'rgba(96, 165, 250, 0.2)',
              color: colors.blue[300]
            }}
          >
            <Droplets size={14} />
            {weather.current.relative_humidity_2m}% RLF
          </div>
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium"
            style={{
              backgroundColor: t.bg.hover,
              borderColor: t.border.light,
              color: t.text.secondary
            }}
          >
            <span className="flex items-center" style={{ color: colors.emerald[400] }}>
              <ArrowUpRight size={12}/> {Math.round(weather.daily.temperature_2m_max[0])}°
            </span>
            <span className="w-px h-3" style={{ backgroundColor: t.border.default }}></span>
            <span className="flex items-center" style={{ color: colors.blue[400] }}>
              <ArrowDownRight size={12}/> {Math.round(weather.daily.temperature_2m_min[0])}°
            </span>
          </div>
        </div>
      </div>

      {/* 3-Tage Forecast */}
      <div className="grid grid-cols-3 gap-2 border-t pt-4 z-10" style={{ borderColor: `${t.border.light}80` }}>
        {[1, 2, 3].map((dayIndex) => {
          const date = new Date();
          date.setDate(date.getDate() + dayIndex);
          const dayName = date.toLocaleDateString('de-DE', { weekday: 'short' });
          const code = weather.daily.weather_code[dayIndex];
          const info = getWeatherInfo(code);
          const DayIcon = info.icon;
          const max = Math.round(weather.daily.temperature_2m_max[dayIndex]);
          const min = Math.round(weather.daily.temperature_2m_min[dayIndex]);

          return (
            <div
              key={dayIndex}
              className="text-center hover:bg-opacity-50 rounded-xl p-2 transition-all"
              style={{ backgroundColor: `${t.bg.hover}00` }}
            >
              <div className="text-xs font-medium mb-1" style={{ color: t.text.muted }}>
                {dayName}
              </div>
              <DayIcon size={20} className="mx-auto mb-1" style={{ color: info.color }} />
              <div className="text-xs font-bold" style={{ color: t.text.secondary }}>
                {max}° <span className="font-normal" style={{ color: t.text.muted }}>/ {min}°</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grow-Empfehlungen */}
      {recommendations.length > 0 && (
        <div className="mt-4 border-t pt-4 z-10" style={{ borderColor: `${t.border.light}80` }}>
          <div
            className="text-xs font-bold uppercase tracking-wider mb-2"
            style={{ color: t.text.secondary }}
          >
            💡 Indoor/Outdoor Tipps
          </div>
          {recommendations.slice(0, 2).map((rec, index) => (
            <div
              key={index}
              className="text-xs p-2 rounded-lg mb-2 border"
              style={{
                backgroundColor: rec.type === 'warning'
                  ? 'rgba(245, 158, 11, 0.1)'
                  : 'rgba(16, 185, 129, 0.1)',
                borderColor: rec.type === 'warning'
                  ? 'rgba(245, 158, 11, 0.3)'
                  : 'rgba(16, 185, 129, 0.3)',
                color: rec.type === 'warning'
                  ? colors.amber[200]
                  : colors.emerald[200]
              }}
            >
              <div className="font-medium">{rec.message}</div>
              <div className="mt-0.5" style={{ color: t.text.secondary }}>{rec.action}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
