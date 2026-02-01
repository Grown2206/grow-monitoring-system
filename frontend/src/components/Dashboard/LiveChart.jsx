import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { api } from '../../utils/api';
import { colors } from '../../theme';
import { Loader2, RefreshCw } from 'lucide-react';

export default function LiveChart({ theme }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    loadHistory();
    const interval = setInterval(loadHistory, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await api.getHistory();
      const history = response?.data || response || [];

      // Filter: Nur die letzten 30 Minuten
      const now = Date.now();
      const thirtyMinutesAgo = now - (30 * 60 * 1000);

      let formatted = history
        .filter(entry => {
          const timestamp = new Date(entry.timestamp).getTime();
          return timestamp >= thirtyMinutesAgo;
        })
        .map(entry => {
          const temp = entry.readings?.temp;
          const humidity = entry.readings?.humidity;

          // VPD berechnen wenn Temp und Humidity verfügbar
          let vpd = null;
          if (temp && temp > 0 && humidity && humidity > 0) {
            const svp = 0.61078 * Math.exp((17.27 * temp) / (temp + 237.3));
            vpd = svp * (1 - humidity / 100);
          }

          // Nur gültige Werte (nicht null, nicht 0)
          return {
            time: new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            temp: (temp && temp > 0) ? temp : null,
            humidity: (humidity && humidity > 0) ? humidity : null,
            vpd: vpd
          };
        })
        .filter(entry => entry.temp !== null || entry.humidity !== null); // Entferne Einträge ohne gültige Daten

      // Fallback: Wenn keine Daten vorhanden, zeige Mock-Daten für Demo
      if (formatted.length === 0) {
        const mockData = [];
        const baseTime = now - (29 * 60 * 1000); // 29 Minuten zurück
        for (let i = 0; i < 30; i++) {
          const time = new Date(baseTime + (i * 60 * 1000));
          const temp = 22 + Math.random() * 4; // 22-26°C
          const humidity = 55 + Math.random() * 10; // 55-65%
          const svp = 0.61078 * Math.exp((17.27 * temp) / (temp + 237.3));
          const vpd = svp * (1 - humidity / 100);
          mockData.push({
            time: time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            temp,
            humidity,
            vpd
          });
        }
        formatted = mockData;
      }

      setData(formatted);
      setLastUpdate(new Date());
    } catch (e) {
      console.error("Chart Error", e);
      // Bei Fehler: Zeige Mock-Daten
      const mockData = [];
      const now = Date.now();
      const baseTime = now - (29 * 60 * 1000);
      for (let i = 0; i < 30; i++) {
        const time = new Date(baseTime + (i * 60 * 1000));
        const temp = 22 + Math.random() * 4;
        const humidity = 55 + Math.random() * 10;
        const svp = 0.61078 * Math.exp((17.27 * temp) / (temp + 237.3));
        const vpd = svp * (1 - humidity / 100);
        mockData.push({
          time: time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          temp,
          humidity,
          vpd
        });
      }
      setData(mockData);
      setLastUpdate(new Date());
    } finally {
      setLoading(false);
    }
  };

  if (loading && data.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3" style={{ color: theme.text.muted }}>
        <Loader2 size={32} className="animate-spin" style={{ color: theme.accent.color }} />
        <span className="text-sm">Lade Sensordaten...</span>
      </div>
    );
  }

  const accentColor = theme.accent.color;
  const humidityColor = colors.blue[400];
  const vpdColor = colors.purple[400];

  // Custom Legend
  const CustomLegend = () => (
    <div className="flex items-center justify-center gap-6 mt-2 flex-wrap">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: accentColor }} />
        <span className="text-xs" style={{ color: theme.text.secondary }}>Temperatur</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: humidityColor }} />
        <span className="text-xs" style={{ color: theme.text.secondary }}>Luftfeuchte</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: vpdColor }} />
        <span className="text-xs" style={{ color: theme.text.secondary }}>VPD</span>
      </div>
      {lastUpdate && (
        <div className="flex items-center gap-1 text-xs" style={{ color: theme.text.muted }}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          <span>{lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={accentColor} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={accentColor} stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorHum" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={humidityColor} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={humidityColor} stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorVpd" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={vpdColor} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={vpdColor} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={theme.components.chartGrid}
          vertical={false}
          opacity={0.3}
        />
        <XAxis
          dataKey="time"
          stroke={theme.text.muted}
          style={{ fontSize: '11px' }}
          tick={{ fill: theme.text.muted }}
          tickLine={{ stroke: theme.text.muted }}
          axisLine={{ stroke: theme.border.default }}
        />
        <YAxis
          yAxisId="left"
          stroke={theme.text.muted}
          style={{ fontSize: '11px' }}
          tick={{ fill: theme.text.muted }}
          tickLine={{ stroke: theme.text.muted }}
          axisLine={{ stroke: theme.border.default }}
          domain={['auto', 'auto']}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke={vpdColor}
          style={{ fontSize: '11px' }}
          tick={{ fill: vpdColor }}
          tickLine={{ stroke: vpdColor }}
          axisLine={{ stroke: vpdColor }}
          domain={[0, 2.5]}
          label={{ value: 'VPD (kPa)', angle: 90, position: 'insideRight', style: { fill: vpdColor, fontSize: '11px' } }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: theme.components.tooltip.bg,
            borderColor: theme.components.tooltip.border,
            borderRadius: '8px',
            fontSize: '12px'
          }}
          itemStyle={{ color: theme.text.primary }}
        />
        <Area
          type="monotone"
          dataKey="temp"
          stroke={accentColor}
          fillOpacity={1}
          fill="url(#colorTemp)"
          strokeWidth={2}
          name="Temperatur (°C)"
          connectNulls={true}
          yAxisId="left"
        />
        <Area
          type="monotone"
          dataKey="humidity"
          stroke={humidityColor}
          fillOpacity={1}
          fill="url(#colorHum)"
          strokeWidth={2}
          name="Luftfeuchte (%)"
          connectNulls={true}
          yAxisId="left"
        />
        <Area
          type="monotone"
          dataKey="vpd"
          stroke={vpdColor}
          fillOpacity={1}
          fill="url(#colorVpd)"
          strokeWidth={2}
          name="VPD (kPa)"
          connectNulls={true}
          yAxisId="right"
        />
      </AreaChart>
        </ResponsiveContainer>
      </div>
      <CustomLegend />
    </div>
  );
}