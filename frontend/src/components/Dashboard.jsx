import React, { useState, useEffect } from 'react';
import StatCard from './Dashboard/StatCard';
import LiveChart from './Dashboard/LiveChart';
import CameraFeed from './Dashboard/CameraFeed';
import WeatherWidget from './Dashboard/WeatherWidget';
import QuickActionsBar from './Dashboard/QuickActionsBar';
import WidgetSystem from './Dashboard/WidgetSystem';
import SmartSuggestionsEngine from './SmartSuggestions/SmartSuggestionsEngine';
import HarvestCountdown from './HarvestCountdown';
import { Skeleton } from './ui';
import { useSocket } from '../context/SocketContext';
import { useSensorAverages } from '../hooks/useSensorAverages';
import { api } from '../utils/api';
import { useTheme, themes, colors } from '../theme';
import {
  Thermometer, Droplets, Sun, Activity, Wind, AlertCircle,
  ArrowRight, CheckCircle2, Clock, Calendar, Leaf, Palette, ChevronDown
} from 'lucide-react';

// --- Logo Komponente ---
const Logo = ({ color }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8" style={{ color }}>
    <path d="M12.378 1.602a.75.75 0 00-.756 0C11.622 1.602 3 7.122 3 14.25A9 9 0 0012 23.25a9 9 0 009-9c0-7.128-8.622-12.648-8.622-12.648zM12 21.75A7.5 7.5 0 014.5 14.25c0-5.8 6.058-10.3 7.5-11.304 1.442 1.004 7.5 5.504 7.5 11.304A7.5 7.5 0 0112 21.75z" opacity="0.5"/>
    <path d="M12 6.75a.75.75 0 00-.75.75v9a.75.75 0 001.5 0v-9a.75.75 0 00-.75-.75z" />
    <path d="M12 13.5a.75.75 0 00-.53.22l-2.25 2.25a.75.75 0 101.06 1.06L12 15.31l1.72 1.72a.75.75 0 101.06-1.06l-2.25-2.25a.75.75 0 00-.53-.22z" />
  </svg>
);

export default function Dashboard({ changeTab }) {
  const { isConnected, watchdogStatus } = useSocket();
  const { temp: avgTemp, humidity: avgHumidity, sensorData } = useSensorAverages();
  const { currentTheme, themeId, setTheme } = useTheme();
  const [nextEvent, setNextEvent] = useState(null);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [averages, setAverages] = useState({ temp: null, humidity: null, lux: null, vpd: null });
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [plants, setPlants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 60000);
    return () => clearInterval(interval);
  }, [isConnected]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [events, history, plantsData] = await Promise.all([
        api.getEvents(),
        api.getHistory(),
        api.getPlants()
      ]);

      const plantsArray = Array.isArray(plantsData) ? plantsData : (plantsData?.data || []);
      if (plantsArray.length > 0) {
        setPlants(plantsArray);
      }

      // Ensure events is an array before filtering
      const eventsArray = Array.isArray(events) ? events : (events?.data || []);
      const futureEvents = eventsArray
        .filter(e => e.date && new Date(e.date) >= new Date())
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      if (futureEvents.length > 0) setNextEvent(futureEvents[0]);

      const alerts = [];
      if (sensorData?.tankLevel < 1000) alerts.push({ type: 'warning', msg: 'Wassertank niedrig' });
      // Temperatur-Alerts werden jetzt über useSensorAverages abgedeckt
      if (avgTemp && avgTemp > 28) alerts.push({ type: 'error', msg: 'Temperatur kritisch' });
      setActiveAlerts(alerts);

      const historyArray = Array.isArray(history) ? history : (history?.data || []);
      if (historyArray.length > 0) {
        const now = Date.now();
        const hours4 = 4 * 60 * 60 * 1000;
        const recentData = historyArray.filter(d => new Date(d.timestamp).getTime() > (now - hours4));

        if (recentData.length > 0) {
          const sums = recentData.reduce((acc, curr) => {
            const r = curr.readings || {};
            const t = r.temp || 0;
            const rh = r.humidity || 0;
            const svp = 0.61078 * Math.exp((17.27 * t) / (t + 237.3));
            const vpd = svp * (1 - rh / 100);

            return {
              temp: acc.temp + (r.temp || 0),
              humidity: acc.humidity + (r.humidity || 0),
              lux: acc.lux + (r.lux || 0),
              vpd: acc.vpd + (vpd > 0 ? vpd : 0),
              count: acc.count + 1
            };
          }, { temp: 0, humidity: 0, lux: 0, vpd: 0, count: 0 });

          setAverages({
            temp: (sums.temp / sums.count).toFixed(1),
            humidity: (sums.humidity / sums.count).toFixed(1),
            lux: (sums.lux / sums.count).toFixed(0),
            vpd: (sums.vpd / sums.count).toFixed(2)
          });
        }
      }

    } catch (e) {
      console.error("Dashboard Ladefehler:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Nutze den zentralen Hook für Sensor-Durchschnittswerte
  const isTempOk = avgTemp > 18 && avgTemp < 28;
  const isHumOk = avgHumidity > 40 && avgHumidity < 70;
  const healthScore = (isConnected ? 50 : 0) + (isTempOk ? 25 : 0) + (isHumOk ? 25 : 0);

  return (
    <div
      className="space-y-6 animate-in fade-in duration-500 pb-20 p-4 md:p-6 rounded-3xl"
      style={{ backgroundColor: currentTheme.bg.main }}
    >

      {/* Header mit Logo und Themenauswahl */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div className="flex items-center gap-3">
          <Logo color={currentTheme.accent.color} />
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: currentTheme.text.primary }}>
            GrowMonitor
          </h1>
        </div>

        <div className="relative">
          <button
            onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border transition-all hover:opacity-80"
            style={{
              backgroundColor: currentTheme.bg.card,
              borderColor: currentTheme.border.default,
              color: currentTheme.text.primary
            }}
          >
            <Palette size={18} style={{ color: currentTheme.accent.color }} />
            <span className="text-sm font-medium">{currentTheme.name}</span>
            <ChevronDown size={16} className={`transition-transform ${isThemeMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isThemeMenuOpen && (
            <div
              className="absolute right-0 mt-2 w-52 rounded-xl shadow-2xl border z-50 overflow-hidden"
              style={{
                backgroundColor: currentTheme.bg.card,
                borderColor: currentTheme.border.default
              }}
            >
              {Object.entries(themes).map(([key, t]) => (
                <button
                  key={key}
                  onClick={() => { setTheme(key); setIsThemeMenuOpen(false); }}
                  className="w-full text-left px-4 py-3 text-sm font-medium transition-all flex items-center gap-3 hover:brightness-110"
                  style={{
                    color: themeId === key ? t.accent.color : t.text.primary,
                    backgroundColor: themeId === key ? `rgba(${t.accent.rgb}, 0.1)` : 'transparent'
                  }}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: t.accent.color }}
                  ></div>
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Watchdog-Banner: ESP32 Warning/Critical */}
      {watchdogStatus.esp32 === 'warning' && (
        <div className="flex items-center gap-3 p-4 rounded-xl border animate-in fade-in duration-300"
          style={{
            backgroundColor: 'rgba(245, 158, 11, 0.08)',
            borderColor: 'rgba(245, 158, 11, 0.3)',
            color: colors.amber[400]
          }}>
          <Clock size={18} className="flex-shrink-0" />
          <span className="text-sm font-medium">
            Letzte Sensordaten vor {watchdogStatus.elapsedMs ? Math.round(watchdogStatus.elapsedMs / 1000) : '?'}s — ESP32 reagiert nicht.
          </span>
        </div>
      )}
      {watchdogStatus.esp32 === 'critical' && (
        <div className="flex items-center gap-3 p-4 rounded-xl border animate-pulse"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            borderColor: 'rgba(239, 68, 68, 0.3)',
            color: colors.red[400]
          }}>
          <AlertCircle size={18} className="flex-shrink-0" />
          <div className="text-sm font-medium">
            <span className="font-bold">ESP32 offline!</span> Keine Daten seit {watchdogStatus.elapsedMs ? Math.round(watchdogStatus.elapsedMs / 60000) : '?'} Minuten. Bitte Stromversorgung und WiFi prüfen.
          </div>
        </div>
      )}
      {watchdogStatus.mqtt === false && isConnected && watchdogStatus.esp32 !== 'unknown' && (
        <div className="flex items-center gap-3 p-4 rounded-xl border"
          style={{
            backgroundColor: 'rgba(249, 115, 22, 0.08)',
            borderColor: 'rgba(249, 115, 22, 0.3)',
            color: colors.orange[400]
          }}>
          <AlertCircle size={18} className="flex-shrink-0" />
          <span className="text-sm font-medium">
            MQTT-Broker nicht verbunden — Sensordaten und Steuerbefehle sind nicht verfügbar.
          </span>
        </div>
      )}

      {/* Top Welcome Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div
          className="lg:col-span-2 p-6 md:p-8 rounded-3xl border border-opacity-50 relative overflow-hidden shadow-2xl group"
          style={{
            background: currentTheme.components.welcomeGradient,
            borderColor: currentTheme.border.default
          }}
        >
          <div
            className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none transition-opacity duration-1000 group-hover:opacity-100 opacity-75"
            style={{ backgroundColor: `rgba(${currentTheme.accent.rgb}, 0.1)` }}
          ></div>
          <div className="relative z-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: currentTheme.text.primary }}>
              Hallo Grower! 🌱
            </h2>
            <p className="mb-6 md:mb-8 max-w-lg text-base md:text-lg leading-relaxed" style={{ color: currentTheme.text.secondary }}>
              Systemstatus: <span className="font-bold" style={{ color: currentTheme.accent.light }}>{healthScore}% Effizienz</span>.
              Alles bereit für optimales Wachstum.
            </p>
            <div className="flex flex-wrap gap-3 md:gap-4">
              <button
                onClick={() => changeTab('plants')}
                className="px-5 md:px-6 py-2.5 md:py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 text-white hover:brightness-110"
                style={{
                  background: `linear-gradient(to right, ${currentTheme.accent.color}, ${currentTheme.accent.dark})`,
                  boxShadow: `0 10px 20px rgba(${currentTheme.accent.rgb}, 0.2)`
                }}
              >
                Pflanzen <ArrowRight size={20} />
              </button>
              <button
                onClick={() => changeTab('analytics')}
                className="px-5 md:px-6 py-2.5 md:py-3 rounded-xl font-bold transition-all border hover:brightness-110"
                style={{
                  backgroundColor: currentTheme.bg.card,
                  borderColor: currentTheme.border.default,
                  color: currentTheme.text.primary
                }}
              >
                Analyse
              </button>
            </div>
          </div>
        </div>

        {/* Health Card */}
        <div
          className="p-5 md:p-6 rounded-3xl border shadow-xl flex flex-col justify-between relative overflow-hidden min-h-[280px]"
          style={{
            backgroundColor: currentTheme.bg.card,
            borderColor: currentTheme.border.default
          }}
        >
           <div className="flex justify-between items-start z-10">
             <div>
               <h3
                 className="font-bold text-xs uppercase tracking-widest mb-1"
                 style={{ color: currentTheme.text.secondary }}
               >
                 Status
               </h3>
               <div
                 className="text-sm font-bold flex items-center gap-2"
                 style={{ color: isConnected ? currentTheme.accent.light : colors.red[400] }}
               >
                 <span
                   className={`w-2 h-2 rounded-full ${isConnected ? 'animate-pulse' : ''}`}
                   style={{ backgroundColor: isConnected ? currentTheme.accent.color : colors.red[500] }}
                 ></span>
                 {isConnected ? 'Online' : 'Offline'}
               </div>
             </div>
             <div
               className="p-2 rounded-lg border"
               style={{
                 backgroundColor: currentTheme.bg.main,
                 borderColor: currentTheme.border.default
               }}
             >
               {healthScore === 100 ?
                 <CheckCircle2 style={{ color: currentTheme.accent.color }} /> :
                 <AlertCircle className="text-amber-500" />
               }
             </div>
           </div>
           <div className="mt-6 z-10">
             <div className="flex items-end gap-2 mb-2">
               <span className="text-4xl md:text-5xl font-black" style={{ color: currentTheme.text.primary }}>
                 {healthScore}
               </span>
               <span className="text-xl mb-1 font-bold" style={{ color: currentTheme.text.secondary }}>%</span>
             </div>
             <div
               className="w-full h-3 rounded-full overflow-hidden border"
               style={{
                 backgroundColor: currentTheme.bg.main,
                 borderColor: currentTheme.border.default
               }}
             >
               <div
                 className="h-full rounded-full transition-all duration-1000"
                 style={{
                   width: `${healthScore}%`,
                   backgroundColor: healthScore > 80 ? currentTheme.accent.color : colors.amber[500]
                 }}
               ></div>
             </div>
           </div>
           <div className="mt-4 space-y-2 z-10">
             {activeAlerts.map((alert, idx) => (
               <div
                 key={idx}
                 className="text-xs px-2 py-1 rounded border flex items-center gap-2"
                 style={{
                   backgroundColor: 'rgba(245, 158, 11, 0.1)',
                   color: colors.amber[400],
                   borderColor: 'rgba(245, 158, 11, 0.2)'
                 }}
               >
                 <AlertCircle size={12} /> {alert.msg}
               </div>
             ))}
             {activeAlerts.length === 0 && (
               <div className="text-xs" style={{ color: currentTheme.text.secondary }}>
                 Keine Warnungen
               </div>
             )}
           </div>
        </div>
      </div>

      {/* Customizable Widget System */}
      {!isLoading && isConnected && (
        <WidgetSystem
          theme={currentTheme}
          sensorData={{
            temp: avgTemp,
            humidity: avgHumidity,
            lux: sensorData?.lux
          }}
        />
      )}

      {/* Stats Grid Skeleton while loading */}
      {(isLoading || !isConnected) && (
        <>
          {!isConnected && !isLoading && (
            <div className="flex items-center gap-3 p-4 rounded-xl border"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                borderColor: 'rgba(239, 68, 68, 0.2)',
                color: colors.red[400]
              }}>
              <AlertCircle size={18} />
              <span className="text-sm font-medium">Keine Verbindung zum ESP32. Stelle sicher, dass das Backend läuft und der Controller verbunden ist.</span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <Skeleton.StatCard theme={currentTheme} />
            <Skeleton.StatCard theme={currentTheme} />
            <Skeleton.StatCard theme={currentTheme} />
            <Skeleton.StatCard theme={currentTheme} />
          </div>
        </>
      )}

      {/* Quick Actions Bar */}
      <QuickActionsBar
        theme={currentTheme}
        changeTab={changeTab}
        onRefresh={loadDashboardData}
      />

      {/* Harvest Countdown - Show for first active plant */}
      {plants && plants.length > 0 && plants[0].growStartDate && (
        <HarvestCountdown plant={plants[0]} />
      )}

      {/* Smart Suggestions */}
      <SmartSuggestionsEngine compact />

      {/* Middle Section: Chart & Weather - Improved responsive layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
        {/* Live Chart Area */}
        <div
          className="xl:col-span-2 rounded-3xl p-4 md:p-6 shadow-xl flex flex-col border"
          style={{
            backgroundColor: currentTheme.bg.card,
            borderColor: currentTheme.border.default,
            minHeight: '400px'
          }}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
            <h3
              className="font-bold flex items-center gap-2 text-base md:text-lg"
              style={{ color: currentTheme.text.primary }}
            >
              <Activity style={{ color: currentTheme.accent.color }} size={20} /> Klima Verlauf
            </h3>
            <span
              className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded"
              style={{
                color: currentTheme.accent.light,
                backgroundColor: `rgba(${currentTheme.accent.rgb}, 0.1)`
              }}
            >
              Live
            </span>
          </div>
          <div
            className="flex-1 w-full h-[240px] rounded-2xl border border-opacity-50 p-2"
            style={{
              backgroundColor: `rgba(${currentTheme.accent.rgb}, 0.02)`,
              borderColor: currentTheme.border.light
            }}
          >
            <LiveChart theme={currentTheme} />
          </div>
        </div>

        {/* Weather & Camera - Improved stacking on mobile */}
        <div className="xl:col-span-1 flex flex-col gap-4 md:gap-6">
           <div className="min-h-[350px]">
             <WeatherWidget theme={currentTheme} />
           </div>
           <div className="min-h-[300px]">
             <CameraFeed theme={currentTheme} />
           </div>
        </div>
      </div>

      {/* Next Task Widget - Better mobile layout */}
      <div
        className="rounded-3xl p-5 md:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6 border"
        style={{
          backgroundColor: currentTheme.bg.card,
          borderColor: currentTheme.border.default
        }}
      >
        <div>
          <h3
            className="font-bold flex items-center gap-2 mb-1"
            style={{ color: currentTheme.text.primary }}
          >
            <Calendar className="text-purple-500" size={20} /> Nächstes Event
          </h3>
          <p className="text-sm" style={{ color: currentTheme.text.secondary }}>
            Behalte den Überblick über deine Aufgaben.
          </p>
        </div>

        {nextEvent ? (
          <div
            className="flex-1 p-4 rounded-2xl flex items-center gap-4 w-full md:w-auto border"
            style={{
              backgroundColor: currentTheme.bg.main,
              borderColor: currentTheme.border.default
            }}
          >
            <div
              className="p-3 rounded-xl border"
              style={{
                backgroundColor: 'rgba(168, 85, 247, 0.1)',
                color: colors.purple[400],
                borderColor: 'rgba(168, 85, 247, 0.2)'
              }}
            >
              <Leaf size={24}/>
            </div>
            <div className="flex-1">
              <div className="font-bold" style={{ color: currentTheme.text.primary }}>
                {nextEvent.title}
              </div>
              <div className="text-xs" style={{ color: currentTheme.text.secondary }}>
                {new Date(nextEvent.date).toLocaleDateString()} • {nextEvent.type}
              </div>
            </div>
            <div
              className="px-3 py-1 rounded-lg text-xs font-bold border"
              style={{
                backgroundColor: currentTheme.bg.card,
                color: colors.amber[400],
                borderColor: currentTheme.border.default
              }}
            >
              Offen
            </div>
          </div>
        ) : (
          <button
            onClick={() => changeTab('calendar')}
            className="px-5 md:px-6 py-2.5 md:py-3 rounded-xl text-sm font-bold flex items-center gap-2 border transition-all hover:brightness-110"
            style={{
              backgroundColor: currentTheme.bg.main,
              borderColor: currentTheme.border.default,
              color: currentTheme.text.secondary
            }}
          >
            <Clock size={16} /> Aufgabe planen
          </button>
        )}
      </div>
    </div>
  );
}