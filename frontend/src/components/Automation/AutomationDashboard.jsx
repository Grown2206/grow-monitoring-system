import React, { useState, useEffect } from 'react';
import { useTheme } from '../../theme';
import { useSocket } from '../../context/SocketContext';
import { useAlert } from '../../context/AlertContext';
import { api } from '../../utils/api';
import { calculateVPD } from '../../utils/growMath';
import {
  Zap, Plus, Trash2, Edit2, Play, Pause, Copy, Clock, Thermometer,
  Droplets, Sun, Wind, Activity, History, ChevronDown, ChevronRight,
  Check, X, AlertTriangle, Settings, Sparkles, Target, TrendingUp,
  CheckCircle2, Beaker, Lightbulb, BarChart3, Cpu, BookOpen, Bot
} from 'lucide-react';

/**
 * Unified Automation Dashboard
 * Kombiniert If-Then-Else Rules + Smart AI Recommendations
 */
const AutomationDashboard = () => {
  const { currentTheme } = useTheme();
  const { sensorData } = useSocket();
  const { showAlert } = useAlert();

  // State
  const [activeTab, setActiveTab] = useState('rules'); // 'rules' | 'smart' | 'history'
  const [rules, setRules] = useState([]);
  const [engineStatus, setEngineStatus] = useState({ running: false });
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [showRuleBuilder, setShowRuleBuilder] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load Rules & Engine Status
  useEffect(() => {
    loadRules();
    loadEngineStatus();
  }, []);

  // Generate AI Recommendations
  useEffect(() => {
    if (sensorData) {
      generateAIRecommendations();
    }
  }, [sensorData]);

  const loadRules = async () => {
    try {
      const response = await api.get('/automation-rules');
      if (response.success) {
        setRules(response.data);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Rules:', error);
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
    try {
      const response = await api.post('/automation-engine/toggle');
      if (response.success) {
        setEngineStatus(response.data);
        showAlert(response.message, 'success');
      }
    } catch (error) {
      showAlert('Fehler beim Umschalten der Engine', 'error');
    }
  };

  const toggleRule = async (ruleId) => {
    try {
      const response = await api.post(`/automation-rules/${ruleId}/toggle`);
      if (response.success) {
        loadRules();
        showAlert(response.message, 'success');
      }
    } catch (error) {
      showAlert('Fehler beim Umschalten der Rule', 'error');
    }
  };

  const deleteRule = async (ruleId) => {
    if (!confirm('Rule wirklich löschen?')) return;

    try {
      const response = await api.delete(`/automation-rules/${ruleId}`);
      if (response.success) {
        loadRules();
        showAlert('Rule gelöscht', 'success');
      }
    } catch (error) {
      showAlert('Fehler beim Löschen', 'error');
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
        showAlert('Rule dupliziert', 'success');
      }
    } catch (error) {
      showAlert('Fehler beim Duplizieren', 'error');
    }
  };

  const generateAIRecommendations = () => {
    const recommendations = [];
    const temp = sensorData?.temp;
    const humidity = sensorData?.humidity;
    const vpd = temp && humidity ? calculateVPD(temp, humidity) : null;

    // Temperature check
    if (temp > 28) {
      recommendations.push({
        type: 'warning',
        icon: <Thermometer size={16} />,
        title: 'Temperatur zu hoch',
        message: `${temp.toFixed(1)}°C - Erhöhe Lüfter oder aktiviere Klimaanlage`,
        priority: 'high'
      });
    } else if (temp < 18) {
      recommendations.push({
        type: 'warning',
        icon: <Thermometer size={16} />,
        title: 'Temperatur zu niedrig',
        message: `${temp.toFixed(1)}°C - Aktiviere Heizung`,
        priority: 'high'
      });
    }

    // Humidity check
    if (humidity < 40) {
      recommendations.push({
        type: 'info',
        icon: <Droplets size={16} />,
        title: 'Luftfeuchtigkeit niedrig',
        message: `${humidity.toFixed(1)}% - Aktiviere Luftbefeuchter`,
        priority: 'medium'
      });
    } else if (humidity > 70) {
      recommendations.push({
        type: 'warning',
        icon: <Droplets size={16} />,
        title: 'Luftfeuchtigkeit zu hoch',
        message: `${humidity.toFixed(1)}% - Schimmelgefahr! Erhöhe Lüfter`,
        priority: 'high'
      });
    }

    // VPD check
    if (vpd) {
      if (vpd < 0.4) {
        recommendations.push({
          type: 'info',
          icon: <Activity size={16} />,
          title: 'VPD zu niedrig',
          message: `${vpd.toFixed(2)} kPa - Erhöhe Temperatur oder reduziere Luftfeuchtigkeit`,
          priority: 'medium'
        });
      } else if (vpd > 1.6) {
        recommendations.push({
          type: 'warning',
          icon: <Activity size={16} />,
          title: 'VPD zu hoch',
          message: `${vpd.toFixed(2)} kPa - Reduziere Temperatur oder erhöhe Luftfeuchtigkeit`,
          priority: 'high'
        });
      } else {
        recommendations.push({
          type: 'success',
          icon: <CheckCircle2 size={16} />,
          title: 'VPD optimal',
          message: `${vpd.toFixed(2)} kPa - Perfekt für Wachstum`,
          priority: 'low'
        });
      }
    }

    setAiRecommendations(recommendations);
  };

  const getRuleIcon = (type) => {
    switch (type) {
      case 'temperature': return <Thermometer size={18} />;
      case 'humidity': return <Droplets size={18} />;
      case 'vpd': return <Activity size={18} />;
      case 'time': return <Clock size={18} />;
      case 'light': return <Sun size={18} />;
      default: return <Zap size={18} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-500 bg-green-500/10';
      case 'failed': return 'text-red-500 bg-red-500/10';
      case 'skipped': return 'text-yellow-500 bg-yellow-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'border-red-500/30 bg-red-500/5';
      case 'medium': return 'border-yellow-500/30 bg-yellow-500/5';
      case 'low': return 'border-green-500/30 bg-green-500/5';
      default: return 'border-gray-500/30 bg-gray-500/5';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
            <Zap className="text-purple-500" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Automation Center</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              If-Then-Else Rules & Smart AI Empfehlungen
            </p>
          </div>
        </div>

        {/* Engine Status & Toggle */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${engineStatus.running ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Engine {engineStatus.running ? 'Aktiv' : 'Inaktiv'}
            </span>
          </div>
          <button
            onClick={toggleEngine}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              engineStatus.running
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {engineStatus.running ? <Pause size={16} /> : <Play size={16} />}
            {engineStatus.running ? 'Stoppen' : 'Starten'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'rules'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Zap size={16} className="inline mr-2" />
          Automation Rules ({rules.length})
        </button>
        <button
          onClick={() => setActiveTab('smart')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'smart'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Sparkles size={16} className="inline mr-2" />
          Smart AI ({aiRecommendations.length})
        </button>
      </div>

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          {/* Add Rule Button */}
          <button
            onClick={() => setShowRuleBuilder(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus size={20} />
            Neue Automation Rule erstellen
          </button>

          {/* Rules List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-500 dark:text-gray-400">Keine Rules vorhanden</p>
              <p className="text-sm text-gray-400 mt-2">Erstelle deine erste Automation Rule</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {rules.map((rule) => (
                <div
                  key={rule._id}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${rule.enabled ? 'bg-purple-500/20 text-purple-500' : 'bg-gray-500/20 text-gray-500'}`}>
                        <Zap size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold">{rule.name}</h3>
                        {rule.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{rule.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    {rule.lastResult && (
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(rule.lastResult)}`}>
                        {rule.lastResult}
                      </span>
                    )}
                  </div>

                  {/* Conditions Preview */}
                  <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p className="text-xs font-medium text-gray-500 mb-1">IF</p>
                    <div className="text-sm">
                      {rule.conditions.map((cond, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 mr-2">
                          {cond.sensor && <span className="font-medium">{cond.sensor}</span>}
                          {cond.operator && <span className="text-gray-500">{cond.operator}</span>}
                          {cond.value && <span className="text-purple-600">{cond.value}</span>}
                          {idx < rule.conditions.length - 1 && (
                            <span className="text-gray-400 mx-1">{cond.logicOperator || 'AND'}</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
                    <div>
                      <p className="text-gray-500">Priorität</p>
                      <p className="font-bold">{rule.priority || 50}/100</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Ausführungen</p>
                      <p className="font-bold">{rule.executionCount || 0}x</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Letzte Ausführung</p>
                      <p className="font-bold text-xs">
                        {rule.lastExecuted ? new Date(rule.lastExecuted).toLocaleString('de-DE') : 'Nie'}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleRule(rule._id)}
                      className={`flex-1 px-3 py-2 rounded-lg font-medium transition-colors ${
                        rule.enabled
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {rule.enabled ? 'Aktiviert' : 'Deaktiviert'}
                    </button>
                    <button
                      onClick={() => duplicateRule(rule._id)}
                      className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      title="Duplizieren"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={() => setEditingRule(rule)}
                      className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      title="Bearbeiten"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => deleteRule(rule._id)}
                      className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      title="Löschen"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Smart AI Tab */}
      {activeTab === 'smart' && (
        <div className="space-y-4">
          {/* Current Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center gap-3 mb-2">
                <Thermometer className="text-orange-500" size={20} />
                <span className="text-sm text-gray-500">Temperatur</span>
              </div>
              <p className="text-2xl font-bold">{sensorData?.temp ? `${sensorData.temp.toFixed(1)}°C` : 'N/A'}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center gap-3 mb-2">
                <Droplets className="text-blue-500" size={20} />
                <span className="text-sm text-gray-500">Luftfeuchtigkeit</span>
              </div>
              <p className="text-2xl font-bold">{sensorData?.humidity ? `${sensorData.humidity.toFixed(1)}%` : 'N/A'}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="text-purple-500" size={20} />
                <span className="text-sm text-gray-500">VPD</span>
              </div>
              <p className="text-2xl font-bold">
                {sensorData?.temp && sensorData?.humidity
                  ? `${calculateVPD(sensorData.temp, sensorData.humidity).toFixed(2)} kPa`
                  : 'N/A'}
              </p>
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="space-y-3">
            <h3 className="font-bold flex items-center gap-2">
              <Bot size={20} className="text-purple-500" />
              Smart AI Empfehlungen
            </h3>

            {aiRecommendations.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <CheckCircle2 className="mx-auto text-green-500 mb-4" size={48} />
                <p className="text-lg font-bold text-gray-700 dark:text-gray-300">Alles optimal!</p>
                <p className="text-sm text-gray-500">Keine Empfehlungen - Deine Umgebung ist perfekt</p>
              </div>
            ) : (
              aiRecommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className={`border rounded-xl p-4 ${getPriorityColor(rec.priority)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      rec.type === 'warning' ? 'bg-orange-500/20 text-orange-500' :
                      rec.type === 'success' ? 'bg-green-500/20 text-green-500' :
                      'bg-blue-500/20 text-blue-500'
                    }`}>
                      {rec.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold mb-1">{rec.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{rec.message}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                      rec.priority === 'high' ? 'bg-red-500/20 text-red-600' :
                      rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-600' :
                      'bg-green-500/20 text-green-600'
                    }`}>
                      {rec.priority === 'high' ? 'Dringend' : rec.priority === 'medium' ? 'Normal' : 'Info'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomationDashboard;
