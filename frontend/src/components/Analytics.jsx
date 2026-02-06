import React, { useEffect, useState, useMemo } from 'react';
import { api, plantsAPI, dataAPI } from '../utils/api';
import { useTheme, colors as importedColors } from '../theme'; // Umbenannt für Safety-Merge
import ReportGenerator from './ReportGenerator';
import { convertToPercent } from '../utils/soilCalibration';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, AreaChart, Area, Brush, BarChart, Bar, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, ScatterChart, Scatter, ZAxis, Cell,
  ComposedChart, ReferenceLine, ReferenceArea, PieChart, Pie, Funnel, FunnelChart,
  RadialBarChart, RadialBar, Treemap
} from 'recharts';
import {
  Calculator, Zap, Coins, Clock, AlertTriangle, RefreshCw, Activity,
  ThermometerSun, Droplets, TrendingUp, TrendingDown, Minus, Download,
  Share2, FileText, Calendar, Target, Award, Leaf, Sun, CloudRain,
  Wind, Gauge, BarChart3, PieChart as PieChartIcon, Grid3x3, Sparkles, Brain, Flame,
  Layers, GitCompare, Waves, Box, CircleDot, Timer, Sigma, ArrowUpDown,
  Filter, SlidersHorizontal, LineChart as LineChartIcon, Database, TrendingUpDown
} from 'lucide-react';

// ==================== SAFETY COLORS FIX ====================
// Verhindert den Absturz "Cannot read properties of undefined (reading '500')"
// Falls eine Farbe im Theme fehlt, wird dieser Standardwert genutzt.
const FALLBACK_COLORS = {
  emerald: { 400: '#34d399', 500: '#10b981' },
  red: { 200: '#fecaca', 400: '#f87171', 500: '#ef4444' },
  amber: { 400: '#fbbf24', 500: '#f59e0b' },
  blue: { 400: '#60a5fa', 500: '#3b82f6' },
  purple: { 400: '#c084fc', 500: '#a855f7' },
  yellow: { 500: '#eab308' },
  pink: { 500: '#ec4899' },
  slate: { 500: '#64748b' },
};

// Merge: Priorisiere importierte Farben, fülle Lücken mit Fallback auf
const colors = { ...FALLBACK_COLORS, ...(importedColors || {}) };

// Hilfsfunktion für sicheren Farbzugriff
const getSafeColor = (colorName, weight) => {
  return colors?.[colorName]?.[weight] || '#888888'; 
};
// ===========================================================


// ==================== HILFSFUNKTIONEN ====================

// Zeitachsen-Formatierung je nach gewähltem Zeitraum
const formatTimeAxis = (timestamp, hours) => {
  const d = new Date(timestamp);
  if (hours > 24) {
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + ' ' +
           d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
};

// Berechne lineare Regression (Trend)
const calculateLinearRegression = (data, key) => {
  if (!data || data.length < 2) return null;

  const validData = data.filter(d => d[key] !== null && d[key] !== undefined);
  if (validData.length < 2) return null;

  const n = validData.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  validData.forEach((d, i) => {
    sumX += i;
    sumY += d[key];
    sumXY += i * d[key];
    sumX2 += i * i;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept, trend: slope > 0 ? 'steigend' : slope < 0 ? 'fallend' : 'stabil' };
};

// Export zu CSV
const exportToCSV = (data, filename = 'grow_data.csv') => {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(key => row[key] ?? '').join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};

// Export zu JSON
const exportToJSON = (data, filename = 'grow_data.json') => {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};

// Berechne Perzentile
const calculatePercentile = (data, key, percentile) => {
  const values = data.map(d => d[key]).filter(v => v !== null && v !== undefined).sort((a, b) => a - b);
  if (values.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * values.length) - 1;
  return values[Math.max(0, index)];
};

// ==================== SUB-KOMPONENTEN ====================

// Mini Stat Card
const MiniStatCard = ({ label, value, unit, trend, icon: Icon, iconColor, theme }) => (
  <div
    className="p-4 rounded-xl border transition-all hover:scale-105"
    style={{
      backgroundColor: theme.bg.card,
      borderColor: theme.border.default
    }}
  >
    <div className="flex items-center justify-between mb-2">
      <div className="p-2 rounded-lg" style={{ backgroundColor: `${iconColor}20` }}>
        <Icon size={16} style={{ color: iconColor }} />
      </div>
      {trend !== undefined && (
        <div
          className="flex items-center gap-1 text-xs font-bold"
          style={{
            color: trend > 0 ? getSafeColor('emerald', 400) : trend < 0 ? getSafeColor('red', 400) : theme.text.muted
          }}
        >
          {trend > 0 ? <TrendingUp size={12} /> : trend < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
          {Math.abs(trend).toFixed(1)}%
        </div>
      )}
    </div>
    <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: theme.text.muted }}>
      {label}
    </div>
    <div className="flex items-baseline gap-1">
      <div className="text-2xl font-bold" style={{ color: theme.text.primary }}>{value}</div>
      <div className="text-sm" style={{ color: theme.text.muted }}>{unit}</div>
    </div>
  </div>
);

// DLI Card (Daily Light Integral)
const DLICard = ({ luxData, theme }) => {
  // DLI = (Average Lux × Hours of Light × 0.0036) / 1000
  // Simplified: avg lux over 18h light cycle
  const avgLux = luxData.length > 0
    ? luxData.reduce((sum, d) => sum + (d.lux || 0), 0) / luxData.length
    : 0;
  const hoursOfLight = 18; // Annahme
  const dli = (avgLux * hoursOfLight * 0.0036) / 1000;

  const getDLIRating = (dli) => {
    if (dli < 15) return { label: 'Niedrig', color: getSafeColor('red', 400), desc: 'Erhöhe Lichtintensität' };
    if (dli < 30) return { label: 'Optimal (Veg)', color: getSafeColor('emerald', 400), desc: 'Perfekt für Wachstum' };
    if (dli < 45) return { label: 'Optimal (Bloom)', color: getSafeColor('purple', 400), desc: 'Perfekt für Blüte' };
    return { label: 'Sehr Hoch', color: getSafeColor('amber', 400), desc: 'Risiko von Stress' };
  };

  const rating = getDLIRating(dli);

  return (
    <div
      className="p-6 rounded-2xl border shadow-xl relative overflow-hidden"
      style={{
        backgroundColor: theme.bg.card,
        borderColor: theme.border.default
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 rounded-xl" style={{ backgroundColor: `${rating.color}20` }}>
          <Sun size={24} style={{ color: rating.color }} />
        </div>
        <div>
          <h3 className="font-bold" style={{ color: theme.text.primary }}>DLI Calculator</h3>
          <p className="text-xs" style={{ color: theme.text.muted }}>Daily Light Integral</p>
        </div>
      </div>

      <div className="flex items-end gap-2 mb-3">
        <div className="text-5xl font-black" style={{ color: rating.color }}>
          {dli.toFixed(1)}
        </div>
        <div className="text-xl mb-2 font-bold" style={{ color: theme.text.muted }}>mol/m²/d</div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="px-3 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: `${rating.color}20`, color: rating.color }}>
          {rating.label}
        </div>
        <div className="text-xs" style={{ color: theme.text.muted }}>{rating.desc}</div>
      </div>

      <div className="text-xs p-3 rounded-lg" style={{ backgroundColor: theme.bg.hover, color: theme.text.muted }}>
        💡 Optimal: 15-30 (Veg), 30-45 (Bloom)
      </div>
    </div>
  );
};

// Anomaly Alert Card
const AnomalyCard = ({ anomalies, theme }) => {
  if (anomalies.length === 0) return null;

  return (
    <div
      className="p-4 rounded-xl border"
      style={{
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: 'rgba(239, 68, 68, 0.3)'
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={20} style={{ color: getSafeColor('red', 400) }} />
        <h3 className="font-bold" style={{ color: getSafeColor('red', 200) }}>Anomalien erkannt</h3>
      </div>
      <div className="space-y-2">
        {anomalies.map((anom, idx) => (
          <div key={idx} className="text-xs p-2 rounded" style={{ backgroundColor: theme.bg.card, color: theme.text.secondary }}>
            • {anom.message} <span className="font-mono" style={{ color: getSafeColor('red', 400) }}>({anom.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Growth Tracker Card
const GrowthTrackerCard = ({ startDate, currentDay, estimatedHarvest, phase, theme }) => {
  const progress = (currentDay / estimatedHarvest) * 100;

  return (
    <div
      className="p-6 rounded-2xl border shadow-xl"
      style={{
        backgroundColor: theme.bg.card,
        borderColor: theme.border.default
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 rounded-xl" style={{ backgroundColor: `${theme.accent.color}20` }}>
          <Leaf size={24} style={{ color: theme.accent.color }} />
        </div>
        <div>
          <h3 className="font-bold" style={{ color: theme.text.primary }}>Wachstums-Tracker</h3>
          <p className="text-xs" style={{ color: theme.text.muted }}>Phase: {phase}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm" style={{ color: theme.text.muted }}>Tag {currentDay} von {estimatedHarvest}</span>
          <span className="text-sm font-bold" style={{ color: theme.accent.color }}>{progress.toFixed(0)}%</span>
        </div>

        <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: theme.bg.hover }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(to right, ${theme.accent.color}, ${theme.accent.dark})`
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t" style={{ borderColor: theme.border.default }}>
          <div>
            <div className="text-xs" style={{ color: theme.text.muted }}>Start</div>
            <div className="font-mono text-sm" style={{ color: theme.text.primary }}>
              {new Date(startDate).toLocaleDateString()}
            </div>
          </div>
          <div>
            <div className="text-xs" style={{ color: theme.text.muted }}>Est. Ernte</div>
            <div className="font-mono text-sm" style={{ color: getSafeColor('emerald', 400) }}>
              {new Date(new Date(startDate).getTime() + estimatedHarvest * 24 * 60 * 60 * 1000).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Heatmap Component (24h Pattern)
const HeatmapChart = ({ data, metric, theme }) => {
  // Group data by hour (0-23)
  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const hourData = data.filter(d => {
      const h = new Date(d.timestamp).getHours();
      return h === hour;
    });

    const avg = hourData.length > 0
      ? hourData.reduce((sum, d) => sum + (d[metric] || 0), 0) / hourData.length
      : 0;

    return { hour, value: avg };
  });

  const maxValue = Math.max(...hourlyData.map(d => d.value));

  return (
    <div className="grid grid-cols-12 gap-1">
      {hourlyData.map((d, idx) => {
        const intensity = maxValue > 0 ? d.value / maxValue : 0;
        const color = intensity > 0.66 ? getSafeColor('red', 500) : intensity > 0.33 ? getSafeColor('amber', 500) : getSafeColor('emerald', 500);

        return (
          <div
            key={idx}
            className="aspect-square rounded flex items-center justify-center text-xs font-mono transition-all hover:scale-110"
            style={{
              backgroundColor: `${color}${Math.round(intensity * 255).toString(16).padStart(2, '0')}`,
              color: intensity > 0.5 ? '#ffffff' : theme.text.muted
            }}
            title={`${d.hour}:00 - ${d.value.toFixed(1)}`}
          >
            {d.hour}
          </div>
        );
      })}
    </div>
  );
};

// GitHub-Style Activity Calendar (letzte 12 Wochen)
const ActivityCalendar = ({ data, theme }) => {
  const weeksToShow = 12;
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (weeksToShow * 7));

  // Erstelle Array mit allen Tagen
  const days = [];
  const currentDate = new Date(startDate);

  while (currentDate <= today) {
    const dayData = data.filter(d => {
      const dDate = new Date(d.timestamp);
      return dDate.toDateString() === currentDate.toDateString();
    });

    // Berechne "Aktivitäts-Score" für den Tag (basierend auf Daten-Anzahl und Klima-Qualität)
    let score = 0;
    if (dayData.length > 0) {
      const avgTemp = dayData.reduce((s, d) => s + (d.temp || 0), 0) / dayData.length;
      const avgHum = dayData.reduce((s, d) => s + (d.humidity || 0), 0) / dayData.length;

      // Score: Daten vorhanden (0-25) + Klima optimal (0-75)
      const dataScore = Math.min(25, dayData.length / 2); // 50+ Messungen = volle Punkte
      const tempScore = avgTemp >= 20 && avgTemp <= 28 ? 35 : 15;
      const humScore = avgHum >= 50 && avgHum <= 70 ? 40 : 20;
      score = dataScore + tempScore + humScore;
    }

    days.push({
      date: new Date(currentDate),
      score: Math.round(score),
      count: dayData.length
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Gruppiere in Wochen
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const getColor = (score) => {
    if (score === 0) return theme.bg.hover;
    if (score >= 90) return getSafeColor('emerald', 500);
    if (score >= 70) return getSafeColor('emerald', 600);
    if (score >= 50) return getSafeColor('amber', 600);
    if (score >= 30) return getSafeColor('amber', 700);
    return getSafeColor('red', 600);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1 text-xs" style={{ color: theme.text.muted }}>
        <div className="w-8">Mo</div>
        <div className="w-8">Mi</div>
        <div className="w-8">Fr</div>
        <div className="w-8">So</div>
      </div>
      <div className="flex gap-1">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="flex flex-col gap-1">
            {week.map((day, dayIdx) => {
              const isToday = day.date.toDateString() === today.toDateString();
              return (
                <div
                  key={dayIdx}
                  className="w-3 h-3 rounded-sm transition-all hover:scale-150 cursor-pointer"
                  style={{
                    backgroundColor: getColor(day.score),
                    border: isToday ? `2px solid ${theme.accent.color}` : 'none'
                  }}
                  title={`${day.date.toLocaleDateString('de-DE')}\nScore: ${day.score}/100\n${day.count} Messungen`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs pt-2" style={{ color: theme.text.muted }}>
        <span>Weniger</span>
        <div className="flex gap-1">
          {[0, 30, 50, 70, 90].map(score => (
            <div key={score} className="w-3 h-3 rounded-sm" style={{ backgroundColor: getColor(score) }} />
          ))}
        </div>
        <span>Mehr</span>
      </div>
    </div>
  );
};

// Gauge Chart Component (Radial Progress)
const GaugeChart = ({ value, max, label, unit, theme, color }) => {
  const percentage = (value / max) * 100;
  const data = [
    { name: label, value: percentage, fill: color },
    { name: 'Rest', value: 100 - percentage, fill: theme.bg.hover }
  ];

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={200}>
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="70%"
          outerRadius="100%"
          data={data}
          startAngle={180}
          endAngle={0}
        >
          <PolarGrid gridType="circle" />
          <RadialBar
            minAngle={15}
            background
            clockWise
            dataKey="value"
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-bold" style={{ color: theme.text.primary }}>
          {value.toFixed(1)}
        </div>
        <div className="text-sm" style={{ color: theme.text.muted }}>{unit}</div>
      </div>
    </div>
  );
};

// Box Plot Simulation (Min, Q1, Median, Q3, Max)
const BoxPlotCard = ({ data, metric, label, theme }) => {
  const values = data.map(d => d[metric]).filter(v => v !== null && v !== undefined).sort((a, b) => a - b);

  if (values.length === 0) return null;

  const min = values[0];
  const max = values[values.length - 1];
  const median = values[Math.floor(values.length / 2)];
  const q1 = values[Math.floor(values.length * 0.25)];
  const q3 = values[Math.floor(values.length * 0.75)];
  const iqr = q3 - q1;

  const boxData = [
    { category: label, min, q1, median, q3, max, iqr }
  ];

  return (
    <div className="p-4 rounded-xl border" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
      <h4 className="font-bold mb-3 text-sm" style={{ color: theme.text.primary }}>{label}</h4>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span style={{ color: theme.text.muted }}>Min</span>
          <span className="font-mono" style={{ color: theme.text.primary }}>{min.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span style={{ color: theme.text.muted }}>Q1 (25%)</span>
          <span className="font-mono" style={{ color: theme.text.primary }}>{q1.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs font-bold">
          <span style={{ color: theme.accent.color }}>Median</span>
          <span className="font-mono" style={{ color: theme.accent.color }}>{median.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span style={{ color: theme.text.muted }}>Q3 (75%)</span>
          <span className="font-mono" style={{ color: theme.text.primary }}>{q3.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span style={{ color: theme.text.muted }}>Max</span>
          <span className="font-mono" style={{ color: theme.text.primary }}>{max.toFixed(2)}</span>
        </div>
        <div className="pt-2 border-t" style={{ borderColor: theme.border.default }}>
          <div className="flex justify-between text-xs">
            <span style={{ color: theme.text.muted }}>IQR (Streuung)</span>
            <span className="font-mono" style={{ color: theme.text.primary }}>{iqr.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Visual Box Plot */}
      <div className="mt-4 relative h-12">
        <div className="absolute inset-x-0 top-1/2 h-1" style={{ backgroundColor: theme.border.default }}>
          <div
            className="absolute h-1"
            style={{
              left: `${((q1 - min) / (max - min)) * 100}%`,
              right: `${((max - q3) / (max - min)) * 100}%`,
              backgroundColor: theme.accent.color
            }}
          />
        </div>
        <div
          className="absolute top-0 w-1 h-full"
          style={{ left: `${((median - min) / (max - min)) * 100}%`, backgroundColor: getSafeColor('red', 500) }}
        />
      </div>
    </div>
  );
};

// Radar Chart für tägliche Durchschnitte
const DailyPatternRadar = ({ data, theme }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const radarData = hours.map(hour => {
    const hourData = data.filter(d => new Date(d.timestamp).getHours() === hour);

    const avgTemp = hourData.length > 0
      ? hourData.reduce((s, d) => s + (d.temp || 0), 0) / hourData.length
      : 0;
    const avgHum = hourData.length > 0
      ? hourData.reduce((s, d) => s + (d.humidity || 0), 0) / hourData.length
      : 0;
    const avgVpd = hourData.length > 0
      ? hourData.reduce((s, d) => s + (d.vpd || 0), 0) / hourData.length
      : 0;

    return {
      hour: `${hour}h`,
      temp: parseFloat(avgTemp.toFixed(1)),
      humidity: parseFloat(avgHum.toFixed(1)),
      vpd: parseFloat((avgVpd * 10).toFixed(1)) // Scale VPD für bessere Visualisierung
    };
  });

  return (
    <ResponsiveContainer width="100%" height={400}>
      <RadarChart data={radarData}>
        <PolarGrid stroke={theme.border.default} />
        <PolarAngleAxis dataKey="hour" stroke={theme.text.muted} fontSize={10} />
        <PolarRadiusAxis angle={90} stroke={theme.text.muted} fontSize={10} />
        <Radar name="Temperatur" dataKey="temp" stroke={getSafeColor('amber', 500)} fill={getSafeColor('amber', 500)} fillOpacity={0.3} />
        <Radar name="Luftfeuchte" dataKey="humidity" stroke={getSafeColor('blue', 500)} fill={getSafeColor('blue', 500)} fillOpacity={0.3} />
        <Radar name="VPD x10" dataKey="vpd" stroke={getSafeColor('emerald', 500)} fill={getSafeColor('emerald', 500)} fillOpacity={0.3} />
        <Legend />
        <Tooltip contentStyle={{ backgroundColor: theme.bg.card, borderColor: theme.border.default, borderRadius: '8px' }} />
      </RadarChart>
    </ResponsiveContainer>
  );
};

// Distribution Pie Chart
const DistributionPieChart = ({ data, metric, label, theme }) => {
  const values = data.map(d => d[metric]).filter(v => v !== null && v !== undefined);

  if (values.length === 0) return null;

  // Erstelle Kategorien basierend auf dem Metric
  let categories = [];
  if (metric === 'temp') {
    categories = [
      { name: 'Kalt (<20°C)', range: [0, 20], color: getSafeColor('blue', 500) },
      { name: 'Optimal (20-28°C)', range: [20, 28], color: getSafeColor('emerald', 500) },
      { name: 'Warm (>28°C)', range: [28, 100], color: getSafeColor('red', 500) }
    ];
  } else if (metric === 'humidity') {
    categories = [
      { name: 'Trocken (<50%)', range: [0, 50], color: getSafeColor('amber', 500) },
      { name: 'Optimal (50-70%)', range: [50, 70], color: getSafeColor('emerald', 500) },
      { name: 'Feucht (>70%)', range: [70, 100], color: getSafeColor('blue', 500) }
    ];
  } else if (metric === 'vpd') {
    categories = [
      { name: 'Niedrig (<0.8)', range: [0, 0.8], color: getSafeColor('blue', 500) },
      { name: 'Optimal (0.8-1.2)', range: [0.8, 1.2], color: getSafeColor('emerald', 500) },
      { name: 'Hoch (>1.2)', range: [1.2, 10], color: getSafeColor('red', 500) }
    ];
  }

  const pieData = categories.map(cat => ({
    name: cat.name,
    value: values.filter(v => v >= cat.range[0] && v < cat.range[1]).length,
    fill: cat.color
  }));

  return (
    <div className="p-4 rounded-xl border" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
      <h4 className="font-bold mb-3" style={{ color: theme.text.primary }}>{label} Verteilung</h4>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            dataKey="value"
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: theme.bg.card, borderColor: theme.border.default, borderRadius: '8px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// Trend Line Chart mit Regression
const TrendLineChart = ({ data, metric, label, theme }) => {
  const regression = calculateLinearRegression(data, metric);

  if (!regression) return null;

  const trendData = data.map((d, i) => ({
    ...d,
    trend: regression.intercept + regression.slope * i
  }));

  return (
    <div className="p-4 rounded-xl border" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-bold" style={{ color: theme.text.primary }}>{label} mit Trendlinie</h4>
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1" style={{ color: regression.slope > 0 ? getSafeColor('emerald', 400) : getSafeColor('red', 400) }}>
            {regression.slope > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span className="font-bold">{regression.trend}</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={trendData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.border.default} vertical={false} />
          <XAxis
            dataKey="timestamp"
            stroke={theme.text.muted}
            fontSize={11}
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(ts) => formatTimeAxis(ts, timeRange)}
          />
          <YAxis stroke={theme.text.muted} fontSize={11} />
          <Tooltip contentStyle={{ backgroundColor: theme.bg.card, borderColor: theme.border.default, borderRadius: '8px' }} />
          <Area type="monotone" dataKey={metric} fill={`${theme.accent.color}30`} stroke="none" />
          <Line type="monotone" dataKey={metric} stroke={theme.accent.color} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="trend" stroke={getSafeColor('red', 500)} strokeWidth={2} strokeDasharray="5 5" dot={false} name="Trend" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// ==================== HAUPT KOMPONENTE ====================

export default function Analytics() {
  const { currentTheme } = useTheme();
  const theme = currentTheme;

  const [rawData, setRawData] = useState([]);
  const [logs, setLogs] = useState([]);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Settings
  const [timeRange, setTimeRange] = useState(24);
  const [activeView, setActiveView] = useState('overview'); // overview, advanced, heatmaps, insights, comparison, statistics
  const [powerConfig, setPowerConfig] = useState({
    price: 0.35,
    watts: 250,
    hours: 18
  });

  // Comparison Mode
  const [comparisonRange1, setComparisonRange1] = useState(24);
  const [comparisonRange2, setComparisonRange2] = useState(168); // 7 days

  // Filter & Export
  const [selectedMetrics, setSelectedMetrics] = useState(['temp', 'humidity', 'vpd', 'lux']);

  // Visibility toggles
  const [visibility, setVisibility] = useState({
    temp: true,
    humidity: true,
    vpd: false,
    lux: true,
    soil1: true, soil2: true, soil3: true, soil4: true, soil5: true, soil6: true,
    tank: true,
    gas: false
  });

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 60000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      setError(null);
      if (!api) throw new Error("API Service nicht verfügbar");

      // Aggregierten Endpoint nutzen — serverseitiges Downsampling
      const pointsForRange = timeRange <= 1 ? 120 : timeRange <= 6 ? 240 : 300;

      const [historyRes, logData, plantData] = await Promise.all([
        api.getAggregatedHistory({ hours: timeRange, points: pointsForRange }).catch(e => {
          console.warn('Aggregation nicht verfügbar, Fallback auf getHistory:', e);
          return null;
        }),
        api.getLogs().catch(e => []),
        api.getPlants().catch(e => [])
      ]);

      // Falls Aggregation fehlschlägt → Fallback auf alten Endpoint
      let history;
      let isAggregated = false;
      if (historyRes?.data && Array.isArray(historyRes.data)) {
        history = historyRes.data;
        isAggregated = true;
      } else {
        const fallback = await api.getHistory({ hours: timeRange, limit: 2000 }).catch(e => []);
        history = fallback?.data || fallback || [];
      }

      if (!Array.isArray(history)) {
        setRawData([]);
        setLoading(false);
        return;
      }

      let processed;
      if (isAggregated) {
        // Aggregierte Daten: Felder liegen direkt auf Top-Level (temp, humidity, lux, ...)
        processed = history.map(entry => {
          const T = entry.temp || 0;
          const RH = entry.humidity || 0;
          const SVP = T > 0 ? 0.61078 * Math.exp((17.27 * T) / (T + 237.3)) : 0;
          const VPD = T > 0 && RH > 0 ? SVP * (1 - RH / 100) : 0;
          const soil = Array.isArray(entry.soilMoisture) ? entry.soilMoisture : [0, 0, 0, 0, 0, 0];
          const ts = new Date(entry.timestamp).getTime();

          return {
            timestamp: ts,
            dateStr: new Date(ts).toLocaleString(),
            timeStr: new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            temp: T > 0 ? parseFloat(T.toFixed(1)) : null,
            temp_min: entry.temp_min ?? null,
            temp_max: entry.temp_max ?? null,
            humidity: RH > 0 ? parseFloat(RH.toFixed(1)) : null,
            humidity_min: entry.humidity_min ?? null,
            humidity_max: entry.humidity_max ?? null,
            vpd: VPD > 0 ? parseFloat(VPD.toFixed(2)) : 0,
            lux: entry.lux != null ? Math.round(entry.lux) : null,
            tankLevel: entry.tankLevel != null ? Math.round(entry.tankLevel) : null,
            gasLevel: entry.gasLevel != null ? Math.round(entry.gasLevel) : null,
            soil1: convertToPercent(soil[0], 1),
            soil2: convertToPercent(soil[1], 2),
            soil3: convertToPercent(soil[2], 3),
            soil4: convertToPercent(soil[3], 4),
            soil5: convertToPercent(soil[4], 5),
            soil6: convertToPercent(soil[5], 6),
          };
        });
      } else {
        // Fallback: Nicht-aggregierte Rohdaten (altes Format mit entry.readings)
        processed = history
          .filter(entry => entry && entry.readings)
          .map(entry => {
            const r = entry.readings;
            const soil = Array.isArray(r.soilMoisture) ? r.soilMoisture : [0, 0, 0, 0, 0, 0];
            const temps = [r.temp_bottom, r.temp_middle, r.temp_top].filter(t => t != null && typeof t === 'number' && t > 0);
            const humidities = [r.humidity_bottom, r.humidity_middle, r.humidity_top].filter(h => h != null && typeof h === 'number' && h > 0);
            const T = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 0;
            const RH = humidities.length > 0 ? humidities.reduce((a, b) => a + b, 0) / humidities.length : 0;
            const SVP = 0.61078 * Math.exp((17.27 * T) / (T + 237.3));
            const VPD = SVP * (1 - RH / 100);

            return {
              timestamp: new Date(entry.timestamp).getTime(),
              dateStr: new Date(entry.timestamp).toLocaleString(),
              timeStr: new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              temp: T > 0 ? T : null,
              humidity: RH > 0 ? RH : null,
              vpd: VPD > 0 ? parseFloat(VPD.toFixed(2)) : 0,
              lux: typeof r.lux === 'number' ? r.lux : null,
              tankLevel: typeof r.tankLevel === 'number' ? r.tankLevel : null,
              gasLevel: typeof r.gasLevel === 'number' ? r.gasLevel : null,
              soil1: convertToPercent(soil[0], 1),
              soil2: convertToPercent(soil[1], 2),
              soil3: convertToPercent(soil[2], 3),
              soil4: convertToPercent(soil[3], 4),
              soil5: convertToPercent(soil[4], 5),
              soil6: convertToPercent(soil[5], 6),
            };
          });
      }

      processed.sort((a, b) => a.timestamp - b.timestamp);
      setRawData(processed);
      setLogs(logData || []);
      setPlants(plantData || []);
    } catch (error) {
      console.error("Fehler beim Laden:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Chart Data — bereits serverseitig aggregiert/geglättet
  const chartData = rawData;

  // Statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;

    const calcStats = (key) => {
      const values = chartData.map(d => d[key]).filter(v => v !== null && v !== undefined);
      if (values.length === 0) return { min: 0, max: 0, avg: 0 };
      return {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length
      };
    };

    return {
      temp: calcStats('temp'),
      humidity: calcStats('humidity'),
      vpd: calcStats('vpd'),
      lux: calcStats('lux')
    };
  }, [chartData]);

  // Anomaly Detection
  const anomalies = useMemo(() => {
    if (!stats) return [];
    const detected = [];

    if (stats.temp.max > 30) detected.push({ message: 'Temperatur zu hoch', value: `${stats.temp.max.toFixed(1)}°C` });
    if (stats.temp.min < 15) detected.push({ message: 'Temperatur zu niedrig', value: `${stats.temp.min.toFixed(1)}°C` });
    if (stats.humidity.max > 75) detected.push({ message: 'Luftfeuchte zu hoch', value: `${stats.humidity.max.toFixed(0)}%` });
    if (stats.humidity.min < 35) detected.push({ message: 'Luftfeuchte zu niedrig', value: `${stats.humidity.min.toFixed(0)}%` });
    if (stats.vpd.max > 1.6) detected.push({ message: 'VPD zu hoch (Stress)', value: `${stats.vpd.max.toFixed(2)} kPa` });

    return detected;
  }, [stats]);

  // Grow-Score Berechnung (0-100)
  const growScore = useMemo(() => {
    if (!stats || chartData.length === 0) return null;

    // 1. Klimastabilität (40 Punkte max)
    const tempVariance = stats.temp.max - stats.temp.min;
    const humVariance = stats.humidity.max - stats.humidity.min;
    const vpdVariance = stats.vpd.max - stats.vpd.min;

    // Perfekt: Temp±3°C, Hum±10%, VPD±0.3kPa
    const tempStability = Math.max(0, 100 - (tempVariance / 3) * 100) * 0.4;
    const humStability = Math.max(0, 100 - (humVariance / 10) * 100) * 0.4;
    const vpdStability = Math.max(0, 100 - (vpdVariance / 0.3) * 100) * 0.2;
    const stabilityScore = (tempStability + humStability + vpdStability) * 0.4;

    // 2. Optimale Range (30 Punkte max)
    const tempInRange = stats.temp.avg >= 20 && stats.temp.avg <= 28 ? 30 : 15;
    const humInRange = stats.humidity.avg >= 50 && stats.humidity.avg <= 70 ? 30 : 15;
    const vpdInRange = stats.vpd.avg >= 0.8 && stats.vpd.avg <= 1.2 ? 40 : 20;
    const rangeScore = (tempInRange + humInRange + vpdInRange) / 100 * 30;

    // 3. Anomalie-Abzug (30 Punkte max)
    const anomalyScore = Math.max(0, 30 - (anomalies.length * 6));

    const totalScore = Math.round(stabilityScore + rangeScore + anomalyScore);

    return {
      total: Math.max(0, Math.min(100, totalScore)),
      breakdown: {
        stability: Math.round(stabilityScore),
        range: Math.round(rangeScore),
        anomaly: Math.round(anomalyScore)
      }
    };
  }, [stats, anomalies, chartData]);

  // Power Costs
  const kwhPerDay = (powerConfig.watts / 1000) * powerConfig.hours;
  const costDay = kwhPerDay * powerConfig.price;
  const costMonth = costDay * 30;
  const costCycle = costDay * 100;

  const toggleLine = (key) => {
    setVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const TimeButton = ({ hours, label }) => (
    <button
      onClick={() => setTimeRange(hours)}
      className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
      style={{
        backgroundColor: timeRange === hours ? theme.accent.color : theme.bg.card,
        color: timeRange === hours ? '#ffffff' : theme.text.secondary,
        boxShadow: timeRange === hours ? `0 4px 12px rgba(${theme.accent.rgb}, 0.3)` : 'none'
      }}
    >
      {label}
    </button>
  );

  const ViewTab = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setActiveView(id)}
      className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
      style={{
        backgroundColor: activeView === id ? `${theme.accent.color}20` : 'transparent',
        color: activeView === id ? theme.accent.color : theme.text.muted,
        borderBottom: activeView === id ? `2px solid ${theme.accent.color}` : '2px solid transparent'
      }}
    >
      <Icon size={16} />
      {label}
    </button>
  );

  if (error) return (
    <div className="p-8 text-center rounded-xl m-4 border" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', color: getSafeColor('red', 400) }}>
      <AlertTriangle className="mx-auto mb-2" size={32} />
      <h3 className="font-bold mb-2">Verbindungsfehler</h3>
      <p className="text-sm mb-4">{error}</p>
      <button onClick={loadAllData} className="px-4 py-2 rounded-lg text-sm transition-colors" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}>
        Erneut versuchen
      </button>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">

      {/* Header */}
      <div
        className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 p-6 rounded-2xl border backdrop-blur-sm"
        style={{
          backgroundColor: theme.bg.card,
          borderColor: theme.border.default
        }}
      >
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: theme.text.primary }}>
            <BarChart3 style={{ color: theme.accent.color }} /> Analytics & Insights
          </h2>
          <p className="text-sm mt-1" style={{ color: theme.text.muted }}>
            {chartData.length} Datenpunkte • Letzte {timeRange}h
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex p-1 rounded-xl border" style={{ backgroundColor: theme.bg.main, borderColor: theme.border.default }}>
            <TimeButton hours={1} label="1h" />
            <TimeButton hours={3} label="3h" />
            <TimeButton hours={6} label="6h" />
            <TimeButton hours={12} label="12h" />
            <TimeButton hours={24} label="24h" />
            <TimeButton hours={72} label="3d" />
          </div>

          <div className="h-8 w-px" style={{ backgroundColor: theme.border.default }}></div>

          <div className="flex gap-2">
            <ReportGenerator historyData={rawData} logs={logs} plants={plants} growScore={growScore} />
            <button
              onClick={loadAllData}
              className="p-2.5 rounded-xl transition-colors"
              style={{
                backgroundColor: theme.bg.card,
                color: theme.text.muted
              }}
              title="Aktualisieren"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 border-b pb-2 overflow-x-auto" style={{ borderColor: theme.border.default }}>
        <ViewTab id="overview" label="Übersicht" icon={Grid3x3} />
        <ViewTab id="advanced" label="Erweitert" icon={Sparkles} />
        <ViewTab id="statistics" label="Statistiken" icon={Sigma} />
        <ViewTab id="comparison" label="Vergleich" icon={GitCompare} />
        <ViewTab id="heatmaps" label="Heatmaps" icon={Flame} />
        <ViewTab id="insights" label="Insights" icon={Brain} />
      </div>

      {loading && rawData.length === 0 ? (
        <div className="h-64 flex items-center justify-center animate-pulse" style={{ color: theme.text.muted }}>
          Lade Diagramme...
        </div>
      ) : (
        <>
          {/* OVERVIEW TAB */}
          {activeView === 'overview' && (
            <>
              {/* Stats Cards Row */}
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MiniStatCard
                    label="Temp Ø"
                    value={stats.temp.avg.toFixed(1)}
                    unit="°C"
                    trend={(stats.temp.avg - 24) / 24 * 100}
                    icon={ThermometerSun}
                    iconColor={getSafeColor('amber', 500)}
                    theme={theme}
                  />
                  <MiniStatCard
                    label="RLF Ø"
                    value={stats.humidity.avg.toFixed(0)}
                    unit="%"
                    trend={(stats.humidity.avg - 60) / 60 * 100}
                    icon={Droplets}
                    iconColor={getSafeColor('blue', 500)}
                    theme={theme}
                  />
                  <MiniStatCard
                    label="VPD Ø"
                    value={stats.vpd.avg.toFixed(2)}
                    unit="kPa"
                    trend={undefined}
                    icon={Wind}
                    iconColor={getSafeColor('emerald', 500)}
                    theme={theme}
                  />
                  <MiniStatCard
                    label="Lux Ø"
                    value={stats.lux.avg.toFixed(0)}
                    unit="lx"
                    trend={undefined}
                    icon={Sun}
                    iconColor={getSafeColor('yellow', 500)}
                    theme={theme}
                  />
                </div>
              )}

              {/* Anomalies */}
              <AnomalyCard anomalies={anomalies} theme={theme} />

              {/* Main Climate Chart */}
              <div className="p-4 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                <div className="flex justify-between items-center mb-6 px-2">
                  <h3 className="font-bold flex items-center gap-2" style={{ color: theme.text.primary }}>
                    <ThermometerSun style={{ color: getSafeColor('amber', 400) }} size={20} /> Klima & VPD
                  </h3>
                  <div className="flex gap-2 text-xs flex-wrap">
                    <button onClick={() => toggleLine('temp')} className="px-2 py-1 rounded border" style={{ backgroundColor: visibility.temp ? 'rgba(251, 191, 36, 0.2)' : theme.bg.hover, color: visibility.temp ? getSafeColor('amber', 400) : theme.text.muted, borderColor: visibility.temp ? 'rgba(251, 191, 36, 0.5)' : theme.border.default }}>Temp</button>
                    <button onClick={() => toggleLine('humidity')} className="px-2 py-1 rounded border" style={{ backgroundColor: visibility.humidity ? 'rgba(96, 165, 250, 0.2)' : theme.bg.hover, color: visibility.humidity ? getSafeColor('blue', 400) : theme.text.muted, borderColor: visibility.humidity ? 'rgba(96, 165, 250, 0.5)' : theme.border.default }}>RLF</button>
                    <button onClick={() => toggleLine('vpd')} className="px-2 py-1 rounded border" style={{ backgroundColor: visibility.vpd ? 'rgba(16, 185, 129, 0.2)' : theme.bg.hover, color: visibility.vpd ? getSafeColor('emerald', 400) : theme.text.muted, borderColor: visibility.vpd ? 'rgba(16, 185, 129, 0.5)' : theme.border.default }}>VPD</button>
                  </div>
                </div>

                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradTemp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={getSafeColor('amber', 400)} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={getSafeColor('amber', 400)} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradHum" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={getSafeColor('blue', 400)} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={getSafeColor('blue', 400)} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.border.default} vertical={false} />
                      <XAxis
                        dataKey="timestamp"
                        stroke={theme.text.muted}
                        fontSize={12}
                        tickMargin={10}
                        minTickGap={50}
                        domain={['dataMin', 'dataMax']}
                        type="number"
                        tickFormatter={(ts) => formatTimeAxis(ts, timeRange)}
                      />
                      <YAxis yAxisId="left" stroke={theme.text.muted} fontSize={12} domain={['auto', 'auto']} unit="°C" />
                      <YAxis yAxisId="right" orientation="right" stroke={theme.text.muted} fontSize={12} domain={[0, 100]} unit="%" />
                      {visibility.vpd && <YAxis yAxisId="vpd" orientation="right" stroke={getSafeColor('emerald', 500)} fontSize={12} domain={[0, 3]} unit=" kPa" hide />}
                      <Tooltip
                        contentStyle={{ backgroundColor: theme.bg.card, borderColor: theme.border.default, borderRadius: '12px' }}
                        labelStyle={{ color: theme.text.muted, marginBottom: '0.5rem' }}
                      />
                      {visibility.temp && <Area yAxisId="left" type="monotone" dataKey="temp" name="Temperatur" stroke={getSafeColor('amber', 400)} fill="url(#gradTemp)" strokeWidth={2} connectNulls={false} />}
                      {visibility.humidity && <Area yAxisId="right" type="monotone" dataKey="humidity" name="Luftfeuchte" stroke={getSafeColor('blue', 400)} fill="url(#gradHum)" strokeWidth={2} connectNulls={false} />}
                      {visibility.vpd && <Line yAxisId="right" type="monotone" dataKey="vpd" name="VPD (kPa)" stroke={getSafeColor('emerald', 500)} strokeWidth={2} dot={false} strokeDasharray="5 5" connectNulls={false} />}
                      <Brush
                        dataKey="timestamp"
                        height={30}
                        stroke={theme.border.default}
                        fill={theme.bg.main}
                        tickFormatter={(ts) => formatTimeAxis(ts, timeRange)}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Lux (Light Intensity) Chart */}
              <div className="p-4 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                <div className="flex justify-between items-center mb-6 px-2">
                  <h3 className="font-bold flex items-center gap-2" style={{ color: theme.text.primary }}>
                    <Sun style={{ color: getSafeColor('yellow', 500) }} size={20} /> Lichtintensität (Lux)
                  </h3>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="px-3 py-1 rounded-full border" style={{ backgroundColor: 'rgba(234, 179, 8, 0.2)', color: getSafeColor('yellow', 500), borderColor: 'rgba(234, 179, 8, 0.5)' }}>
                      DLI: {stats ? ((stats.lux.avg * 18 * 0.0036) / 1000).toFixed(1) : 0} mol/m²/d
                    </div>
                  </div>
                </div>

                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradLux" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={getSafeColor('yellow', 500)} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={getSafeColor('yellow', 500)} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.border.default} vertical={false} />
                      <XAxis
                        dataKey="timestamp"
                        stroke={theme.text.muted}
                        fontSize={12}
                        tickMargin={10}
                        minTickGap={50}
                        domain={['dataMin', 'dataMax']}
                        type="number"
                        tickFormatter={(timestamp) => {
                          const date = new Date(timestamp);
                          if (timeRange <= 3) {
                            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          } else if (timeRange <= 24) {
                            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          } else {
                            return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' }) + ' ' +
                                   date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          }
                        }}
                      />
                      <YAxis stroke={theme.text.muted} fontSize={12} domain={['auto', 'auto']} unit=" lx" />
                      <Tooltip
                        contentStyle={{ backgroundColor: theme.bg.card, borderColor: theme.border.default, borderRadius: '12px' }}
                        labelStyle={{ color: theme.text.muted, marginBottom: '0.5rem' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="lux"
                        name="Lichtintensität"
                        stroke={getSafeColor('yellow', 500)}
                        fill="url(#gradLux)"
                        strokeWidth={2}
                        connectNulls={false}
                      />
                      <Brush
                        dataKey="timestamp"
                        height={30}
                        stroke={theme.border.default}
                        fill={theme.bg.main}
                        tickFormatter={(ts) => formatTimeAxis(ts, timeRange)}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Reference Lines Info */}
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs px-2">
                  <div className="p-2 rounded" style={{ backgroundColor: `${getSafeColor('red', 500)}20`, color: getSafeColor('red', 400) }}>
                    <div className="font-bold mb-1">Niedrig</div>
                    <div className="opacity-75">&lt; 20k lx</div>
                  </div>
                  <div className="p-2 rounded" style={{ backgroundColor: `${getSafeColor('emerald', 500)}20`, color: getSafeColor('emerald', 400) }}>
                    <div className="font-bold mb-1">Optimal</div>
                    <div className="opacity-75">30-50k lx</div>
                  </div>
                  <div className="p-2 rounded" style={{ backgroundColor: `${getSafeColor('amber', 500)}20`, color: getSafeColor('amber', 400) }}>
                    <div className="font-bold mb-1">Sehr Hoch</div>
                    <div className="opacity-75">&gt; 70k lx</div>
                  </div>
                </div>
              </div>

              {/* VPD (Vapor Pressure Deficit) Chart */}
              <div className="p-4 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                <div className="flex justify-between items-center mb-6 px-2">
                  <h3 className="font-bold flex items-center gap-2" style={{ color: theme.text.primary }}>
                    <Wind style={{ color: getSafeColor('emerald', 500) }} size={20} /> VPD (Vapor Pressure Deficit)
                  </h3>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="px-3 py-1 rounded-full border" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: getSafeColor('emerald', 400), borderColor: 'rgba(16, 185, 129, 0.5)' }}>
                      Ø {stats ? stats.vpd.avg.toFixed(2) : 0} kPa
                    </div>
                  </div>
                </div>

                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradVPD" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={getSafeColor('emerald', 500)} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={getSafeColor('emerald', 500)} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.border.default} vertical={false} />
                      <XAxis
                        dataKey="timestamp"
                        stroke={theme.text.muted}
                        fontSize={12}
                        tickMargin={10}
                        minTickGap={50}
                        domain={['dataMin', 'dataMax']}
                        type="number"
                        tickFormatter={(timestamp) => {
                          const date = new Date(timestamp);
                          if (timeRange <= 3) {
                            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          } else if (timeRange <= 24) {
                            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          } else {
                            return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' }) + ' ' +
                                   date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          }
                        }}
                      />
                      <YAxis stroke={theme.text.muted} fontSize={12} domain={[0, 2.5]} unit=" kPa" />
                      <Tooltip
                        contentStyle={{ backgroundColor: theme.bg.card, borderColor: theme.border.default, borderRadius: '12px' }}
                        labelStyle={{ color: theme.text.muted, marginBottom: '0.5rem' }}
                        formatter={(value) => [`${value.toFixed(2)} kPa`, 'VPD']}
                      />
                      <Line
                        type="monotone"
                        dataKey="vpd"
                        name="VPD"
                        stroke={getSafeColor('emerald', 500)}
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6 }}
                        connectNulls={false}
                      />
                      {/* Optimal Range Shading (0.8 - 1.2 kPa) */}
                      <Area
                        type="monotone"
                        dataKey={(entry) => entry.vpd >= 0.8 && entry.vpd <= 1.2 ? entry.vpd : null}
                        name="Optimal Range"
                        stroke="none"
                        fill="url(#gradVPD)"
                      />
                      <Brush
                        dataKey="timestamp"
                        height={30}
                        stroke={theme.border.default}
                        fill={theme.bg.main}
                        tickFormatter={(ts) => formatTimeAxis(ts, timeRange)}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* VPD Reference Zones */}
                <div className="mt-4 grid grid-cols-4 gap-2 text-xs px-2">
                  <div className="p-2 rounded" style={{ backgroundColor: `${getSafeColor('blue', 500)}20`, color: getSafeColor('blue', 400) }}>
                    <div className="font-bold mb-1">Seedling</div>
                    <div className="opacity-75">0.4-0.8 kPa</div>
                  </div>
                  <div className="p-2 rounded" style={{ backgroundColor: `${getSafeColor('emerald', 500)}20`, color: getSafeColor('emerald', 400) }}>
                    <div className="font-bold mb-1">Vegetative</div>
                    <div className="opacity-75">0.8-1.0 kPa</div>
                  </div>
                  <div className="p-2 rounded" style={{ backgroundColor: `${getSafeColor('purple', 500)}20`, color: getSafeColor('purple', 400) }}>
                    <div className="font-bold mb-1">Flowering</div>
                    <div className="opacity-75">1.0-1.2 kPa</div>
                  </div>
                  <div className="p-2 rounded" style={{ backgroundColor: `${getSafeColor('amber', 500)}20`, color: getSafeColor('amber', 400) }}>
                    <div className="font-bold mb-1">Late Bloom</div>
                    <div className="opacity-75">1.2-1.5 kPa</div>
                  </div>
                </div>
              </div>

              {/* Soil Moisture Chart */}
              <div className="p-4 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 px-2 gap-4">
                  <h3 className="font-bold flex items-center gap-2" style={{ color: theme.text.primary }}>
                    <Droplets style={{ color: getSafeColor('emerald', 500) }} size={20} /> Bodenfeuchtigkeit
                  </h3>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {[1, 2, 3, 4, 5, 6].map(id => (
                      <button
                        key={id}
                        onClick={() => toggleLine(`soil${id}`)}
                        className="px-3 py-1 rounded-full border transition-all"
                        style={{
                          backgroundColor: visibility[`soil${id}`] ? 'rgba(16, 185, 129, 0.2)' : theme.bg.hover,
                          color: visibility[`soil${id}`] ? getSafeColor('emerald', 400) : theme.text.muted,
                          borderColor: visibility[`soil${id}`] ? 'rgba(16, 185, 129, 0.5)' : theme.border.default
                        }}
                      >
                        #{id}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Info: Wenn keine Sensoren aktiv */}
                {chartData.every(d => [d.soil1, d.soil2, d.soil3, d.soil4, d.soil5, d.soil6].every(v => v === null)) && (
                  <div className="mb-4 p-3 rounded-lg border" style={{
                    backgroundColor: `${getSafeColor('blue', 500)}10`,
                    borderColor: getSafeColor('blue', 500),
                    color: getSafeColor('blue', 500)
                  }}>
                    <div className="flex items-center gap-2 text-sm">
                      <AlertTriangle size={16} />
                      <span>Keine Bodenfeuchte-Sensoren aktiv. Verbinde Sensoren mit dem ESP32 um Daten zu sehen.</span>
                    </div>
                  </div>
                )}

                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.border.default} vertical={false} />
                      <XAxis
                        dataKey="timestamp"
                        stroke={theme.text.muted}
                        fontSize={12}
                        minTickGap={50}
                        domain={['dataMin', 'dataMax']}
                        type="number"
                        tickFormatter={(timestamp) => {
                          const date = new Date(timestamp);
                          if (timeRange <= 3) {
                            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          } else if (timeRange <= 24) {
                            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          } else {
                            return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' }) + ' ' +
                                   date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          }
                        }}
                      />
                      <YAxis stroke={theme.text.muted} fontSize={12} unit="%" domain={[0, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: theme.bg.card, borderColor: theme.border.default, borderRadius: '12px' }} />
                      {[
                        { id: 1, color: getSafeColor('emerald', 500) },
                        { id: 2, color: getSafeColor('blue', 500) },
                        { id: 3, color: getSafeColor('purple', 500) },
                        { id: 4, color: getSafeColor('amber', 500) },
                        { id: 5, color: getSafeColor('pink', 500) },
                        { id: 6, color: getSafeColor('slate', 500) },
                      ].map(p => (
                        visibility[`soil${p.id}`] && (
                          <Line
                            key={p.id}
                            type="monotone"
                            dataKey={`soil${p.id}`}
                            name={`Pflanze ${p.id}`}
                            stroke={p.color}
                            strokeWidth={2}
                            dot={false}
                            connectNulls={false}
                          />
                        )
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {/* ADVANCED TAB */}
          {activeView === 'advanced' && (
            <>
              {/* Gauge Charts Row */}
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl border" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                    <h4 className="text-xs font-bold mb-2" style={{ color: theme.text.muted }}>Temperatur</h4>
                    <GaugeChart
                      value={stats.temp.avg}
                      max={40}
                      label="Temp"
                      unit="°C"
                      theme={theme}
                      color={getSafeColor('amber', 500)}
                    />
                  </div>
                  <div className="p-4 rounded-xl border" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                    <h4 className="text-xs font-bold mb-2" style={{ color: theme.text.muted }}>Luftfeuchte</h4>
                    <GaugeChart
                      value={stats.humidity.avg}
                      max={100}
                      label="RLF"
                      unit="%"
                      theme={theme}
                      color={getSafeColor('blue', 500)}
                    />
                  </div>
                  <div className="p-4 rounded-xl border" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                    <h4 className="text-xs font-bold mb-2" style={{ color: theme.text.muted }}>VPD</h4>
                    <GaugeChart
                      value={stats.vpd.avg}
                      max={2.5}
                      label="VPD"
                      unit="kPa"
                      theme={theme}
                      color={getSafeColor('emerald', 500)}
                    />
                  </div>
                  <div className="p-4 rounded-xl border" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                    <h4 className="text-xs font-bold mb-2" style={{ color: theme.text.muted }}>Licht</h4>
                    <GaugeChart
                      value={stats.lux.avg / 1000}
                      max={100}
                      label="Lux"
                      unit="k lx"
                      theme={theme}
                      color={getSafeColor('yellow', 500)}
                    />
                  </div>
                </div>
              )}

              {/* Radar Chart für 24h Muster */}
              <div className="p-6 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                <div className="flex items-center gap-2 mb-4">
                  <CircleDot size={20} style={{ color: theme.accent.color }} />
                  <h3 className="font-bold" style={{ color: theme.text.primary }}>24h Klima-Muster (Radar)</h3>
                </div>
                <DailyPatternRadar data={rawData} theme={theme} />
              </div>

              {/* DLI + Growth Tracker */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DLICard luxData={chartData} theme={theme} />
                <GrowthTrackerCard
                  startDate="2025-01-01"
                  currentDay={35}
                  estimatedHarvest={100}
                  phase="Vegetativ"
                  theme={theme}
                />
              </div>

              {/* Trend Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TrendLineChart data={chartData} metric="temp" label="Temperatur" theme={theme} />
                <TrendLineChart data={chartData} metric="humidity" label="Luftfeuchte" theme={theme} />
              </div>

              {/* Distribution Pie Charts */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <DistributionPieChart data={chartData} metric="temp" label="Temperatur" theme={theme} />
                <DistributionPieChart data={chartData} metric="humidity" label="Luftfeuchte" theme={theme} />
                <DistributionPieChart data={chartData} metric="vpd" label="VPD" theme={theme} />
              </div>

              {/* Correlation Chart (Temp vs Humidity) */}
              <div className="p-6 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: theme.text.primary }}>
                  <Target style={{ color: theme.accent.color }} size={20} /> Korrelation: Temp vs Luftfeuchte
                </h3>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.border.default} />
                      <XAxis type="number" dataKey="temp" name="Temperatur" unit="°C" stroke={theme.text.muted} />
                      <YAxis type="number" dataKey="humidity" name="Luftfeuchte" unit="%" stroke={theme.text.muted} />
                      <ZAxis range={[20, 200]} />
                      <Tooltip contentStyle={{ backgroundColor: theme.bg.card, borderColor: theme.border.default, borderRadius: '12px' }} cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter name="Messwerte" data={chartData} fill={theme.accent.color} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {/* STATISTICS TAB */}
          {activeView === 'statistics' && (
            <>
              {/* Box Plots */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <BoxPlotCard data={chartData} metric="temp" label="Temperatur (°C)" theme={theme} />
                <BoxPlotCard data={chartData} metric="humidity" label="Luftfeuchte (%)" theme={theme} />
                <BoxPlotCard data={chartData} metric="vpd" label="VPD (kPa)" theme={theme} />
                <BoxPlotCard data={chartData} metric="lux" label="Lux" theme={theme} />
              </div>

              {/* Extended Statistics Table */}
              {stats && (
                <div className="p-6 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                  <div className="flex items-center gap-2 mb-6">
                    <Database size={20} style={{ color: theme.accent.color }} />
                    <h3 className="font-bold" style={{ color: theme.text.primary }}>Erweiterte Statistiken</h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: `2px solid ${theme.border.default}` }}>
                          <th className="text-left p-3" style={{ color: theme.text.muted }}>Metrik</th>
                          <th className="text-right p-3" style={{ color: theme.text.muted }}>Min</th>
                          <th className="text-right p-3" style={{ color: theme.text.muted }}>25% (Q1)</th>
                          <th className="text-right p-3" style={{ color: theme.text.muted }}>Median</th>
                          <th className="text-right p-3" style={{ color: theme.text.muted }}>Durchschnitt</th>
                          <th className="text-right p-3" style={{ color: theme.text.muted }}>75% (Q3)</th>
                          <th className="text-right p-3" style={{ color: theme.text.muted }}>Max</th>
                          <th className="text-right p-3" style={{ color: theme.text.muted }}>Spanne</th>
                          <th className="text-right p-3" style={{ color: theme.text.muted }}>IQR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {['temp', 'humidity', 'vpd', 'lux'].map(metric => {
                          const values = chartData.map(d => d[metric]).filter(v => v !== null && v !== undefined).sort((a, b) => a - b);
                          if (values.length === 0) return null;

                          const min = values[0];
                          const max = values[values.length - 1];
                          const q1 = values[Math.floor(values.length * 0.25)];
                          const median = values[Math.floor(values.length * 0.5)];
                          const q3 = values[Math.floor(values.length * 0.75)];
                          const avg = values.reduce((a, b) => a + b, 0) / values.length;
                          const range = max - min;
                          const iqr = q3 - q1;

                          const labels = {
                            temp: 'Temperatur (°C)',
                            humidity: 'Luftfeuchte (%)',
                            vpd: 'VPD (kPa)',
                            lux: 'Lux'
                          };

                          return (
                            <tr key={metric} style={{ borderBottom: `1px solid ${theme.border.default}` }}>
                              <td className="p-3 font-medium" style={{ color: theme.text.primary }}>{labels[metric]}</td>
                              <td className="text-right p-3 font-mono" style={{ color: theme.text.secondary }}>{min.toFixed(2)}</td>
                              <td className="text-right p-3 font-mono" style={{ color: theme.text.secondary }}>{q1.toFixed(2)}</td>
                              <td className="text-right p-3 font-mono font-bold" style={{ color: theme.accent.color }}>{median.toFixed(2)}</td>
                              <td className="text-right p-3 font-mono" style={{ color: theme.text.primary }}>{avg.toFixed(2)}</td>
                              <td className="text-right p-3 font-mono" style={{ color: theme.text.secondary }}>{q3.toFixed(2)}</td>
                              <td className="text-right p-3 font-mono" style={{ color: theme.text.secondary }}>{max.toFixed(2)}</td>
                              <td className="text-right p-3 font-mono" style={{ color: theme.text.muted }}>{range.toFixed(2)}</td>
                              <td className="text-right p-3 font-mono" style={{ color: theme.text.muted }}>{iqr.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Variability Analysis */}
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                    <div className="flex items-center gap-2 mb-4">
                      <Waves size={20} style={{ color: getSafeColor('blue', 500) }} />
                      <h3 className="font-bold" style={{ color: theme.text.primary }}>Stabilität & Variabilität</h3>
                    </div>
                    <div className="space-y-4">
                      {['temp', 'humidity', 'vpd'].map(metric => {
                        const range = stats[metric].max - stats[metric].min;
                        const avgValue = stats[metric].avg;
                        const stability = avgValue > 0 ? 100 - Math.min(100, (range / avgValue) * 100) : 0;

                        const labels = {
                          temp: { name: 'Temperatur', unit: '°C', optimalRange: 3 },
                          humidity: { name: 'Luftfeuchte', unit: '%', optimalRange: 10 },
                          vpd: { name: 'VPD', unit: 'kPa', optimalRange: 0.3 }
                        };

                        const isStable = range <= labels[metric].optimalRange;

                        return (
                          <div key={metric}>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm" style={{ color: theme.text.muted }}>{labels[metric].name}</span>
                              <span className="text-xs font-bold" style={{ color: isStable ? getSafeColor('emerald', 400) : getSafeColor('amber', 400) }}>
                                {isStable ? 'Stabil' : 'Variabel'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: theme.bg.hover }}>
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${Math.min(100, stability)}%`,
                                    backgroundColor: isStable ? getSafeColor('emerald', 500) : getSafeColor('amber', 500)
                                  }}
                                />
                              </div>
                              <span className="text-xs font-mono" style={{ color: theme.text.muted }}>
                                Δ{range.toFixed(2)} {labels[metric].unit}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUpDown size={20} style={{ color: getSafeColor('purple', 500) }} />
                      <h3 className="font-bold" style={{ color: theme.text.primary }}>Trend-Analyse</h3>
                    </div>
                    <div className="space-y-4">
                      {['temp', 'humidity', 'vpd'].map(metric => {
                        const regression = calculateLinearRegression(chartData, metric);
                        if (!regression) return null;

                        const labels = {
                          temp: { name: 'Temperatur', unit: '°C' },
                          humidity: { name: 'Luftfeuchte', unit: '%' },
                          vpd: { name: 'VPD', unit: 'kPa' }
                        };

                        const trendStrength = Math.abs(regression.slope);
                        const isSignificant = trendStrength > 0.01;

                        return (
                          <div key={metric} className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: theme.bg.hover }}>
                            <div>
                              <div className="font-medium text-sm" style={{ color: theme.text.primary }}>{labels[metric].name}</div>
                              <div className="text-xs" style={{ color: theme.text.muted }}>
                                Steigung: {regression.slope.toFixed(4)} {labels[metric].unit}/Messung
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div
                                className="px-3 py-1 rounded-full text-xs font-bold"
                                style={{
                                  backgroundColor: regression.slope > 0 ? `${getSafeColor('emerald', 500)}20` : regression.slope < 0 ? `${getSafeColor('red', 500)}20` : `${theme.text.muted}20`,
                                  color: regression.slope > 0 ? getSafeColor('emerald', 500) : regression.slope < 0 ? getSafeColor('red', 500) : theme.text.muted
                                }}
                              >
                                {regression.trend}
                              </div>
                              {regression.slope > 0 ? <TrendingUp size={18} style={{ color: getSafeColor('emerald', 500) }} /> : regression.slope < 0 ? <TrendingDown size={18} style={{ color: getSafeColor('red', 500) }} /> : <Minus size={18} style={{ color: theme.text.muted }} />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Data Export Section */}
              <div className="p-6 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                <div className="flex items-center gap-2 mb-4">
                  <Download size={20} style={{ color: theme.accent.color }} />
                  <h3 className="font-bold" style={{ color: theme.text.primary }}>Daten exportieren</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => exportToCSV(rawData, `grow_data_${new Date().toISOString().split('T')[0]}.csv`)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all hover:scale-105"
                    style={{ backgroundColor: `${getSafeColor('emerald', 500)}20`, color: getSafeColor('emerald', 500) }}
                  >
                    <FileText size={16} />
                    Export als CSV
                  </button>
                  <button
                    onClick={() => exportToJSON(rawData, `grow_data_${new Date().toISOString().split('T')[0]}.json`)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all hover:scale-105"
                    style={{ backgroundColor: `${getSafeColor('blue', 500)}20`, color: getSafeColor('blue', 500) }}
                  >
                    <Database size={16} />
                    Export als JSON
                  </button>
                  <div className="flex-1" />
                  <div className="text-xs" style={{ color: theme.text.muted }}>
                    {rawData.length} Datenpunkte verfügbar
                  </div>
                </div>
              </div>
            </>
          )}

          {/* COMPARISON TAB */}
          {activeView === 'comparison' && (
            <>
              <div className="p-4 rounded-xl border" style={{ backgroundColor: `${theme.accent.color}10`, borderColor: `${theme.accent.color}50` }}>
                <div className="flex items-center gap-2 text-sm" style={{ color: theme.accent.color }}>
                  <GitCompare size={16} />
                  <span className="font-bold">Vergleichs-Modus:</span>
                  <span>Hier kannst du verschiedene Zeiträume miteinander vergleichen</span>
                </div>
              </div>

              {/* Time Range Selector for Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl border" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                  <h4 className="font-bold mb-3 flex items-center gap-2" style={{ color: theme.text.primary }}>
                    <Timer size={18} style={{ color: getSafeColor('blue', 500) }} />
                    Zeitraum 1
                  </h4>
                  <select
                    value={comparisonRange1}
                    onChange={(e) => setComparisonRange1(parseInt(e.target.value))}
                    className="w-full p-3 rounded-lg border font-medium"
                    style={{ backgroundColor: theme.bg.hover, borderColor: theme.border.default, color: theme.text.primary }}
                  >
                    <option value={1}>Letzte Stunde</option>
                    <option value={3}>Letzte 3 Stunden</option>
                    <option value={6}>Letzte 6 Stunden</option>
                    <option value={12}>Letzte 12 Stunden</option>
                    <option value={24}>Letzte 24 Stunden</option>
                    <option value={72}>Letzte 3 Tage</option>
                    <option value={168}>Letzte Woche</option>
                  </select>
                </div>

                <div className="p-6 rounded-2xl border" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                  <h4 className="font-bold mb-3 flex items-center gap-2" style={{ color: theme.text.primary }}>
                    <Timer size={18} style={{ color: getSafeColor('purple', 500) }} />
                    Zeitraum 2
                  </h4>
                  <select
                    value={comparisonRange2}
                    onChange={(e) => setComparisonRange2(parseInt(e.target.value))}
                    className="w-full p-3 rounded-lg border font-medium"
                    style={{ backgroundColor: theme.bg.hover, borderColor: theme.border.default, color: theme.text.primary }}
                  >
                    <option value={1}>Letzte Stunde</option>
                    <option value={3}>Letzte 3 Stunden</option>
                    <option value={6}>Letzte 6 Stunden</option>
                    <option value={12}>Letzte 12 Stunden</option>
                    <option value={24}>Letzte 24 Stunden</option>
                    <option value={72}>Letzte 3 Tage</option>
                    <option value={168}>Letzte Woche</option>
                  </select>
                </div>
              </div>

              {/* Comparison Charts */}
              <div className="p-6 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                <h3 className="font-bold mb-4" style={{ color: theme.text.primary }}>Temperatur-Vergleich</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      {
                        name: `${comparisonRange1}h`,
                        avg: rawData.slice(-Math.floor(rawData.length * (comparisonRange1 / timeRange))).reduce((sum, d) => sum + (d.temp || 0), 0) / Math.max(1, rawData.slice(-Math.floor(rawData.length * (comparisonRange1 / timeRange))).length),
                        fill: getSafeColor('blue', 500)
                      },
                      {
                        name: `${comparisonRange2}h`,
                        avg: rawData.slice(-Math.floor(rawData.length * (comparisonRange2 / timeRange))).reduce((sum, d) => sum + (d.temp || 0), 0) / Math.max(1, rawData.slice(-Math.floor(rawData.length * (comparisonRange2 / timeRange))).length),
                        fill: getSafeColor('purple', 500)
                      }
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.border.default} />
                    <XAxis dataKey="name" stroke={theme.text.muted} />
                    <YAxis stroke={theme.text.muted} unit="°C" />
                    <Tooltip contentStyle={{ backgroundColor: theme.bg.card, borderColor: theme.border.default, borderRadius: '8px' }} />
                    <Bar dataKey="avg" name="Durchschnitt">
                      {[0, 1].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? getSafeColor('blue', 500) : getSafeColor('purple', 500)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {/* HEATMAPS TAB */}
          {activeView === 'heatmaps' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: theme.text.primary }}>
                  <Flame style={{ color: getSafeColor('red', 500) }} size={20} /> Temperatur - 24h Heatmap
                </h3>
                <HeatmapChart data={rawData} metric="temp" theme={theme} />
              </div>

              <div className="p-6 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: theme.text.primary }}>
                  <CloudRain style={{ color: getSafeColor('blue', 500) }} size={20} /> Luftfeuchte - 24h Heatmap
                </h3>
                <HeatmapChart data={rawData} metric="humidity" theme={theme} />
              </div>

              <div className="p-6 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: theme.text.primary }}>
                  <Sun style={{ color: getSafeColor('yellow', 500) }} size={20} /> Licht - 24h Heatmap
                </h3>
                <HeatmapChart data={rawData} metric="lux" theme={theme} />
              </div>
            </div>
          )}

          {/* INSIGHTS TAB */}
          {activeView === 'insights' && (
            <>
              {/* Activity Calendar */}
              <div className="p-6 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                <div className="flex items-center gap-3 mb-6">
                  <Calendar size={24} style={{ color: theme.accent.color }} />
                  <div>
                    <h3 className="font-bold" style={{ color: theme.text.primary }}>Aktivitäts-Kalender</h3>
                    <p className="text-xs" style={{ color: theme.text.muted }}>Letzte 12 Wochen - Klima-Qualität pro Tag</p>
                  </div>
                </div>
                <ActivityCalendar data={rawData} theme={theme} />
              </div>

              {/* Power Cost Calculator */}
              <div className="p-6 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-xl" style={{ backgroundColor: `${getSafeColor('yellow', 500)}20` }}>
                    <Calculator size={24} style={{ color: getSafeColor('yellow', 500) }} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold" style={{ color: theme.text.primary }}>Stromkosten Kalkulator</h3>
                    <p className="text-xs" style={{ color: theme.text.muted }}>Live Berechnung basierend auf deiner Konfiguration</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-5 p-4 rounded-xl border" style={{ backgroundColor: theme.bg.hover, borderColor: theme.border.default }}>
                    <div>
                      <label className="text-xs block mb-1 uppercase font-bold" style={{ color: theme.text.muted }}>Strompreis (€/kWh)</label>
                      <div className="flex items-center gap-2 p-3 rounded-lg border" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                        <Coins size={16} style={{ color: theme.text.muted }} />
                        <input type="number" step="0.01" value={powerConfig.price} onChange={e => setPowerConfig({ ...powerConfig, price: parseFloat(e.target.value) })} className="bg-transparent outline-none w-full font-mono text-sm" style={{ color: theme.text.primary }} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs block mb-1 uppercase font-bold" style={{ color: theme.text.muted }}>Leistung (Watt)</label>
                      <div className="flex items-center gap-2 p-3 rounded-lg border" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                        <Zap size={16} style={{ color: getSafeColor('yellow', 500) }} />
                        <input type="number" value={powerConfig.watts} onChange={e => setPowerConfig({ ...powerConfig, watts: parseFloat(e.target.value) })} className="bg-transparent outline-none w-full font-mono text-sm" style={{ color: theme.text.primary }} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs block mb-1 uppercase font-bold" style={{ color: theme.text.muted }}>Lichtstunden / Tag</label>
                      <div className="flex items-center gap-2 p-3 rounded-lg border" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                        <Clock size={16} style={{ color: getSafeColor('blue', 500) }} />
                        <input type="number" value={powerConfig.hours} onChange={e => setPowerConfig({ ...powerConfig, hours: parseFloat(e.target.value) })} className="bg-transparent outline-none w-full font-mono text-sm" style={{ color: theme.text.primary }} />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-5 rounded-2xl border transition-all hover:scale-105" style={{ backgroundColor: theme.bg.hover, borderColor: theme.border.default }}>
                      <div className="text-xs uppercase tracking-wider font-bold mb-2" style={{ color: theme.text.muted }}>Täglich</div>
                      <div className="text-3xl font-bold mb-1" style={{ color: theme.text.primary }}>{costDay.toFixed(2)}€</div>
                      <div className="text-xs" style={{ color: theme.text.muted }}>{kwhPerDay.toFixed(1)} kWh</div>
                    </div>
                    <div className="p-5 rounded-2xl border transition-all hover:scale-105" style={{ backgroundColor: 'rgba(96, 165, 250, 0.1)', borderColor: 'rgba(96, 165, 250, 0.3)', color: getSafeColor('blue', 400) }}>
                      <div className="text-xs uppercase tracking-wider font-bold mb-2">Monatlich</div>
                      <div className="text-3xl font-bold mb-1">{costMonth.toFixed(2)}€</div>
                      <div className="text-xs opacity-60">Prognose (30 Tage)</div>
                    </div>
                    <div className="p-5 rounded-2xl border transition-all hover:scale-105" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)', color: getSafeColor('emerald', 400) }}>
                      <div className="text-xs uppercase tracking-wider font-bold mb-2">Pro Grow</div>
                      <div className="text-4xl font-bold mb-1">{costCycle.toFixed(2)}€</div>
                      <div className="text-xs opacity-60">ca. 100 Tage</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Score */}
              {stats && growScore && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 rounded-2xl border shadow-xl text-center" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                    <Award size={48} className="mx-auto mb-3" style={{ color: growScore.total >= 80 ? getSafeColor('emerald', 500) : growScore.total >= 60 ? getSafeColor('amber', 500) : getSafeColor('red', 500) }} />
                    <h3 className="font-bold mb-2" style={{ color: theme.text.primary }}>Grow Score</h3>
                    <div className="text-5xl font-black mb-2" style={{ color: growScore.total >= 80 ? getSafeColor('emerald', 400) : growScore.total >= 60 ? getSafeColor('amber', 400) : getSafeColor('red', 400) }}>{growScore.total}</div>
                    <div className="text-xs" style={{ color: theme.text.muted }}>
                      {growScore.total >= 90 ? 'Exzellent!' : growScore.total >= 80 ? 'Sehr gut!' : growScore.total >= 70 ? 'Gut' : growScore.total >= 60 ? 'OK' : 'Verbesserungswürdig'}
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                    <Gauge size={24} className="mb-3" style={{ color: getSafeColor('blue', 500) }} />
                    <h3 className="font-bold mb-3" style={{ color: theme.text.primary }}>Score Breakdown</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span style={{ color: theme.text.muted }}>Stabilität (40%)</span>
                        <span className="font-bold" style={{ color: growScore.breakdown.stability >= 30 ? getSafeColor('emerald', 400) : getSafeColor('amber', 400) }}>{growScore.breakdown.stability}/40</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: theme.text.muted }}>Optimale Range (30%)</span>
                        <span className="font-bold" style={{ color: growScore.breakdown.range >= 24 ? getSafeColor('emerald', 400) : getSafeColor('amber', 400) }}>{growScore.breakdown.range}/30</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: theme.text.muted }}>Anomalien (30%)</span>
                        <span className="font-bold" style={{ color: growScore.breakdown.anomaly >= 24 ? getSafeColor('emerald', 400) : getSafeColor('amber', 400) }}>{growScore.breakdown.anomaly}/30</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl border shadow-xl" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                    <Target size={24} className="mb-3" style={{ color: getSafeColor('purple', 500) }} />
                    <h3 className="font-bold mb-3" style={{ color: theme.text.primary }}>Optimierungen</h3>
                    <div className="space-y-2 text-sm">
                      <div className="p-2 rounded" style={{ backgroundColor: `${getSafeColor('emerald', 500)}20`, color: getSafeColor('emerald', 400) }}>
                        ✓ VPD im optimalen Bereich
                      </div>
                      <div className="p-2 rounded" style={{ backgroundColor: `${getSafeColor('amber', 500)}20`, color: getSafeColor('amber', 400) }}>
                        ⚠ RLF könnte stabiler sein
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}