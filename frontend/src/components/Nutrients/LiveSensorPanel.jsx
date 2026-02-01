import React from 'react';
import { useTheme } from '../../theme';
import {
  Droplet, Beaker, Thermometer, TreePine, Gauge,
  ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import { BIOBIZZ_RULES } from '../../constants/biobizz';

const SENSORS = [
  {
    key: 'ec', icon: Droplet, label: 'EC-Wert',
    color: '#f59e0b', unit: 'mS/cm',
    format: v => v > 0 ? v.toFixed(2) : '--',
    getStatus: (v, schedule) => {
      if (!v) return { label: '--', color: '#6b7280' };
      const target = schedule?.ecTarget;
      if (target && v >= target.min && v <= target.max) return { label: 'Optimal', color: '#10b981' };
      if (v > 2.5) return { label: 'Zu hoch', color: '#ef4444' };
      if (v < 0.4) return { label: 'Zu niedrig', color: '#f59e0b' };
      return { label: 'OK', color: '#10b981' };
    }
  },
  {
    key: 'ph', icon: Beaker, label: 'pH-Wert',
    color: '#3b82f6', unit: '',
    format: v => v > 0 ? v.toFixed(1) : '--',
    getStatus: (v) => {
      if (!v) return { label: '--', color: '#6b7280' };
      if (v >= BIOBIZZ_RULES.phTarget.min && v <= BIOBIZZ_RULES.phTarget.max) return { label: 'Optimal', color: '#10b981' };
      if (v < 5.5 || v > 7.0) return { label: 'Kritisch', color: '#ef4444' };
      return { label: 'Warnung', color: '#f59e0b' };
    }
  },
  {
    key: 'temp', icon: Thermometer, label: 'Wassertemp',
    color: '#ef4444', unit: 'C',
    format: v => v > 0 ? v.toFixed(1) : '--',
    getStatus: (v) => {
      if (!v) return { label: '--', color: '#6b7280' };
      if (v >= 18 && v <= 24) return { label: 'Optimal', color: '#10b981' };
      if (v < 15 || v > 28) return { label: 'Kritisch', color: '#ef4444' };
      return { label: 'OK', color: '#f59e0b' };
    }
  },
  {
    key: 'soilMoisture', icon: TreePine, label: 'Bodenfeuchtigkeit',
    color: '#10b981', unit: '%',
    format: v => v > 0 ? v.toString() : '--',
    getStatus: (v) => {
      if (!v) return { label: '--', color: '#6b7280' };
      if (v >= 40 && v <= 70) return { label: 'Optimal', color: '#10b981' };
      if (v < 25) return { label: 'Trocken', color: '#ef4444' };
      if (v > 80) return { label: 'Nass', color: '#3b82f6' };
      return { label: 'OK', color: '#f59e0b' };
    }
  },
  {
    key: 'tankLevel', icon: Gauge, label: 'Tank',
    color: '#06b6d4', unit: '%',
    format: v => v > 0 ? v.toString() : '--',
    getStatus: (v) => {
      if (!v) return { label: '--', color: '#6b7280' };
      if (v >= 50) return { label: 'Gut', color: '#10b981' };
      if (v >= 20) return { label: 'Mittel', color: '#f59e0b' };
      return { label: 'Niedrig', color: '#ef4444' };
    }
  }
];

export default function LiveSensorPanel({ sensors, getECStatus, getPHStatus, currentSchedule }) {
  const { currentTheme } = useTheme();

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {SENSORS.map(sensor => {
        const value = sensors[sensor.key] || 0;
        const formatted = sensor.format(value);
        const status = sensor.getStatus(value, currentSchedule);

        return (
          <div key={sensor.key}
            className="rounded-xl p-3 border transition-all hover:scale-[1.02] backdrop-blur-sm"
            style={{
              backgroundColor: `${currentTheme.bg.card}90`,
              borderColor: `${sensor.color}15`
            }}>
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${sensor.color}15` }}>
                <sensor.icon size={13} style={{ color: sensor.color }} />
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                style={{ backgroundColor: `${status.color}15`, color: status.color }}>
                {status.label}
              </span>
            </div>
            <div className="text-[10px] font-medium uppercase tracking-wider mb-0.5"
              style={{ color: currentTheme.text.muted }}>
              {sensor.label}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black" style={{ color: sensor.color }}>{formatted}</span>
              {sensor.unit && formatted !== '--' && (
                <span className="text-[10px]" style={{ color: `${sensor.color}80` }}>{sensor.unit}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
