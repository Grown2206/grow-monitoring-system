import React, { useEffect, useState, useMemo, useRef } from 'react';
import { api } from '../../utils/api';
import { useTheme } from '../../theme';
import { convertToPercent } from '../../utils/soilCalibration';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Brush, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ComposedChart, ReferenceLine, BarChart, Bar, ScatterChart, Scatter,
  ZAxis
} from 'recharts';
import {
  Activity, ThermometerSun, Droplets, TrendingUp, TrendingDown, Minus,
  Download, Calendar, Sun, Wind, Gauge, BarChart3, Sparkles, Brain,
  Zap, Timer, RefreshCw, ChevronRight, Maximize2, ArrowUpRight,
  ArrowDownRight, Loader2, AlertTriangle, FileText, Database, Eye,
  EyeOff, Leaf, Target, Award, Clock, Flame, Waves, Printer,
  LineChart as LineChartIcon, AreaChart as AreaChartIcon, Layers, CircleDot
} from 'lucide-react';
import PDFExport from './PDFExport';

// ==================== ANIMATED COMPONENTS ====================

// Animated Counter
const AnimatedNumber = ({ value, decimals = 0, duration = 800 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const startRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    startRef.current = displayValue;
    const startTime = Date.now();
    const startValue = displayValue;
    const endValue = parseFloat(value) || 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out-cubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * eased;

      setDisplayValue(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value]);

  return <span>{displayValue.toFixed(decimals)}</span>;
};

// Glassmorphism Card
const GlassCard = ({ children, className = '', gradient = false, glow = false, style = {} }) => {
  const { currentTheme: theme } = useTheme();

  return (
    <div
      className={`relative rounded-2xl border backdrop-blur-xl transition-all duration-300 ${className}`}
      style={{
        backgroundColor: `${theme.bg.card}cc`,
        borderColor: `${theme.border.default}80`,
        boxShadow: glow
          ? `0 0 40px ${theme.accent.color}20, 0 8px 32px rgba(0,0,0,0.12)`
          : '0 8px 32px rgba(0,0,0,0.08)',
        ...style
      }}
    >
      {gradient && (
        <div
          className="absolute inset-0 rounded-2xl opacity-30 pointer-events-none"
          style={{
            background: `linear-gradient(135deg, ${theme.accent.color}15 0%, transparent 50%, ${theme.accent.color}08 100%)`
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

// Metric Ring (Circular Progress)
const MetricRing = ({ value, max, size = 120, strokeWidth = 8, color, label, unit }) => {
  const { currentTheme: theme } = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min(value / max, 1);
  const offset = circumference - percentage * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`${theme.border.default}50`}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold" style={{ color: theme.text.primary }}>
          <AnimatedNumber value={value} decimals={1} />
        </div>
        <div className="text-xs font-medium" style={{ color: theme.text.muted }}>{unit}</div>
      </div>
    </div>
  );
};

// Trend Badge
const TrendBadge = ({ trend, value }) => {
  const isUp = trend > 0;
  const isNeutral = Math.abs(trend) < 0.5;

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold transition-all ${
        isNeutral ? 'bg-gray-500/20 text-gray-400' :
        isUp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
      }`}
    >
      {isNeutral ? <Minus size={12} /> : isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {Math.abs(value || trend).toFixed(1)}%
    </div>
  );
};

// Hero Stat Card
const HeroStatCard = ({ icon: Icon, label, value, unit, trend, color, description, optimal }) => {
  const { currentTheme: theme } = useTheme();
  const isOptimal = optimal !== undefined
    ? value >= optimal.min && value <= optimal.max
    : true;

  return (
    <GlassCard className="p-5 hover:scale-[1.02] cursor-default group" glow={isOptimal}>
      <div className="flex items-start justify-between mb-4">
        <div
          className="p-3 rounded-xl transition-transform group-hover:scale-110"
          style={{
            backgroundColor: `${color}20`,
            boxShadow: `0 4px 20px ${color}30`
          }}
        >
          <Icon size={22} style={{ color }} />
        </div>
        {trend !== undefined && <TrendBadge trend={trend} />}
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.text.muted }}>
          {label}
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black" style={{ color: theme.text.primary }}>
            <AnimatedNumber value={value} decimals={unit === '°C' || unit === 'kPa' ? 1 : 0} />
          </span>
          <span className="text-sm font-medium" style={{ color: theme.text.muted }}>{unit}</span>
        </div>
        {description && (
          <p className="text-xs mt-2 pt-2 border-t" style={{ color: theme.text.muted, borderColor: theme.border.default }}>
            {description}
          </p>
        )}
      </div>

      {/* Optimal indicator */}
      {optimal && (
        <div className="absolute bottom-2 right-2">
          <div
            className={`w-2 h-2 rounded-full ${isOptimal ? 'bg-emerald-500' : 'bg-amber-500'}`}
            style={{ boxShadow: isOptimal ? '0 0 8px #10b981' : '0 0 8px #f59e0b' }}
          />
        </div>
      )}
    </GlassCard>
  );
};

// Grow Score Card (Special)
const GrowScoreCard = ({ score, breakdown }) => {
  const { currentTheme: theme } = useTheme();

  const getScoreColor = (s) => {
    if (s >= 80) return '#10b981';
    if (s >= 60) return '#3b82f6';
    if (s >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLabel = (s) => {
    if (s >= 90) return 'Exzellent';
    if (s >= 75) return 'Sehr Gut';
    if (s >= 60) return 'Gut';
    if (s >= 40) return 'OK';
    return 'Verbesserungsbedarf';
  };

  const color = getScoreColor(score);

  return (
    <GlassCard className="p-6 col-span-full md:col-span-2" gradient glow>
      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Score Ring */}
        <div className="relative">
          <MetricRing
            value={score}
            max={100}
            size={140}
            strokeWidth={12}
            color={color}
            label="Score"
            unit="/ 100"
          />
          <div
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold"
            style={{ backgroundColor: `${color}30`, color }}
          >
            {getScoreLabel(score)}
          </div>
        </div>

        {/* Breakdown */}
        <div className="flex-1 space-y-3 w-full">
          <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: theme.text.primary }}>
            <Award size={20} style={{ color: theme.accent.color }} />
            Grow Score
          </h3>

          <div className="space-y-2">
            {[
              { label: 'Stabilität', value: breakdown?.stability || 0, max: 40, icon: Target },
              { label: 'Optimal Range', value: breakdown?.range || 0, max: 30, icon: Gauge },
              { label: 'Anomalie-Frei', value: breakdown?.anomaly || 0, max: 30, icon: Activity }
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5" style={{ color: theme.text.secondary }}>
                    <item.icon size={12} />
                    {item.label}
                  </span>
                  <span className="font-mono font-bold" style={{ color: theme.text.primary }}>
                    {item.value}/{item.max}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.bg.hover }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${(item.value / item.max) * 100}%`,
                      backgroundColor: getScoreColor((item.value / item.max) * 100)
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GlassCard>
  );
};

// Insight Card
const InsightCard = ({ type, title, message, action, severity = 'info' }) => {
  const { currentTheme: theme } = useTheme();

  const severityColors = {
    success: { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', text: '#10b981' },
    warning: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', text: '#f59e0b' },
    error: { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', text: '#ef4444' },
    info: { bg: `${theme.accent.color}15`, border: `${theme.accent.color}30`, text: theme.accent.color }
  };

  const colors = severityColors[severity];
  const icons = { success: Sparkles, warning: AlertTriangle, error: Flame, info: Brain };
  const Icon = icons[severity];

  return (
    <div
      className="p-4 rounded-xl border transition-all hover:scale-[1.01]"
      style={{ backgroundColor: colors.bg, borderColor: colors.border }}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${colors.text}20` }}>
          <Icon size={18} style={{ color: colors.text }} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm mb-1" style={{ color: theme.text.primary }}>
            {title}
          </h4>
          <p className="text-xs leading-relaxed" style={{ color: theme.text.secondary }}>
            {message}
          </p>
          {action && (
            <button
              className="text-xs font-medium mt-2 flex items-center gap-1 hover:gap-2 transition-all"
              style={{ color: colors.text }}
            >
              {action} <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Modern Chart Tooltip
const CustomTooltip = ({ active, payload, label }) => {
  const { currentTheme: theme } = useTheme();

  if (!active || !payload?.length) return null;

  return (
    <div
      className="p-3 rounded-xl border backdrop-blur-xl"
      style={{
        backgroundColor: `${theme.bg.card}f0`,
        borderColor: theme.border.default,
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
      }}
    >
      <p className="text-xs font-medium mb-2" style={{ color: theme.text.muted }}>
        {typeof label === 'number'
          ? new Date(label).toLocaleString('de-DE', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })
          : label
        }
      </p>
      <div className="space-y-1">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="font-mono font-bold" style={{ color: theme.text.primary }}>
              {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Quick Stats Bar
const QuickStatsBar = ({ stats, theme }) => {
  const items = [
    { label: 'Datenpunkte', value: stats.dataPoints, icon: Database },
    { label: 'Zeitraum', value: stats.timeRange, icon: Clock },
    { label: 'Letztes Update', value: stats.lastUpdate, icon: RefreshCw }
  ];

  return (
    <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: theme.text.muted }}>
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-1.5">
          <item.icon size={14} />
          <span>{item.label}:</span>
          <span className="font-semibold" style={{ color: theme.text.secondary }}>{item.value}</span>
        </div>
      ))}
    </div>
  );
};

// Chart Type Selector
const ChartTypeSelector = ({ value, onChange, theme }) => {
  const chartTypes = [
    { id: 'area', label: 'Area', icon: AreaChartIcon },
    { id: 'line', label: 'Line', icon: LineChartIcon },
    { id: 'bar', label: 'Bar', icon: BarChart3 },
    { id: 'scatter', label: 'Scatter', icon: CircleDot }
  ];

  return (
    <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: `${theme.bg.hover}80` }}>
      {chartTypes.map((type) => (
        <button
          key={type.id}
          onClick={() => onChange(type.id)}
          className="p-2 rounded-md transition-all"
          style={{
            backgroundColor: value === type.id ? theme.bg.card : 'transparent',
            color: value === type.id ? theme.accent.color : theme.text.muted,
            boxShadow: value === type.id ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
          }}
          title={type.label}
        >
          <type.icon size={16} />
        </button>
      ))}
    </div>
  );
};

// Flexible Climate Chart Component
const FlexibleClimateChart = ({ data, chartType, visibility, theme, timeRange }) => {
  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 0, left: -20, bottom: 0 }
    };

    const xAxisProps = {
      dataKey: "timestamp",
      stroke: theme.text.muted,
      fontSize: 11,
      tickMargin: 10,
      minTickGap: 50,
      domain: ['dataMin', 'dataMax'],
      type: "number",
      tickFormatter: (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const tooltipContent = <CustomTooltip />;

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={`${theme.border.default}50`} vertical={false} />
            <XAxis {...xAxisProps} />
            <YAxis yAxisId="left" stroke={theme.text.muted} fontSize={11} domain={['auto', 'auto']} />
            <YAxis yAxisId="right" orientation="right" stroke={theme.text.muted} fontSize={11} domain={[0, 100]} />
            <Tooltip content={tooltipContent} />
            {visibility.temp && (
              <Line yAxisId="left" type="monotone" dataKey="temp" name="Temperatur (°C)" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls={false} />
            )}
            {visibility.humidity && (
              <Line yAxisId="right" type="monotone" dataKey="humidity" name="Luftfeuchte (%)" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls={false} />
            )}
            {visibility.vpd && (
              <Line yAxisId="left" type="monotone" dataKey="vpd" name="VPD (kPa)" stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="5 5" connectNulls={false} />
            )}
            <Brush dataKey="timestamp" height={30} stroke={theme.border.default} fill={theme.bg.main} tickFormatter={(ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
          </LineChart>
        );

      case 'bar':
        // Aggregate data for bar chart (group by hour)
        const aggregatedData = data.reduce((acc, item) => {
          const hour = new Date(item.timestamp).getHours();
          if (!acc[hour]) {
            acc[hour] = { hour: `${hour}:00`, temps: [], humidities: [], vpds: [] };
          }
          if (item.temp) acc[hour].temps.push(item.temp);
          if (item.humidity) acc[hour].humidities.push(item.humidity);
          if (item.vpd) acc[hour].vpds.push(item.vpd);
          return acc;
        }, {});

        const barData = Object.values(aggregatedData).map(item => ({
          hour: item.hour,
          temp: item.temps.length ? item.temps.reduce((a, b) => a + b, 0) / item.temps.length : 0,
          humidity: item.humidities.length ? item.humidities.reduce((a, b) => a + b, 0) / item.humidities.length : 0,
          vpd: item.vpds.length ? item.vpds.reduce((a, b) => a + b, 0) / item.vpds.length : 0
        }));

        return (
          <BarChart data={barData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={`${theme.border.default}50`} vertical={false} />
            <XAxis dataKey="hour" stroke={theme.text.muted} fontSize={11} />
            <YAxis yAxisId="left" stroke={theme.text.muted} fontSize={11} />
            <YAxis yAxisId="right" orientation="right" stroke={theme.text.muted} fontSize={11} domain={[0, 100]} />
            <Tooltip content={tooltipContent} />
            {visibility.temp && <Bar yAxisId="left" dataKey="temp" name="Temperatur (°C)" fill="#f59e0b" radius={[4, 4, 0, 0]} />}
            {visibility.humidity && <Bar yAxisId="right" dataKey="humidity" name="Luftfeuchte (%)" fill="#3b82f6" radius={[4, 4, 0, 0]} />}
            {visibility.vpd && <Bar yAxisId="left" dataKey="vpd" name="VPD (kPa)" fill="#10b981" radius={[4, 4, 0, 0]} />}
          </BarChart>
        );

      case 'scatter':
        return (
          <ScatterChart margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={`${theme.border.default}50`} />
            <XAxis dataKey="temp" name="Temperatur" stroke={theme.text.muted} fontSize={11} unit="°C" domain={['auto', 'auto']} />
            <YAxis dataKey="humidity" name="Luftfeuchte" stroke={theme.text.muted} fontSize={11} unit="%" domain={[0, 100]} />
            <ZAxis dataKey="vpd" name="VPD" range={[20, 200]} />
            <Tooltip content={tooltipContent} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name="Klima" data={data.filter(d => d.temp && d.humidity)} fill={theme.accent.color} fillOpacity={0.6} />
          </ScatterChart>
        );

      case 'area':
      default:
        return (
          <ComposedChart {...commonProps}>
            <defs>
              <linearGradient id="gradTempV2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradHumV2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={`${theme.border.default}50`} vertical={false} />
            <XAxis {...xAxisProps} />
            <YAxis yAxisId="left" stroke={theme.text.muted} fontSize={11} domain={['auto', 'auto']} />
            <YAxis yAxisId="right" orientation="right" stroke={theme.text.muted} fontSize={11} domain={[0, 100]} />
            <Tooltip content={tooltipContent} />
            <ReferenceLine yAxisId="left" y={24} stroke={`${theme.accent.color}40`} strokeDasharray="3 3" />
            {visibility.temp && (
              <Area yAxisId="left" type="monotone" dataKey="temp" name="Temperatur (°C)" stroke="#f59e0b" fill="url(#gradTempV2)" strokeWidth={2} connectNulls={false} />
            )}
            {visibility.humidity && (
              <Area yAxisId="right" type="monotone" dataKey="humidity" name="Luftfeuchte (%)" stroke="#3b82f6" fill="url(#gradHumV2)" strokeWidth={2} connectNulls={false} />
            )}
            {visibility.vpd && (
              <Line yAxisId="left" type="monotone" dataKey="vpd" name="VPD (kPa)" stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="5 5" connectNulls={false} />
            )}
            <Brush dataKey="timestamp" height={30} stroke={theme.border.default} fill={theme.bg.main} tickFormatter={(ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
          </ComposedChart>
        );
    }
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      {renderChart()}
    </ResponsiveContainer>
  );
};

// Flexible Lux Chart
const FlexibleLuxChart = ({ data, chartType, theme }) => {
  const renderChart = () => {
    const xAxisProps = {
      dataKey: "timestamp",
      stroke: theme.text.muted,
      fontSize: 11,
      tickMargin: 10,
      minTickGap: 50,
      domain: ['dataMin', 'dataMax'],
      type: "number",
      tickFormatter: (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    switch (chartType) {
      case 'line':
        return (
          <LineChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={`${theme.border.default}50`} vertical={false} />
            <XAxis {...xAxisProps} />
            <YAxis stroke={theme.text.muted} fontSize={11} domain={['auto', 'auto']} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="lux" name="Licht (lx)" stroke="#eab308" strokeWidth={2} dot={false} connectNulls={false} />
            <Brush dataKey="timestamp" height={30} stroke={theme.border.default} fill={theme.bg.main} tickFormatter={(ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
          </LineChart>
        );

      case 'bar':
        const aggregatedData = data.reduce((acc, item) => {
          const hour = new Date(item.timestamp).getHours();
          if (!acc[hour]) acc[hour] = { hour: `${hour}:00`, values: [] };
          if (item.lux) acc[hour].values.push(item.lux);
          return acc;
        }, {});

        const barData = Object.values(aggregatedData).map(item => ({
          hour: item.hour,
          lux: item.values.length ? item.values.reduce((a, b) => a + b, 0) / item.values.length : 0
        }));

        return (
          <BarChart data={barData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={`${theme.border.default}50`} vertical={false} />
            <XAxis dataKey="hour" stroke={theme.text.muted} fontSize={11} />
            <YAxis stroke={theme.text.muted} fontSize={11} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="lux" name="Licht (lx)" fill="#eab308" radius={[4, 4, 0, 0]} />
          </BarChart>
        );

      case 'area':
      default:
        return (
          <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradLuxV2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#eab308" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={`${theme.border.default}50`} vertical={false} />
            <XAxis {...xAxisProps} />
            <YAxis stroke={theme.text.muted} fontSize={11} domain={['auto', 'auto']} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="lux" name="Licht (lx)" stroke="#eab308" fill="url(#gradLuxV2)" strokeWidth={2} connectNulls={false} />
            <Brush dataKey="timestamp" height={30} stroke={theme.border.default} fill={theme.bg.main} tickFormatter={(ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
          </AreaChart>
        );
    }
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      {renderChart()}
    </ResponsiveContainer>
  );
};

// ==================== MAIN COMPONENT ====================

export default function AnalyticsV2() {
  const { currentTheme: theme } = useTheme();

  // State
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(1); // Standard: 1 Stunde
  const [activeMetric, setActiveMetric] = useState('climate');
  const [showPDFExport, setShowPDFExport] = useState(false);

  // Chart Types
  const [climateChartType, setClimateChartType] = useState('area');
  const [luxChartType, setLuxChartType] = useState('area');

  // Visibility
  const [visibility, setVisibility] = useState({
    temp: true,
    humidity: true,
    vpd: false,
    lux: true
  });

  // Load Data
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      setError(null);
      const response = await api.getHistory({ hours: timeRange });
      const history = response?.data || response || [];

      if (!Array.isArray(history)) {
        setRawData([]);
        return;
      }

      const processed = history
        .filter(entry => entry?.readings)
        .map(entry => {
          const r = entry.readings;
          const soil = Array.isArray(r.soilMoisture) ? r.soilMoisture : [];

          const temps = [r.temp_bottom, r.temp_middle, r.temp_top].filter(t => t > 0);
          const humidities = [r.humidity_bottom, r.humidity_middle, r.humidity_top].filter(h => h > 0);
          const T = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : null;
          const RH = humidities.length > 0 ? humidities.reduce((a, b) => a + b, 0) / humidities.length : null;

          // VPD Calculation
          const SVP = T ? 0.61078 * Math.exp((17.27 * T) / (T + 237.3)) : 0;
          const VPD = T && RH ? SVP * (1 - RH / 100) : null;

          return {
            timestamp: new Date(entry.timestamp).getTime(),
            temp: T,
            humidity: RH,
            vpd: VPD ? parseFloat(VPD.toFixed(2)) : null,
            lux: typeof r.lux === 'number' ? r.lux : null,
            soil1: soil[0] ? convertToPercent(soil[0], 1) : null,
            soil2: soil[1] ? convertToPercent(soil[1], 2) : null,
            soil3: soil[2] ? convertToPercent(soil[2], 3) : null,
            soil4: soil[3] ? convertToPercent(soil[3], 4) : null,
            soil5: soil[4] ? convertToPercent(soil[4], 5) : null,
            soil6: soil[5] ? convertToPercent(soil[5], 6) : null,
          };
        })
        .sort((a, b) => a.timestamp - b.timestamp);

      setRawData(processed);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Statistics
  const stats = useMemo(() => {
    if (rawData.length === 0) return null;

    const calcStats = (key) => {
      const values = rawData.map(d => d[key]).filter(v => v != null);
      if (values.length === 0) return { min: 0, max: 0, avg: 0, latest: 0, trend: 0 };

      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const latest = values[values.length - 1];

      // Calculate trend (compare last 10% vs first 10%)
      const chunk = Math.max(1, Math.floor(values.length * 0.1));
      const firstAvg = values.slice(0, chunk).reduce((a, b) => a + b, 0) / chunk;
      const lastAvg = values.slice(-chunk).reduce((a, b) => a + b, 0) / chunk;
      const trend = firstAvg !== 0 ? ((lastAvg - firstAvg) / firstAvg) * 100 : 0;

      return {
        min: Math.min(...values),
        max: Math.max(...values),
        avg,
        latest,
        trend
      };
    };

    return {
      temp: calcStats('temp'),
      humidity: calcStats('humidity'),
      vpd: calcStats('vpd'),
      lux: calcStats('lux')
    };
  }, [rawData]);

  // Grow Score
  const growScore = useMemo(() => {
    if (!stats || rawData.length === 0) return { total: 0, breakdown: { stability: 0, range: 0, anomaly: 0 } };

    const tempVar = stats.temp.max - stats.temp.min;
    const humVar = stats.humidity.max - stats.humidity.min;

    const stability = Math.max(0, 40 - (tempVar * 2) - (humVar * 0.5));
    const range = (stats.temp.avg >= 20 && stats.temp.avg <= 28 ? 15 : 5) +
                  (stats.humidity.avg >= 50 && stats.humidity.avg <= 70 ? 15 : 5);
    const anomaly = 30 - (stats.temp.max > 30 ? 10 : 0) - (stats.humidity.max > 80 ? 10 : 0) - (stats.vpd.max > 1.6 ? 10 : 0);

    return {
      total: Math.round(Math.max(0, Math.min(100, stability + range + anomaly))),
      breakdown: { stability: Math.round(stability), range: Math.round(range), anomaly: Math.round(Math.max(0, anomaly)) }
    };
  }, [stats, rawData]);

  // Insights
  const insights = useMemo(() => {
    if (!stats) return [];
    const list = [];

    if (stats.temp.avg >= 20 && stats.temp.avg <= 28 && stats.humidity.avg >= 50 && stats.humidity.avg <= 70) {
      list.push({ type: 'climate', title: 'Optimales Klima', message: 'Deine Klimawerte sind im perfekten Bereich für gesundes Pflanzenwachstum.', severity: 'success' });
    }

    if (stats.vpd.avg >= 0.8 && stats.vpd.avg <= 1.2) {
      list.push({ type: 'vpd', title: 'VPD im Sweet Spot', message: `Mit ${stats.vpd.avg.toFixed(2)} kPa ist dein VPD optimal für maximale Transpiration.`, severity: 'success' });
    } else if (stats.vpd.avg < 0.8) {
      list.push({ type: 'vpd', title: 'VPD zu niedrig', message: 'Erhöhe die Temperatur oder senke die Luftfeuchtigkeit für bessere Transpiration.', severity: 'warning', action: 'Mehr erfahren' });
    } else if (stats.vpd.avg > 1.4) {
      list.push({ type: 'vpd', title: 'VPD zu hoch', message: 'Die Pflanzen könnten unter Stress stehen. Erhöhe die Luftfeuchtigkeit.', severity: 'warning', action: 'Mehr erfahren' });
    }

    if (stats.temp.max > 30) {
      list.push({ type: 'temp', title: 'Hohe Temperatur erkannt', message: `Maximum von ${stats.temp.max.toFixed(1)}°C wurde erreicht. Überhitzung kann Stress verursachen.`, severity: 'error' });
    }

    if (stats.lux.avg > 0) {
      const dli = (stats.lux.avg * 18 * 0.0036) / 1000;
      if (dli >= 25 && dli <= 45) {
        list.push({ type: 'light', title: 'Gute Lichtmenge', message: `DLI von ${dli.toFixed(1)} mol/m²/d ist optimal für die Blütephase.`, severity: 'success' });
      }
    }

    if (list.length === 0) {
      list.push({ type: 'general', title: 'Alles läuft', message: 'Keine besonderen Auffälligkeiten. Weiter so!', severity: 'info' });
    }

    return list;
  }, [stats]);

  // Time Range Buttons
  const timeRanges = [
    { value: 1, label: '1h' },
    { value: 6, label: '6h' },
    { value: 12, label: '12h' },
    { value: 24, label: '24h' },
    { value: 72, label: '3d' },
    { value: 168, label: '7d' }
  ];

  // Metric Tabs
  const metricTabs = [
    { id: 'climate', label: 'Klima', icon: ThermometerSun },
    { id: 'light', label: 'Licht', icon: Sun },
    { id: 'soil', label: 'Boden', icon: Droplets },
    { id: 'vpd', label: 'VPD', icon: Wind }
  ];

  const toggleVisibility = (key) => {
    setVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Error State
  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <GlassCard className="p-8 text-center max-w-md">
          <AlertTriangle size={48} className="mx-auto mb-4" style={{ color: '#ef4444' }} />
          <h3 className="text-lg font-bold mb-2" style={{ color: theme.text.primary }}>Verbindungsfehler</h3>
          <p className="text-sm mb-4" style={{ color: theme.text.muted }}>{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 rounded-lg font-medium transition-all hover:scale-105"
            style={{ backgroundColor: theme.accent.color, color: '#fff' }}
          >
            Erneut versuchen
          </button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Hero Header */}
      <div
        className="relative overflow-hidden rounded-3xl p-6 md:p-8"
        style={{
          background: `linear-gradient(135deg, ${theme.bg.card} 0%, ${theme.bg.main} 100%)`,
          borderColor: theme.border.default
        }}
      >
        {/* Background Pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(${theme.accent.color} 1px, transparent 1px)`,
            backgroundSize: '20px 20px'
          }}
        />

        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-black flex items-center gap-3" style={{ color: theme.text.primary }}>
                <div
                  className="p-2.5 rounded-xl"
                  style={{
                    background: `linear-gradient(135deg, ${theme.accent.color} 0%, ${theme.accent.dark || theme.accent.color} 100%)`,
                    boxShadow: `0 4px 20px ${theme.accent.color}40`
                  }}
                >
                  <BarChart3 size={24} className="text-white" />
                </div>
                Analytics Dashboard
              </h1>
              <p className="text-sm mt-2" style={{ color: theme.text.muted }}>
                Echtzeit-Monitoring & intelligente Insights
              </p>
            </div>

            {/* Time Range Selector */}
            <div className="flex items-center gap-2">
              <div
                className="flex p-1 rounded-xl"
                style={{ backgroundColor: `${theme.bg.hover}80` }}
              >
                {timeRanges.map((range) => (
                  <button
                    key={range.value}
                    onClick={() => setTimeRange(range.value)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      backgroundColor: timeRange === range.value ? theme.accent.color : 'transparent',
                      color: timeRange === range.value ? '#fff' : theme.text.muted,
                      boxShadow: timeRange === range.value ? `0 2px 10px ${theme.accent.color}40` : 'none'
                    }}
                  >
                    {range.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowPDFExport(true)}
                className="p-2.5 rounded-xl transition-all hover:scale-105"
                style={{ backgroundColor: theme.bg.hover, color: theme.text.muted }}
                title="PDF Export"
              >
                <Printer size={18} />
              </button>

              <button
                onClick={loadData}
                disabled={loading}
                className="p-2.5 rounded-xl transition-all hover:scale-105"
                style={{ backgroundColor: theme.bg.hover, color: theme.text.muted }}
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <QuickStatsBar
            stats={{
              dataPoints: rawData.length.toLocaleString(),
              timeRange: `${timeRange}h`,
              lastUpdate: rawData.length > 0
                ? new Date(rawData[rawData.length - 1]?.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                : '--:--'
            }}
            theme={theme}
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && rawData.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3">
          <Loader2 size={32} className="animate-spin" style={{ color: theme.accent.color }} />
          <span style={{ color: theme.text.muted }}>Lade Daten...</span>
        </div>
      ) : (
        <>
          {/* Main Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats && (
              <>
                <HeroStatCard
                  icon={ThermometerSun}
                  label="Temperatur"
                  value={stats.temp.latest || stats.temp.avg}
                  unit="°C"
                  trend={stats.temp.trend}
                  color="#f59e0b"
                  description={`Min ${stats.temp.min.toFixed(1)}° / Max ${stats.temp.max.toFixed(1)}°`}
                  optimal={{ min: 20, max: 28 }}
                />
                <HeroStatCard
                  icon={Droplets}
                  label="Luftfeuchte"
                  value={stats.humidity.latest || stats.humidity.avg}
                  unit="%"
                  trend={stats.humidity.trend}
                  color="#3b82f6"
                  description={`Min ${stats.humidity.min.toFixed(0)}% / Max ${stats.humidity.max.toFixed(0)}%`}
                  optimal={{ min: 50, max: 70 }}
                />
                <HeroStatCard
                  icon={Wind}
                  label="VPD"
                  value={stats.vpd.latest || stats.vpd.avg}
                  unit="kPa"
                  trend={stats.vpd.trend}
                  color="#10b981"
                  description={stats.vpd.avg >= 0.8 && stats.vpd.avg <= 1.2 ? 'Optimal' : 'Anpassen'}
                  optimal={{ min: 0.8, max: 1.2 }}
                />
                <HeroStatCard
                  icon={Sun}
                  label="Licht"
                  value={stats.lux.latest || stats.lux.avg}
                  unit="lx"
                  trend={stats.lux.trend}
                  color="#eab308"
                  description={`DLI: ${((stats.lux.avg * 18 * 0.0036) / 1000).toFixed(1)} mol/m²/d`}
                />
              </>
            )}
          </div>

          {/* Grow Score + Insights Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <GrowScoreCard score={growScore.total} breakdown={growScore.breakdown} />

            <div className="space-y-3">
              <h3 className="font-bold flex items-center gap-2" style={{ color: theme.text.primary }}>
                <Brain size={18} style={{ color: theme.accent.color }} />
                KI Insights
              </h3>
              <div className="space-y-2">
                {insights.slice(0, 3).map((insight, idx) => (
                  <InsightCard key={idx} {...insight} />
                ))}
              </div>
            </div>
          </div>

          {/* Main Chart */}
          <GlassCard className="p-4 md:p-6">
            {/* Chart Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div className="flex items-center gap-3">
                <Activity size={20} style={{ color: theme.accent.color }} />
                <h3 className="font-bold" style={{ color: theme.text.primary }}>Klima-Verlauf</h3>
                <ChartTypeSelector value={climateChartType} onChange={setClimateChartType} theme={theme} />
              </div>

              {/* Visibility Toggles */}
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'temp', label: 'Temp', color: '#f59e0b' },
                  { key: 'humidity', label: 'RLF', color: '#3b82f6' },
                  { key: 'vpd', label: 'VPD', color: '#10b981' }
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => toggleVisibility(item.key)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                    style={{
                      backgroundColor: visibility[item.key] ? `${item.color}20` : theme.bg.hover,
                      color: visibility[item.key] ? item.color : theme.text.muted,
                      border: `1px solid ${visibility[item.key] ? `${item.color}50` : theme.border.default}`
                    }}
                  >
                    {visibility[item.key] ? <Eye size={12} /> : <EyeOff size={12} />}
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart */}
            <div className="h-[400px] w-full">
              <FlexibleClimateChart
                data={rawData}
                chartType={climateChartType}
                visibility={visibility}
                theme={theme}
                timeRange={timeRange}
              />
            </div>

            {/* Chart Type Info */}
            {climateChartType === 'scatter' && (
              <div className="mt-4 text-xs p-3 rounded-lg" style={{ backgroundColor: theme.bg.hover, color: theme.text.muted }}>
                Scatter-Diagramm zeigt Temperatur vs. Luftfeuchte. Punktgröße = VPD
              </div>
            )}
            {climateChartType === 'bar' && (
              <div className="mt-4 text-xs p-3 rounded-lg" style={{ backgroundColor: theme.bg.hover, color: theme.text.muted }}>
                Balkendiagramm zeigt stündliche Durchschnittswerte
              </div>
            )}
          </GlassCard>

          {/* Lux Chart */}
          <GlassCard className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Sun size={20} style={{ color: '#eab308' }} />
                <h3 className="font-bold" style={{ color: theme.text.primary }}>Lichtintensität</h3>
                <ChartTypeSelector value={luxChartType} onChange={setLuxChartType} theme={theme} />
              </div>
              <div
                className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ backgroundColor: 'rgba(234,179,8,0.2)', color: '#eab308' }}
              >
                DLI: {stats ? ((stats.lux.avg * 18 * 0.0036) / 1000).toFixed(1) : 0} mol/m²/d
              </div>
            </div>

            <div className="h-[300px] w-full">
              <FlexibleLuxChart
                data={rawData}
                chartType={luxChartType}
                theme={theme}
              />
            </div>

            {/* DLI Reference */}
            <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
              {[
                { label: 'Seedling', range: '12-20', color: '#60a5fa' },
                { label: 'Veg', range: '20-35', color: '#10b981' },
                { label: 'Bloom', range: '35-50', color: '#a855f7' },
                { label: 'High', range: '50+', color: '#f59e0b' }
              ].map((item) => (
                <div
                  key={item.label}
                  className="p-2 rounded-lg text-center"
                  style={{ backgroundColor: `${item.color}15`, color: item.color }}
                >
                  <div className="font-bold">{item.label}</div>
                  <div className="opacity-75">{item.range}</div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Soil Moisture Grid */}
          <GlassCard className="p-4 md:p-6">
            <div className="flex items-center gap-3 mb-6">
              <Droplets size={20} style={{ color: '#10b981' }} />
              <h3 className="font-bold" style={{ color: theme.text.primary }}>Bodenfeuchtigkeit</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map((idx) => {
                const key = `soil${idx}`;
                const values = rawData.map(d => d[key]).filter(v => v != null);
                const latest = values.length > 0 ? values[values.length - 1] : 0;
                const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;

                const getColor = (v) => {
                  if (v < 30) return '#ef4444';
                  if (v < 50) return '#f59e0b';
                  if (v <= 70) return '#10b981';
                  return '#3b82f6';
                };

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl text-center border"
                    style={{
                      backgroundColor: `${getColor(latest)}10`,
                      borderColor: `${getColor(latest)}30`
                    }}
                  >
                    <div className="text-xs font-semibold mb-2" style={{ color: theme.text.muted }}>
                      Sensor {idx}
                    </div>
                    <div className="text-2xl font-black mb-1" style={{ color: getColor(latest) }}>
                      {latest.toFixed(0)}%
                    </div>
                    <div className="text-xs" style={{ color: theme.text.muted }}>
                      Ø {avg.toFixed(0)}%
                    </div>

                    {/* Mini progress bar */}
                    <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.bg.hover }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, latest)}%`, backgroundColor: getColor(latest) }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          {/* Export Section */}
          <GlassCard className="p-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Download size={20} style={{ color: theme.accent.color }} />
                <div>
                  <h3 className="font-bold" style={{ color: theme.text.primary }}>Daten exportieren</h3>
                  <p className="text-xs" style={{ color: theme.text.muted }}>
                    {rawData.length} Datenpunkte der letzten {timeRange} Stunden
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const csv = ['timestamp,temp,humidity,vpd,lux,soil1,soil2,soil3,soil4,soil5,soil6',
                      ...rawData.map(d => `${new Date(d.timestamp).toISOString()},${d.temp || ''},${d.humidity || ''},${d.vpd || ''},${d.lux || ''},${d.soil1 || ''},${d.soil2 || ''},${d.soil3 || ''},${d.soil4 || ''},${d.soil5 || ''},${d.soil6 || ''}`)
                    ].join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `grow_data_${timeRange}h.csv`;
                    a.click();
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all hover:scale-105"
                  style={{ backgroundColor: theme.bg.hover, color: theme.text.primary }}
                >
                  <FileText size={16} />
                  CSV
                </button>
                <button
                  onClick={() => {
                    const json = JSON.stringify(rawData, null, 2);
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `grow_data_${timeRange}h.json`;
                    a.click();
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all hover:scale-105"
                  style={{ backgroundColor: theme.accent.color, color: '#fff' }}
                >
                  <Database size={16} />
                  JSON
                </button>
              </div>
            </div>
          </GlassCard>
        </>
      )}

      {/* PDF Export Modal */}
      {showPDFExport && (
        <PDFExport
          data={rawData}
          stats={stats}
          growScore={growScore}
          timeRange={timeRange}
          onClose={() => setShowPDFExport(false)}
        />
      )}
    </div>
  );
}
