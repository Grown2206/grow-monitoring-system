import React from 'react';
import { useTheme } from '../../theme';
import {
  Sparkles, AlertTriangle, AlertCircle, Info,
  Droplet, Beaker, Gauge, TreePine, ShoppingCart,
  Zap, ArrowRight, FlaskConical
} from 'lucide-react';

const PRIORITY_CONFIG = {
  critical: { color: '#ef4444', icon: AlertCircle, label: 'Kritisch', bg: 'rgba(239,68,68,0.08)' },
  warning:  { color: '#f59e0b', icon: AlertTriangle, label: 'Warnung', bg: 'rgba(245,158,11,0.08)' },
  info:     { color: '#3b82f6', icon: Info, label: 'Info', bg: 'rgba(59,130,246,0.08)' }
};

const TYPE_ICONS = {
  ec: Droplet,
  ph: Beaker,
  tank: Gauge,
  soil: TreePine,
  phase: FlaskConical,
  inventory: ShoppingCart
};

export default function RecommendationEngine({ recommendations, onAction }) {
  const { currentTheme } = useTheme();

  if (!recommendations?.length) return null;

  return (
    <div className="rounded-2xl border backdrop-blur-sm overflow-hidden"
      style={{
        backgroundColor: `${currentTheme.bg.card}90`,
        borderColor: 'rgba(255,255,255,0.05)'
      }}>

      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: currentTheme.border.default }}>
        <Sparkles size={16} className="text-amber-400" />
        <h4 className="text-sm font-bold" style={{ color: currentTheme.text.primary }}>
          Smarte Empfehlungen
        </h4>
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold ml-auto"
          style={{
            backgroundColor: recommendations.some(r => r.priority === 'critical') ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
            color: recommendations.some(r => r.priority === 'critical') ? '#ef4444' : '#f59e0b'
          }}>
          {recommendations.length} Empfehlung{recommendations.length > 1 ? 'en' : ''}
        </span>
      </div>

      {/* Empfehlungen */}
      <div className="p-3 space-y-2">
        {recommendations.map(rec => {
          const config = PRIORITY_CONFIG[rec.priority] || PRIORITY_CONFIG.info;
          const TypeIcon = TYPE_ICONS[rec.type] || Info;
          const PriorityIcon = config.icon;

          return (
            <div key={rec.id}
              className="flex items-start gap-3 p-3 rounded-xl border transition-all hover:scale-[1.002]"
              style={{
                backgroundColor: config.bg,
                borderColor: `${config.color}15`
              }}>

              {/* Icon */}
              <div className="p-2 rounded-lg flex-shrink-0 mt-0.5"
                style={{ backgroundColor: `${config.color}15` }}>
                <TypeIcon size={14} style={{ color: config.color }} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold" style={{ color: config.color }}>
                    {rec.title}
                  </span>
                  <span className="px-1 py-0.5 rounded text-[8px] font-bold uppercase"
                    style={{ backgroundColor: `${config.color}15`, color: config.color }}>
                    {config.label}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: currentTheme.text.muted }}>
                  {rec.message}
                </p>
              </div>

              {/* Action */}
              {rec.action && (
                <button onClick={() => onAction(rec.action)}
                  className="p-2 rounded-lg flex-shrink-0 transition-all hover:scale-110"
                  style={{ backgroundColor: `${config.color}15`, color: config.color }}>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
