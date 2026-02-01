import React, { useState, useEffect } from 'react';
import { useTheme } from '../../theme';
import { plantGrowthAPI } from '../../utils/api';
import toast from '../../utils/toast';
import {
  Brain, Camera, Loader2, RefreshCw, Heart, Ruler,
  AlertTriangle, Leaf, CheckCircle, Eye, Sparkles
} from 'lucide-react';

/**
 * Plant Analysis Panel - Gemini Vision AI Ergebnisse
 * Zeigt automatische Pflanzen-Analyse: Breite, Gesundheit, Blattfarbe, Probleme
 */
const PlantAnalysisPanel = ({ plants = [] }) => {
  const { currentTheme } = useTheme();
  const theme = currentTheme;
  const [analysisData, setAnalysisData] = useState({});
  const [analysisStatus, setAnalysisStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const activePlants = plants.filter(p => p.stage !== 'Leer' && p.stage !== 'Geerntet' && p._id);

  useEffect(() => {
    loadAnalysisData();
    loadStatus();
  }, [plants]);

  const loadAnalysisData = async () => {
    if (activePlants.length === 0) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const results = {};

      await Promise.all(
        activePlants.map(async (plant) => {
          try {
            const today = new Date().toISOString().split('T')[0];
            const res = await plantGrowthAPI.getLogByDate(plant._id, today);
            if (res.success && res.data) {
              results[plant._id] = {
                ...res.data,
                plantName: plant.name || `Slot ${plant.slotId}`,
                slotId: plant.slotId,
                strain: plant.strain
              };
            }
          } catch (e) {
            // No data for today
          }
        })
      );

      setAnalysisData(results);
    } catch (error) {
      console.error('Error loading analysis data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatus = async () => {
    try {
      const res = await plantGrowthAPI.getAnalysisStatus();
      if (res.success) {
        setAnalysisStatus(res.data);
      }
    } catch (e) {
      // Service might not be running
    }
  };

  const triggerAnalysis = async () => {
    try {
      setAnalyzing(true);
      toast.loading('AI-Analyse läuft...');
      const res = await plantGrowthAPI.triggerAnalysis();
      if (res.success) {
        toast.dismiss();
        toast.success('AI-Analyse abgeschlossen!');
        await loadAnalysisData();
      }
    } catch (error) {
      toast.dismiss();
      toast.error('Analyse fehlgeschlagen: ' + (error.message || 'Unbekannter Fehler'));
    } finally {
      setAnalyzing(false);
    }
  };

  const getHealthColor = (score) => {
    if (!score) return theme.text.muted;
    if (score >= 8) return '#10b981'; // green
    if (score >= 6) return '#f59e0b'; // yellow
    if (score >= 4) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  const getHealthLabel = (score) => {
    if (!score) return 'Unbekannt';
    if (score >= 9) return 'Exzellent';
    if (score >= 7) return 'Gut';
    if (score >= 5) return 'Mittel';
    if (score >= 3) return 'Schlecht';
    return 'Kritisch';
  };

  const getLeafColorEmoji = (color) => {
    const colorMap = {
      'dunkelgrün': '🟢',
      'hellgrün': '🟡',
      'gelblich': '🟡',
      'braun': '🟤',
      'gefleckt': '⚠️',
    };
    return colorMap[color?.toLowerCase()] || '🌿';
  };

  const getIssueIcon = (issue) => {
    if (typeof issue === 'string') {
      if (issue.includes('Mangel') || issue.includes('mangel') || issue.includes('Nährstoff')) return '🧪';
      if (issue.includes('Schädling') || issue.includes('Insekt')) return '🐛';
      if (issue.includes('Schimmel') || issue.includes('Pilz')) return '🍄';
      if (issue.includes('Stress') || issue.includes('Hitze') || issue.includes('Kälte')) return '🌡️';
      if (issue.includes('Licht') || issue.includes('Verbrennung')) return '☀️';
      if (issue.includes('Wasser') || issue.includes('Über') || issue.includes('trocken')) return '💧';
    }
    return '⚠️';
  };

  if (loading) {
    return (
      <div
        className="rounded-2xl p-6 border flex items-center justify-center h-48"
        style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}
      >
        <Loader2 className="animate-spin text-purple-500" size={32} />
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}
    >
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between"
        style={{ borderColor: theme.border.default }}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10">
            <Brain size={20} className="text-purple-400" />
          </div>
          <div>
            <h3 className="font-bold" style={{ color: theme.text.primary }}>
              AI Pflanzen-Analyse
            </h3>
            <p className="text-xs" style={{ color: theme.text.muted }}>
              {analysisStatus?.lastAnalysis
                ? `Letzte Analyse: ${new Date(analysisStatus.lastAnalysis).toLocaleString('de-DE')}`
                : 'Gemini Vision - automatisch 1x täglich'
              }
            </p>
          </div>
        </div>

        <button
          onClick={triggerAnalysis}
          disabled={analyzing}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            analyzing
              ? 'bg-purple-500/20 text-purple-300 cursor-wait'
              : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/30'
          }`}
        >
          {analyzing ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          {analyzing ? 'Analysiere...' : 'Analyse starten'}
        </button>
      </div>

      {/* Analysis Results */}
      <div className="p-4">
        {Object.keys(analysisData).length === 0 ? (
          <div className="text-center py-8">
            <Eye className="mx-auto mb-3 opacity-30" size={48} style={{ color: theme.text.muted }} />
            <p style={{ color: theme.text.muted }}>Noch keine AI-Analyse vorhanden</p>
            <p className="text-sm mt-1" style={{ color: theme.text.muted }}>
              Starte eine manuelle Analyse oder warte auf die automatische tägliche Analyse
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activePlants.map(plant => {
              const data = analysisData[plant._id];
              if (!data) return null;

              const health = data.health?.overall;
              const leafColor = data.health?.leafColor;
              const issues = data.health?.issues || [];
              const width = data.measurements?.width?.value;
              const height = data.measurements?.height?.value;

              return (
                <div
                  key={plant._id}
                  className="rounded-xl p-4 border transition-all hover:border-purple-500/30"
                  style={{
                    backgroundColor: theme.bg.hover,
                    borderColor: theme.border.default
                  }}
                >
                  {/* Plant Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold" style={{ color: theme.text.primary }}>
                        {plant.name || `Slot ${plant.slotId}`}
                      </h4>
                      <p className="text-xs" style={{ color: theme.text.muted }}>
                        {plant.strain || 'Unbekannt'} • Slot {plant.slotId}
                      </p>
                    </div>
                    <div
                      className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold"
                      style={{
                        backgroundColor: `${getHealthColor(health)}20`,
                        color: getHealthColor(health)
                      }}
                    >
                      <Heart size={14} />
                      {health ? `${health}/10` : '--'}
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="rounded-lg p-2" style={{ backgroundColor: theme.bg.card }}>
                      <p className="text-xs flex items-center gap-1" style={{ color: theme.text.muted }}>
                        <Ruler size={12} /> Höhe
                      </p>
                      <p className="text-lg font-bold" style={{ color: theme.text.primary }}>
                        {height ? `${height} cm` : '--'}
                      </p>
                    </div>
                    <div className="rounded-lg p-2" style={{ backgroundColor: theme.bg.card }}>
                      <p className="text-xs flex items-center gap-1" style={{ color: theme.text.muted }}>
                        <Ruler size={12} className="rotate-90" /> Breite
                      </p>
                      <p className="text-lg font-bold" style={{ color: theme.text.primary }}>
                        {width ? `${width} cm` : '--'}
                      </p>
                    </div>
                  </div>

                  {/* Leaf Color */}
                  <div className="flex items-center gap-2 mb-3 text-sm" style={{ color: theme.text.secondary }}>
                    <Leaf size={14} className="text-emerald-400" />
                    <span>Blattfarbe:</span>
                    <span className="font-medium">
                      {getLeafColorEmoji(leafColor)} {leafColor || 'Unbekannt'}
                    </span>
                  </div>

                  {/* Issues */}
                  {issues.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium flex items-center gap-1" style={{ color: theme.text.muted }}>
                        <AlertTriangle size={12} className="text-amber-500" />
                        Erkannte Probleme
                      </p>
                      {issues.map((issue, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-xs px-2 py-1 rounded-lg"
                          style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}
                        >
                          <span>{getIssueIcon(typeof issue === 'object' ? issue.type : issue)}</span>
                          <span>{typeof issue === 'object' ? issue.description || issue.type : issue}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* No Issues Badge */}
                  {issues.length === 0 && health >= 7 && (
                    <div className="flex items-center gap-2 text-xs px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <CheckCircle size={12} />
                      Keine Probleme erkannt
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlantAnalysisPanel;
