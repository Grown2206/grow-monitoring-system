import React, { useState, useEffect } from 'react';
import { useTheme } from '../../theme';
import { api } from '../../utils/api';
import toast from '../../utils/toast';
import { Card, Badge, Skeleton } from '../ui';
import {
  Zap, Plus, Trash2, Edit2, Play, Pause, Copy, Clock,
  AlertTriangle, CheckCircle, XCircle, Timer, Activity,
  ChevronRight, Settings2, Power, Wand2, Sparkles
} from 'lucide-react';
import RuleBuilder from './RuleBuilder';
import ScenarioBuilder from './ScenarioBuilder';

/**
 * Unified Automation Dashboard
 * Kombiniert If-Then-Else Rules + Smart AI Recommendations
 */
const AutomationDashboard = () => {
  const { currentTheme } = useTheme();
  const theme = currentTheme;

  // State
  const [rules, setRules] = useState([]);
  const [engineStatus, setEngineStatus] = useState({ running: false });
  const [showRuleBuilder, setShowRuleBuilder] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [engineLoading, setEngineLoading] = useState(false);
  const [showScenarioBuilder, setShowScenarioBuilder] = useState(false);

  // Load Rules & Engine Status
  useEffect(() => {
    loadRules();
    loadEngineStatus();
  }, []);

  const loadRules = async () => {
    try {
      const response = await api.get('/automation-rules');
      if (response.success) {
        setRules(response.data);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Rules:', error);
      toast.error('Rules konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const loadEngineStatus = async () => {
    try {
      const response = await api.get('/automation-engine/status');
      if (response.success) {
        setEngineStatus(response.data);
      }
    } catch (error) {
      console.error('Fehler beim Laden des Engine Status:', error);
    }
  };

  const toggleEngine = async () => {
    setEngineLoading(true);
    try {
      const response = await api.post('/automation-engine/toggle');
      if (response.success) {
        setEngineStatus(response.data);
        toast.success(
          response.data.running ? 'Automation Engine gestartet' : 'Automation Engine gestoppt'
        );
      }
    } catch (error) {
      toast.error('Engine konnte nicht umgeschaltet werden');
    } finally {
      setEngineLoading(false);
    }
  };

  const toggleRule = async (ruleId, ruleName) => {
    try {
      const response = await api.post(`/automation-rules/${ruleId}/toggle`);
      if (response.success) {
        loadRules();
        const rule = rules.find(r => r._id === ruleId);
        toast.rule(ruleName, !rule?.enabled);
      }
    } catch (error) {
      toast.error('Rule konnte nicht umgeschaltet werden');
    }
  };

  const deleteRule = async (ruleId, ruleName) => {
    if (!confirm(`Rule "${ruleName}" wirklich löschen?`)) return;

    try {
      const response = await api.delete(`/automation-rules/${ruleId}`);
      if (response.success) {
        loadRules();
        toast.success(`Rule "${ruleName}" gelöscht`);
      }
    } catch (error) {
      toast.error('Rule konnte nicht gelöscht werden');
    }
  };

  const duplicateRule = async (ruleId) => {
    try {
      const original = rules.find(r => r._id === ruleId);
      if (!original) return;

      const duplicate = {
        ...original,
        name: `${original.name} (Kopie)`,
        enabled: false
      };

      delete duplicate._id;
      delete duplicate.createdAt;
      delete duplicate.updatedAt;

      const response = await api.post('/automation-rules', duplicate);
      if (response.success) {
        loadRules();
        toast.success(`Rule "${original.name}" dupliziert`);
      }
    } catch (error) {
      toast.error('Rule konnte nicht dupliziert werden');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'success':
        return <Badge variant="success" dot>Erfolgreich</Badge>;
      case 'failed':
        return <Badge variant="danger" dot>Fehlgeschlagen</Badge>;
      case 'skipped':
        return <Badge variant="warning" dot>Übersprungen</Badge>;
      default:
        return <Badge variant="secondary">Ausstehend</Badge>;
    }
  };

  // Stats berechnen
  const activeRules = rules.filter(r => r.enabled).length;
  const totalExecutions = rules.reduce((sum, r) => sum + (r.executionCount || 0), 0);

  return (
    <div className="space-y-6 p-4 md:p-6 animate-in fade-in duration-500">
      {/* Header mit Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Main Header Card */}
        <Card variant="gradient" className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="p-4 rounded-2xl"
                style={{ backgroundColor: `${theme.accent.color}20` }}
              >
                <Zap size={32} style={{ color: theme.accent.color }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                  Automation Center
                </h1>
                <p className="text-sm" style={{ color: theme.text.muted }}>
                  If-Then-Else Rules & Smart Steuerung
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Engine Status Card */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.text.muted }}>
              Engine Status
            </span>
            <div className={`w-3 h-3 rounded-full ${engineStatus.running ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
          </div>
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{
                backgroundColor: engineStatus.running ? 'rgba(16, 185, 129, 0.1)' : theme.bg.hover,
                color: engineStatus.running ? '#10b981' : theme.text.muted
              }}
            >
              <Power size={20} />
            </div>
            <div className="flex-1">
              <div className="font-bold" style={{ color: theme.text.primary }}>
                {engineStatus.running ? 'Läuft' : 'Gestoppt'}
              </div>
            </div>
            <button
              onClick={toggleEngine}
              disabled={engineLoading}
              className="px-4 py-2 rounded-lg font-bold text-sm transition-all hover:scale-105 disabled:opacity-50"
              style={{
                backgroundColor: engineStatus.running ? '#ef4444' : '#10b981',
                color: '#ffffff'
              }}
            >
              {engineLoading ? (
                <span className="animate-spin">⏳</span>
              ) : engineStatus.running ? (
                <Pause size={16} />
              ) : (
                <Play size={16} />
              )}
            </button>
          </div>
        </Card>

        {/* Stats Card */}
        <Card className="p-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.text.muted }}>
                Aktive Rules
              </span>
              <div className="text-3xl font-bold mt-1" style={{ color: theme.accent.color }}>
                {activeRules}
                <span className="text-sm font-normal" style={{ color: theme.text.muted }}>/{rules.length}</span>
              </div>
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.text.muted }}>
                Ausführungen
              </span>
              <div className="text-3xl font-bold mt-1" style={{ color: theme.text.primary }}>
                {totalExecutions}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Scenario Builder Button */}
        <button
          onClick={() => setShowScenarioBuilder(true)}
          className="flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all hover:scale-[1.02] hover:shadow-lg border-2 border-dashed"
          style={{
            backgroundColor: `${theme.accent.color}10`,
            borderColor: theme.accent.color,
            color: theme.accent.color
          }}
        >
          <Wand2 size={24} />
          Szenarien-Assistent
          <span
            className="ml-2 px-2 py-0.5 text-xs rounded-full"
            style={{ backgroundColor: theme.accent.color, color: '#fff' }}
          >
            NEU
          </span>
        </button>

        {/* Add Rule Button */}
        <button
          onClick={() => setShowRuleBuilder(true)}
          className="flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-bold text-white transition-all hover:scale-[1.02] hover:shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${theme.accent.color}, ${theme.accent.dark})`,
            boxShadow: `0 10px 30px ${theme.accent.color}30`
          }}
        >
          <Plus size={24} />
          Neue Automation Rule erstellen
        </button>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {loading ? (
          // Loading Skeletons
          <div className="space-y-4">
            <Skeleton.RuleCard theme={theme} />
            <Skeleton.RuleCard theme={theme} />
            <Skeleton.RuleCard theme={theme} />
          </div>
        ) : rules.length === 0 ? (
          // Empty State
          <Card className="p-12 text-center">
            <div
              className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ backgroundColor: theme.bg.hover }}
            >
              <Zap size={40} style={{ color: theme.text.muted }} />
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: theme.text.primary }}>
              Keine Rules vorhanden
            </h3>
            <p className="text-sm mb-6" style={{ color: theme.text.muted }}>
              Erstelle deine erste Automation Rule um loszulegen
            </p>
            <button
              onClick={() => setShowRuleBuilder(true)}
              className="px-6 py-3 rounded-xl font-bold transition-all hover:scale-105"
              style={{
                backgroundColor: theme.accent.color,
                color: '#ffffff'
              }}
            >
              <Plus size={20} className="inline mr-2" />
              Erste Rule erstellen
            </button>
          </Card>
        ) : (
          // Rules Grid
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {rules.map((rule) => (
              <Card
                key={rule._id}
                variant={rule.enabled ? 'elevated' : 'default'}
                className="p-5 transition-all hover:shadow-xl"
                style={{
                  borderColor: rule.enabled ? theme.accent.color : theme.border.default,
                  borderWidth: rule.enabled ? '2px' : '1px'
                }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-3 rounded-xl transition-all ${rule.enabled ? 'animate-pulse-subtle' : ''}`}
                      style={{
                        backgroundColor: rule.enabled ? `${theme.accent.color}20` : theme.bg.hover,
                        color: rule.enabled ? theme.accent.color : theme.text.muted
                      }}
                    >
                      <Zap size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg" style={{ color: theme.text.primary }}>
                        {rule.name}
                      </h3>
                      {rule.description && (
                        <p className="text-sm" style={{ color: theme.text.muted }}>
                          {rule.description}
                        </p>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(rule.lastResult)}
                </div>

                {/* Conditions Preview */}
                <div
                  className="mb-4 p-4 rounded-xl"
                  style={{ backgroundColor: theme.bg.main, border: `1px solid ${theme.border.default}` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                      style={{ backgroundColor: `${theme.accent.color}20`, color: theme.accent.color }}>
                      IF
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {rule.conditions.map((cond, idx) => (
                      <div key={idx} className="flex items-center gap-1 text-sm">
                        {cond.type === 'time' ? (
                          <span
                            className="px-2 py-1 rounded-lg flex items-center gap-1"
                            style={{ backgroundColor: theme.bg.hover }}
                          >
                            <Clock size={14} style={{ color: theme.accent.color }} />
                            <span style={{ color: theme.text.secondary }}>
                              {(() => {
                                const start = cond.startTime || cond.timeStart || '??:??';
                                const end = cond.endTime || cond.timeEnd || '??:??';
                                const mode = cond.timeMode || 'between';
                                if (mode === 'between') return `${start} - ${end}`;
                                if (mode === 'before') return `vor ${start}`;
                                if (mode === 'after') return `nach ${start}`;
                                return `${start} - ${end}`;
                              })()}
                            </span>
                          </span>
                        ) : (
                          <span
                            className="px-2 py-1 rounded-lg"
                            style={{ backgroundColor: theme.bg.hover, color: theme.text.secondary }}
                          >
                            {cond.sensor} {cond.operator} <strong style={{ color: theme.accent.color }}>{cond.value}</strong>
                          </span>
                        )}
                        {idx < rule.conditions.length - 1 && (
                          <span className="text-xs font-bold px-1" style={{ color: theme.text.muted }}>
                            {cond.logicOperator || 'AND'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.bg.hover }}>
                    <div className="text-xs" style={{ color: theme.text.muted }}>Priorität</div>
                    <div className="font-bold" style={{ color: theme.text.primary }}>{rule.priority || 50}</div>
                  </div>
                  <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.bg.hover }}>
                    <div className="text-xs" style={{ color: theme.text.muted }}>Ausführungen</div>
                    <div className="font-bold" style={{ color: theme.text.primary }}>{rule.executionCount || 0}</div>
                  </div>
                  <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.bg.hover }}>
                    <div className="text-xs" style={{ color: theme.text.muted }}>Zuletzt</div>
                    <div className="font-bold text-xs" style={{ color: theme.text.primary }}>
                      {rule.lastExecuted ? new Date(rule.lastExecuted).toLocaleDateString('de-DE') : 'Nie'}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleRule(rule._id, rule.name)}
                    className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105"
                    style={{
                      backgroundColor: rule.enabled ? '#10b981' : theme.bg.hover,
                      color: rule.enabled ? '#ffffff' : theme.text.secondary,
                      border: rule.enabled ? 'none' : `1px solid ${theme.border.default}`
                    }}
                  >
                    {rule.enabled ? '✓ Aktiv' : 'Inaktiv'}
                  </button>
                  <button
                    onClick={() => duplicateRule(rule._id)}
                    className="p-2.5 rounded-xl transition-all hover:scale-110"
                    style={{ backgroundColor: theme.bg.hover, color: theme.text.secondary }}
                    title="Duplizieren"
                  >
                    <Copy size={18} />
                  </button>
                  <button
                    onClick={() => {
                      setEditingRule(rule);
                      setShowRuleBuilder(true);
                    }}
                    className="p-2.5 rounded-xl transition-all hover:scale-110"
                    style={{ backgroundColor: '#3b82f6', color: '#ffffff' }}
                    title="Bearbeiten"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => deleteRule(rule._id, rule.name)}
                    className="p-2.5 rounded-xl transition-all hover:scale-110"
                    style={{ backgroundColor: '#ef4444', color: '#ffffff' }}
                    title="Löschen"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* RuleBuilder Modal */}
      {showRuleBuilder && (
        <RuleBuilder
          rule={editingRule}
          onSave={() => {
            setShowRuleBuilder(false);
            setEditingRule(null);
            loadRules();
            toast.success(editingRule ? 'Rule aktualisiert' : 'Neue Rule erstellt');
          }}
          onCancel={() => {
            setShowRuleBuilder(false);
            setEditingRule(null);
          }}
        />
      )}

      {/* ScenarioBuilder Modal */}
      {showScenarioBuilder && (
        <ScenarioBuilder
          theme={theme}
          onClose={() => setShowScenarioBuilder(false)}
          onApply={() => {
            setShowScenarioBuilder(false);
            loadRules();
          }}
        />
      )}
    </div>
  );
};

export default AutomationDashboard;
