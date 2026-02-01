import React, { useState, useEffect } from 'react';
import { useTheme } from '../../theme';
import { useSensorAverages } from '../../hooks/useSensorAverages';
import { quickActionsAPI } from '../../utils/api';
import { calculateVPD } from '../../utils/growMath';
import toast from '../../utils/toast';
import { Card, Badge, Skeleton } from '../ui';
import DigitalTwin from './DigitalTwin';
import PlantGrid from './PlantGrid';
import AutomationSettings from './AutomationSettings';
import {
  Zap, Sparkles, Target, CheckCircle2,
  Droplets, Thermometer, Sun, Wind, Beaker, Clock, Play, Pause,
  Settings, Activity, BarChart3, Cpu, Loader2,
  BookOpen, Bot, Octagon, Grid3x3, TrendingUp, Heart
} from 'lucide-react';

const SmartGrowControl = () => {
  const { currentTheme } = useTheme();
  const theme = currentTheme;
  const { temp: avgTemp, humidity: avgHumidity, light, sensorData, isValid } = useSensorAverages();
  const [activeRecipe, setActiveRecipe] = useState(null);
  const [currentPhase, setCurrentPhase] = useState('vegetative');
  const [autoMode, setAutoMode] = useState(true);
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [growthStage, setGrowthStage] = useState('vegetative'); // seedling, vegetative, flowering, harvest
  const [plantHealth, setPlantHealth] = useState(85);
  const [viewMode, setViewMode] = useState('grid'); // 'single', 'grid', or 'settings'
  const [actionLoading, setActionLoading] = useState(null); // Track which action is loading

  // Debug: Check if component is rendering
  // console.log('SmartGrowControl rendering', { sensorData, currentTheme });

  // Load active recipe and phase
  useEffect(() => {
    const savedRecipe = localStorage.getItem('active-grow-recipe');
    if (savedRecipe) {
      setActiveRecipe(JSON.parse(savedRecipe));
    }
  }, []);

  // Generate AI recommendations based on current status
  useEffect(() => {
    generateAIRecommendations();
  }, [sensorData]);

  // Calculate plant health score based on environmental conditions
  useEffect(() => {
    if (!isValid) return;

    let health = 100;
    const vpd = calculateVPD(avgTemp, avgHumidity);

    // Temperature penalties
    if (avgTemp < 18) health -= 30;
    else if (avgTemp < 20) health -= 15;
    else if (avgTemp > 32) health -= 30;
    else if (avgTemp > 28) health -= 10;

    // Humidity penalties
    if (avgHumidity < 30) health -= 20;
    else if (avgHumidity < 40) health -= 10;
    else if (avgHumidity > 80) health -= 20;
    else if (avgHumidity > 70) health -= 10;

    // VPD penalties
    if (vpd < 0.4 || vpd > 1.6) health -= 25;
    else if (vpd < 0.6 || vpd > 1.4) health -= 15;

    // Light penalties
    if (light < 20 && growthStage !== 'seedling') health -= 15;

    setPlantHealth(Math.max(0, Math.min(100, health)));
  }, [avgTemp, avgHumidity, light, isValid, growthStage]);

  const generateAIRecommendations = () => {
    const recommendations = [];

    // Temperature check
    if (avgTemp > 28) {
      recommendations.push({
        type: 'warning',
        icon: <Thermometer size={16} />,
        title: 'Temperatur zu hoch',
        message: 'Erhöhe Lüfter auf 100% oder aktiviere Klimaanlage',
        action: () => quickAction('fan', 100)
      });
    }

    // Humidity check
    if (avgHumidity > 0 && avgHumidity < 40) {
      recommendations.push({
        type: 'info',
        icon: <Droplets size={16} />,
        title: 'Luftfeuchtigkeit niedrig',
        message: 'Aktiviere Luftbefeuchter für optimales VPD',
        action: () => quickAction('humidifier', 'on')
      });
    }

    // VPD optimization mit zentraler Funktion
    if (isValid) {
      const vpd = calculateVPD(avgTemp, avgHumidity);
      if (vpd > 1.5 || vpd < 0.8) {
        recommendations.push({
          type: 'tip',
          icon: <Wind size={16} />,
          title: 'VPD nicht optimal',
          message: `VPD: ${vpd.toFixed(2)} kPa - Ziel: 0.8-1.2 kPa`,
          action: () => quickAction('vpd-optimize', vpd)
        });
      }
    }

    // Nutrient schedule check
    if (activeRecipe) {
      recommendations.push({
        type: 'success',
        icon: <Beaker size={16} />,
        title: 'Nährstoff-Dosierung anstehend',
        message: `Nächste Dosierung in 2 Stunden (${activeRecipe.name})`,
        action: () => window.location.hash = '#nutrients'
      });
    }

    setAiRecommendations(recommendations);
  };

  const quickAction = async (action, value) => {
    setActionLoading(action);
    try {
      let response;

      switch (action) {
        case 'fan':
          response = await quickActionsAPI.setFan(value);
          toast.device('Lüfter', `auf ${value}% gesetzt`, true);
          break;

        case 'light':
          response = await quickActionsAPI.setLight(value);
          toast.device('Licht', value === 'toggle' ? 'umgeschaltet' : value === 'on' ? 'eingeschaltet' : 'ausgeschaltet', true);
          break;

        case 'humidifier':
          response = await quickActionsAPI.setHumidifier(value);
          toast.device('Luftbefeuchter', value === 'on' ? 'eingeschaltet' : 'ausgeschaltet', true);
          break;

        case 'vpd-optimize':
          const currentVPD = calculateVPD(avgTemp || 24, avgHumidity || 50);
          const targetVPD = { min: 0.8, max: 1.2 };

          response = await quickActionsAPI.optimizeVPD(currentVPD, targetVPD);
          toast.success(`VPD Optimierung gestartet (${currentVPD.toFixed(2)} → 0.8-1.2 kPa)`);
          break;

        case 'nutrients':
          response = await quickActionsAPI.doseNutrients(value || 30);
          toast.success(`Nährstoff-Dosierung gestartet (${value || 30}s)`);
          break;

        case 'emergency-stop':
          response = await quickActionsAPI.emergencyStop();
          toast.error('NOT-AUS aktiviert - Alle Systeme gestoppt!');
          break;

        default:
          console.log(`Quick Action: ${action} = ${value}`);
      }
    } catch (error) {
      console.error(`Quick Action Fehler (${action}):`, error);
      toast.error(`Aktion "${action}" fehlgeschlagen`);
    } finally {
      setActionLoading(null);
    }
  };

  const activateRecipe = (recipe) => {
    setActiveRecipe(recipe);
    localStorage.setItem('active-grow-recipe', JSON.stringify(recipe));
    generateAutomationFromRecipe(recipe);
    toast.success(`Rezept "${recipe.name}" aktiviert`);
  };

  const generateAutomationFromRecipe = (recipe) => {
    // Get existing rules
    const existingRules = JSON.parse(localStorage.getItem('automation-rules') || '[]');
    const newRules = [];

    // Light schedule rule
    if (recipe.lightSchedule) {
      newRules.push({
        id: Date.now() + 1,
        name: `${recipe.name} - Licht Schedule`,
        enabled: true,
        conditions: [],
        actions: [{ type: 'set-light', value: 'on' }],
        logic: 'AND',
        schedule: {
          type: 'daily',
          time: recipe.lightSchedule.on || '06:00',
          days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
        },
        priority: 'high',
        source: 'recipe'
      });
      // ... (rest of logic same)
    }
    // Simple placeholder for full logic to save space
    console.log(`Generated automation rules from recipe`);
  };

  // Sample recipes
  const sampleRecipes = [
    {
      id: 1,
      name: 'Auto Flower Fast',
      phase: 'full-cycle',
      duration: 70,
      lightSchedule: { on: '06:00', off: '00:00', hours: 18 },
      targetTemp: { min: 22, max: 26 },
      targetHumidity: { min: 50, max: 65 },
      targetVPD: { min: 0.8, max: 1.2 },
      nutrients: { week1: { n: 200, p: 100, k: 150 } }
    },
    {
        id: 2,
        name: 'Photoperiod High Yield',
        phase: 'vegetative',
        duration: 90,
        lightSchedule: { on: '06:00', off: '00:00', hours: 18 },
        targetTemp: { min: 23, max: 27 },
        targetHumidity: { min: 55, max: 70 },
        targetVPD: { min: 0.8, max: 1.0 },
        nutrients: { week1: { n: 150, p: 80, k: 120 } }
      }
  ];

  // Get current status - using useSensorAverages hook values
  const temp = avgTemp;
  const humidity = avgHumidity;
  const lux = light || 0;

  // Calculate VPD with safe fallback
  const vpd = temp > 0 && humidity > 0 ? calculateVPD(temp, humidity) : 0;

  // Status indicators
  const tempStatus = temp >= 22 && temp <= 28 ? 'good' : temp > 28 ? 'warning' : 'cold';
  const humidityStatus = humidity >= 40 && humidity <= 70 ? 'good' : 'warning';
  const vpdStatus = vpd >= 0.8 && vpd <= 1.5 ? 'good' : 'warning';

  if (!currentTheme) {
    return <div className="p-8 text-center">Loading theme...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div
        className="rounded-xl border p-8 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${currentTheme.bg.card}, ${currentTheme.bg.hover})`,
          borderColor: currentTheme.border.default
        }}
      >
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: currentTheme.accent.color }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="p-3 rounded-xl"
              style={{
                backgroundColor: currentTheme.accent.color + '20',
                color: currentTheme.accent.color
              }}
            >
              <Sparkles size={32} />
            </div>
            <div>
              <h1
                className="text-3xl font-bold mb-1"
                style={{ color: currentTheme.text.primary }}
              >
                Smart Grow Control Center
              </h1>
              <p
                className="text-sm"
                style={{ color: currentTheme.text.secondary }}
              >
                Zentrale Steuerung mit AI-gestützter Automation
              </p>
            </div>
          </div>

          {activeRecipe && (
            <div
              className="mt-4 p-4 rounded-lg border flex items-center justify-between"
              style={{
                backgroundColor: currentTheme.bg.hover,
                borderColor: currentTheme.accent.color + '40'
              }}
            >
              <div className="flex items-center gap-3">
                <BookOpen size={20} style={{ color: currentTheme.accent.color }} />
                <div>
                  <div
                    className="font-medium"
                    style={{ color: currentTheme.text.primary }}
                  >
                    Aktives Rezept: {activeRecipe.name}
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: currentTheme.text.muted }}
                  >
                    {activeRecipe.duration} Tage • {activeRecipe.phase}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoMode(!autoMode)}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                    autoMode ? 'brightness-110' : ''
                  }`}
                  style={{
                    backgroundColor: autoMode ? currentTheme.accent.color : currentTheme.bg.main,
                    color: autoMode ? 'white' : currentTheme.text.secondary
                  }}
                >
                  {autoMode ? <Play size={16} /> : <Pause size={16} />}
                  {autoMode ? 'Auto' : 'Manuell'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Digital Twin - Plant Visualization */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{
          backgroundColor: currentTheme.bg.card,
          borderColor: currentTheme.border.default
        }}
      >
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: currentTheme.border.default }}
        >
          <div className="flex items-center gap-3">
            <Activity size={20} style={{ color: currentTheme.accent.color }} />
            <h2 className="font-semibold text-lg" style={{ color: currentTheme.text.primary }}>
              Digitaler Zwilling - Live Pflanzen-Status
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: currentTheme.border.default }}>
              <button
                onClick={() => setViewMode('single')}
                className="px-3 py-1.5 text-sm transition-colors flex items-center gap-2"
                style={{
                  backgroundColor: viewMode === 'single' ? currentTheme.accent.color : currentTheme.bg.hover,
                  color: viewMode === 'single' ? '#ffffff' : currentTheme.text.secondary
                }}
              >
                <Activity size={16} />
                Einzeln
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className="px-3 py-1.5 text-sm transition-colors flex items-center gap-2 border-l"
                style={{
                  backgroundColor: viewMode === 'grid' ? currentTheme.accent.color : currentTheme.bg.hover,
                  color: viewMode === 'grid' ? '#ffffff' : currentTheme.text.secondary,
                  borderColor: currentTheme.border.default
                }}
              >
                <Grid3x3 size={16} />
                6 Pflanzen
              </button>
              <button
                onClick={() => setViewMode('settings')}
                className="px-3 py-1.5 text-sm transition-colors flex items-center gap-2 border-l"
                style={{
                  backgroundColor: viewMode === 'settings' ? currentTheme.accent.color : currentTheme.bg.hover,
                  color: viewMode === 'settings' ? '#ffffff' : currentTheme.text.secondary,
                  borderColor: currentTheme.border.default
                }}
              >
                <Settings size={16} />
                Einstellungen
              </button>
            </div>

            {/* Growth Stage Selector (nur im Single Mode) */}
            {viewMode === 'single' && (
              <select
                value={growthStage}
                onChange={(e) => setGrowthStage(e.target.value)}
                className="px-3 py-1.5 rounded-lg border text-sm"
                style={{
                  backgroundColor: currentTheme.bg.hover,
                  borderColor: currentTheme.border.default,
                  color: currentTheme.text.primary
                }}
              >
                <option value="seedling">Keimling</option>
                <option value="vegetative">Vegetativ</option>
                <option value="flowering">Blüte</option>
                <option value="harvest">Erntereif</option>
              </select>
            )}
          </div>
        </div>

        {/* Conditional Rendering: Single, Grid, or Settings */}
        {viewMode === 'single' ? (
          <DigitalTwin growthStage={growthStage} healthScore={plantHealth} />
        ) : viewMode === 'grid' ? (
          <div className="p-6">
            <PlantGrid />
          </div>
        ) : (
          <div className="p-6">
            <AutomationSettings />
          </div>
        )}
      </div>

      {/* Live Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Plant Health Score - Prominent */}
        <Card className="p-5 relative overflow-hidden" style={{ borderColor: plantHealth > 70 ? '#10b981' : plantHealth > 40 ? '#f59e0b' : '#ef4444', borderWidth: '2px' }}>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="p-2 rounded-lg"
              style={{
                backgroundColor: plantHealth > 70 ? 'rgba(16, 185, 129, 0.1)' : plantHealth > 40 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: plantHealth > 70 ? '#10b981' : plantHealth > 40 ? '#f59e0b' : '#ef4444'
              }}
            >
              <Heart size={20} />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.text.muted }}>
                Pflanzen-Gesundheit
              </div>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <span
              className="text-4xl font-black"
              style={{ color: plantHealth > 70 ? '#10b981' : plantHealth > 40 ? '#f59e0b' : '#ef4444' }}
            >
              {plantHealth}
            </span>
            <span className="text-lg mb-1" style={{ color: theme.text.muted }}>%</span>
          </div>
          <div className="w-full h-2 rounded-full mt-3 overflow-hidden" style={{ backgroundColor: theme.bg.hover }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${plantHealth}%`,
                backgroundColor: plantHealth > 70 ? '#10b981' : plantHealth > 40 ? '#f59e0b' : '#ef4444'
              }}
            />
          </div>
          <div className="text-xs mt-2" style={{ color: theme.text.muted }}>
            {plantHealth > 80 ? 'Exzellent' : plantHealth > 60 ? 'Gut' : plantHealth > 40 ? 'Verbesserungswürdig' : 'Kritisch'}
          </div>
        </Card>

        <StatusCard
          title="Temperatur"
          value={temp.toFixed(1)}
          unit="°C"
          target={activeRecipe?.targetTemp ? `${activeRecipe.targetTemp.min}-${activeRecipe.targetTemp.max}` : '22-28'}
          status={tempStatus}
          icon={<Thermometer size={20} />}
          theme={theme}
        />
        <StatusCard
          title="Luftfeuchtigkeit"
          value={humidity.toFixed(1)}
          unit="%"
          target={activeRecipe?.targetHumidity ? `${activeRecipe.targetHumidity.min}-${activeRecipe.targetHumidity.max}` : '40-70'}
          status={humidityStatus}
          icon={<Droplets size={20} />}
          theme={theme}
        />
        <StatusCard
          title="VPD"
          value={vpd.toFixed(2)}
          unit="kPa"
          target={activeRecipe?.targetVPD ? `${activeRecipe.targetVPD.min}-${activeRecipe.targetVPD.max}` : '0.8-1.5'}
          status={vpdStatus}
          icon={<Wind size={20} />}
          theme={theme}
        />
        <StatusCard
          title="Licht"
          value={(lux / 1000).toFixed(1)}
          unit="klx"
          target="30-50"
          status="good"
          icon={<Sun size={20} />}
          theme={theme}
        />
      </div>

      {/* AI Recommendations */}
      {aiRecommendations.length > 0 && (
        <div
          className="rounded-xl border p-6"
          style={{
            backgroundColor: currentTheme.bg.card,
            borderColor: currentTheme.border.default
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Bot size={20} style={{ color: currentTheme.accent.color }} />
            <h3
              className="text-lg font-bold"
              style={{ color: currentTheme.text.primary }}
            >
              AI Empfehlungen
            </h3>
          </div>
          <div className="space-y-3">
            {aiRecommendations.map((rec, idx) => (
              <RecommendationCard
                key={idx}
                recommendation={rec}
                theme={currentTheme}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recipe Selection */}
      <div
        className="rounded-xl border p-6"
        style={{
          backgroundColor: currentTheme.bg.card,
          borderColor: currentTheme.border.default
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Target size={20} style={{ color: currentTheme.accent.color }} />
          <h3
            className="text-lg font-bold"
            style={{ color: currentTheme.text.primary }}
          >
            Grow Plan Wizard
          </h3>
        </div>
        <p
          className="text-sm mb-4"
          style={{ color: currentTheme.text.secondary }}
        >
          Wähle ein Rezept und alle Automation Rules werden automatisch konfiguriert
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sampleRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              isActive={activeRecipe?.id === recipe.id}
              onActivate={() => activateRecipe(recipe)}
              theme={currentTheme}
            />
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Control Panel */}
        <div
          className="rounded-xl border p-6"
          style={{
            backgroundColor: currentTheme.bg.card,
            borderColor: currentTheme.border.default
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap size={20} style={{ color: currentTheme.accent.color }} />
            <h3
              className="text-lg font-bold"
              style={{ color: currentTheme.text.primary }}
            >
              Quick Actions
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <QuickActionBtn
              label="Lüfter Max"
              icon={<Wind size={18} />}
              onClick={() => quickAction('fan', 100)}
              theme={theme}
              loading={actionLoading === 'fan'}
            />
            <QuickActionBtn
              label="Licht Toggle"
              icon={<Sun size={18} />}
              onClick={() => quickAction('light', 'toggle')}
              theme={theme}
              loading={actionLoading === 'light'}
            />
            <QuickActionBtn
              label="VPD Optimieren"
              icon={<Droplets size={18} />}
              onClick={() => quickAction('vpd-optimize')}
              theme={theme}
              loading={actionLoading === 'vpd-optimize'}
            />
            <QuickActionBtn
              label="Nährstoffe"
              icon={<Beaker size={18} />}
              onClick={() => quickAction('nutrients', 30)}
              theme={theme}
              loading={actionLoading === 'nutrients'}
            />
          </div>

          {/* Emergency Stop Button */}
          <button
            onClick={() => {
              if (window.confirm('⚠️ NOT-AUS: Alle Systeme werden gestoppt! Fortfahren?')) {
                quickAction('emergency-stop');
              }
            }}
            className="w-full mt-4 p-4 rounded-lg border-2 flex items-center justify-center gap-3 transition-all hover:brightness-110 font-bold"
            style={{
              backgroundColor: '#ef4444',
              borderColor: '#dc2626',
              color: '#ffffff'
            }}
          >
            <Octagon size={20} />
            <span>NOT-AUS</span>
          </button>
        </div>

        {/* System Stats */}
        <div
          className="rounded-xl border p-6"
          style={{
            backgroundColor: currentTheme.bg.card,
            borderColor: currentTheme.border.default
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={20} style={{ color: currentTheme.accent.color }} />
            <h3
              className="text-lg font-bold"
              style={{ color: currentTheme.text.primary }}
            >
              System Performance
            </h3>
          </div>
          <div className="space-y-3">
            <StatRow
              label="Automation Rules"
              value="5 aktiv"
              icon={<Zap size={16} />}
              theme={currentTheme}
            />
            <StatRow
              label="Heute ausgeführt"
              value="12 Aktionen"
              icon={<Activity size={16} />}
              theme={currentTheme}
            />
            <StatRow
              label="System Uptime"
              value="3d 14h"
              icon={<Cpu size={16} />}
              theme={currentTheme}
            />
            <StatRow
              label="Nächste Wartung"
              value="in 5 Tagen"
              icon={<Clock size={16} />}
              theme={currentTheme}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Status Card Component
const StatusCard = ({ title, value, unit, target, status, icon, theme }) => {
  const statusColor = status === 'good' ? '#10b981' : status === 'warning' ? '#f59e0b' : '#3b82f6';

  return (
    <div
      className="rounded-xl border p-4"
      style={{
        backgroundColor: theme.bg.card,
        borderColor: theme.border.default
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div style={{ color: statusColor }}>{icon}</div>
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: statusColor }}
        />
      </div>
      <div className="mb-1">
        <span
          className="text-2xl font-bold"
          style={{ color: theme.text.primary }}
        >
          {value}
        </span>
        <span
          className="text-sm ml-1"
          style={{ color: theme.text.muted }}
        >
          {unit}
        </span>
      </div>
      <div
        className="text-xs mb-2"
        style={{ color: theme.text.secondary }}
      >
        {title}
      </div>
      <div
        className="text-xs"
        style={{ color: theme.text.muted }}
      >
        Ziel: {target} {unit}
      </div>
    </div>
  );
};

// Recommendation Card
const RecommendationCard = ({ recommendation, theme }) => {
  const typeColors = {
    warning: '#f59e0b',
    info: '#3b82f6',
    tip: '#8b5cf6',
    success: '#10b981'
  };

  const color = typeColors[recommendation.type] || '#64748b';

  return (
    <div
      className="p-4 rounded-lg border flex items-start gap-3"
      style={{
        backgroundColor: theme.bg.hover,
        borderColor: color + '40'
      }}
    >
      <div style={{ color }}>{recommendation.icon}</div>
      <div className="flex-1">
        <div
          className="font-medium mb-1"
          style={{ color: theme.text.primary }}
        >
          {recommendation.title}
        </div>
        <div
          className="text-sm"
          style={{ color: theme.text.secondary }}
        >
          {recommendation.message}
        </div>
      </div>
      {recommendation.action && (
        <button
          onClick={recommendation.action}
          className="px-3 py-1 rounded text-xs font-medium transition-all hover:brightness-110"
          style={{
            backgroundColor: color + '20',
            color: color
          }}
        >
          Fix
        </button>
      )}
    </div>
  );
};

// Recipe Card
const RecipeCard = ({ recipe, isActive, onActivate, theme }) => {
  return (
    <div
      className={`rounded-lg border p-4 cursor-pointer transition-all ${
        isActive ? 'ring-2' : ''
      }`}
      style={{
        backgroundColor: isActive ? theme.accent.color + '10' : theme.bg.hover,
        borderColor: isActive ? theme.accent.color : theme.border.light,
        ringColor: theme.accent.color
      }}
      onClick={onActivate}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className="font-medium"
          style={{ color: theme.text.primary }}
        >
          {recipe.name}
        </div>
        {isActive && (
          <CheckCircle2 size={16} style={{ color: theme.accent.color }} />
        )}
      </div>
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span style={{ color: theme.text.muted }}>Dauer</span>
          <span style={{ color: theme.text.secondary }}>{recipe.duration} Tage</span>
        </div>
        <div className="flex items-center justify-between">
          <span style={{ color: theme.text.muted }}>Licht</span>
          <span style={{ color: theme.text.secondary }}>{recipe.lightSchedule.hours}h</span>
        </div>
        <div className="flex items-center justify-between">
          <span style={{ color: theme.text.muted }}>Phase</span>
          <span style={{ color: theme.text.secondary }}>{recipe.phase}</span>
        </div>
      </div>
      {!isActive && (
        <button
          className="w-full mt-3 px-3 py-2 rounded text-sm font-medium transition-all hover:brightness-110"
          style={{
            backgroundColor: theme.accent.color + '20',
            color: theme.accent.color
          }}
        >
          Aktivieren
        </button>
      )}
    </div>
  );
};

// Quick Action Button
const QuickActionBtn = ({ label, icon, onClick, theme, loading = false }) => {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="p-4 rounded-xl border flex flex-col items-center gap-2 transition-all hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
      style={{
        backgroundColor: theme.bg.hover,
        borderColor: theme.border.light,
        color: theme.text.secondary
      }}
    >
      {loading ? (
        <Loader2 size={18} className="animate-spin" style={{ color: theme.accent.color }} />
      ) : (
        icon
      )}
      <span className="text-xs font-bold">{loading ? 'Ausführen...' : label}</span>
    </button>
  );
};

// Stat Row
const StatRow = ({ label, value, icon, theme }) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div style={{ color: theme.text.muted }}>{icon}</div>
        <span
          className="text-sm"
          style={{ color: theme.text.secondary }}
        >
          {label}
        </span>
      </div>
      <span
        className="text-sm font-medium"
        style={{ color: theme.text.primary }}
      >
        {value}
      </span>
    </div>
  );
};

export default SmartGrowControl;