import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../theme';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea
} from 'recharts';
import { BIOBIZZ_RULES } from '../../constants/biobizz';
import {
  History, Calendar, CheckCircle, XCircle, FlaskConical,
  TrendingUp, Loader2, BarChart3
} from 'lucide-react';

const PERIODS = [
  { id: '7', label: '7 Tage' },
  { id: '14', label: '14 Tage' },
  { id: '30', label: '30 Tage' },
  { id: '90', label: '90 Tage' }
];

export default function DosingHistory({ loadLogs, loadStats, logs, stats, loading }) {
  const { currentTheme } = useTheme();
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000).toISOString();
    loadLogs({ limit: 100, startDate, endDate });
    loadStats(startDate, endDate);
  }, [period, loadLogs, loadStats]);

  // Chart-Daten aufbereiten
  const chartData = useMemo(() => {
    if (!logs?.length) return [];
    return logs
      .filter(log => log.measurements?.before?.ec || log.measurements?.after?.ec)
      .map(log => ({
        date: new Date(log.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
        fullDate: new Date(log.createdAt).toLocaleString('de-DE'),
        ecBefore: log.measurements?.before?.ec || null,
        ecAfter: log.measurements?.after?.ec || null,
        phBefore: log.measurements?.before?.ph || null,
        phAfter: log.measurements?.after?.ph || null,
        volume: log.dosage?.totalVolume_ml || 0,
        status: log.status
      }))
      .reverse();
  }, [logs]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl p-3 border shadow-xl backdrop-blur-xl text-xs"
        style={{ backgroundColor: currentTheme.bg.card, borderColor: currentTheme.border.default }}>
        <p className="font-bold mb-1.5" style={{ color: currentTheme.text.primary }}>{label}</p>
        {payload.map((p, i) => p.value != null && (
          <div key={i} className="flex items-center gap-2 py-0.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span style={{ color: currentTheme.text.muted }}>{p.name}:</span>
            <span className="font-bold" style={{ color: p.color }}>
              {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="rounded-3xl border shadow-2xl backdrop-blur-sm overflow-hidden"
      style={{ backgroundColor: `${currentTheme.bg.card}95`, borderColor: 'rgba(255,255,255,0.05)' }}>

      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: currentTheme.border.default }}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20">
            <History size={18} className="text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold" style={{ color: currentTheme.text.primary }}>Dungungs-Historie</h3>
            <p className="text-xs" style={{ color: currentTheme.text.muted }}>
              {logs?.length || 0} Eintrage in {period} Tagen
            </p>
          </div>
        </div>

        {/* Zeitraum */}
        <div className="flex gap-1 p-0.5 rounded-lg" style={{ backgroundColor: currentTheme.bg.hover }}>
          {PERIODS.map(p => (
            <button key={p.id} onClick={() => setPeriod(p.id)}
              className="px-3 py-1.5 rounded-md text-[10px] font-bold transition-all"
              style={{
                backgroundColor: period === p.id ? currentTheme.bg.card : 'transparent',
                color: period === p.id ? currentTheme.accent.color : currentTheme.text.muted
              }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 space-y-5">
        {loading?.logs ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin" size={32} style={{ color: currentTheme.accent.color }} />
          </div>
        ) : (
          <>
            {/* EC/pH Chart */}
            {chartData.length > 0 ? (
              <div className="rounded-xl p-4 border" style={{ backgroundColor: currentTheme.bg.main, borderColor: currentTheme.border.default }}>
                <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
                  style={{ color: currentTheme.text.muted }}>
                  <TrendingUp size={13} /> EC & pH Verlauf
                </h4>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={chartData}>
                    <defs>
                      <linearGradient id="ecGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={currentTheme.components?.chartGrid || 'rgba(255,255,255,0.05)'} vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: currentTheme.text.muted }} />
                    <YAxis yAxisId="ec" tick={{ fontSize: 10, fill: currentTheme.text.muted }} domain={[0, 'auto']}
                      label={{ value: 'EC', position: 'insideTopLeft', fill: '#f59e0b', fontSize: 10 }} />
                    <YAxis yAxisId="ph" orientation="right" tick={{ fontSize: 10, fill: currentTheme.text.muted }} domain={[4, 8]}
                      label={{ value: 'pH', position: 'insideTopRight', fill: '#3b82f6', fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    {/* pH Zielbereich */}
                    <ReferenceArea yAxisId="ph" y1={BIOBIZZ_RULES.phTarget.min} y2={BIOBIZZ_RULES.phTarget.max}
                      fill="#3b82f6" fillOpacity={0.05} />
                    <Area yAxisId="ec" name="EC" dataKey="ecAfter" type="monotone" stroke="#f59e0b" fill="url(#ecGrad)" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} connectNulls />
                    <Line yAxisId="ph" name="pH" dataKey="phAfter" type="monotone" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3, fill: '#3b82f6' }} connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center gap-6 mt-2 text-[10px]">
                  {[{ label: 'EC-Wert', color: '#f59e0b' }, { label: 'pH-Wert', color: '#3b82f6' }].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <div className="w-3 h-0.5 rounded" style={{ backgroundColor: l.color }} />
                      <span style={{ color: currentTheme.text.muted }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="mx-auto mb-3 opacity-20" size={40} style={{ color: currentTheme.text.muted }} />
                <p className="text-sm" style={{ color: currentTheme.text.muted }}>Keine Messdaten im ausgewahlten Zeitraum</p>
              </div>
            )}

            {/* Dosierungs-Events */}
            {logs?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: currentTheme.text.muted }}>
                  Letzte Dungungen
                </h4>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {logs.slice(0, 20).map((log, idx) => (
                    <div key={log._id || idx}
                      className="flex items-center justify-between p-3 rounded-xl border transition-all hover:scale-[1.005]"
                      style={{ backgroundColor: currentTheme.bg.main, borderColor: currentTheme.border.default }}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${log.status === 'success' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                          {log.status === 'success'
                            ? <CheckCircle size={16} className="text-emerald-400" />
                            : <XCircle size={16} className="text-red-400" />
                          }
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium" style={{ color: currentTheme.text.primary }}>
                              {log.dosage?.totalVolume_ml?.toFixed(0) || '?'} ml
                            </span>
                            <span className="text-[10px]" style={{ color: currentTheme.text.muted }}>
                              fur {log.waterVolume_liters || '?'}L
                            </span>
                          </div>
                          <div className="text-[10px] mt-0.5" style={{ color: currentTheme.text.muted }}>
                            {new Date(log.createdAt).toLocaleString('de-DE', {
                              day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                            })}
                            {log.notes && ` &bull; ${log.notes.substring(0, 50)}`}
                          </div>
                        </div>
                      </div>

                      {/* EC/pH Delta */}
                      {(log.measurements?.after?.ec || log.measurements?.after?.ph) && (
                        <div className="flex gap-3 text-right">
                          {log.measurements.after.ec && (
                            <div>
                              <div className="text-[9px] uppercase" style={{ color: currentTheme.text.muted }}>EC</div>
                              <div className="text-xs font-bold" style={{ color: '#f59e0b' }}>
                                {log.measurements.after.ec.toFixed(2)}
                              </div>
                            </div>
                          )}
                          {log.measurements.after.ph && (
                            <div>
                              <div className="text-[9px] uppercase" style={{ color: currentTheme.text.muted }}>pH</div>
                              <div className="text-xs font-bold" style={{ color: '#3b82f6' }}>
                                {log.measurements.after.ph.toFixed(1)}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
