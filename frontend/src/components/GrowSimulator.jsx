import React, { useState, useEffect } from 'react';
import { useTheme } from '../theme';
import { api } from '../utils/api';
import {
  Play,
  TrendingUp,
  DollarSign,
  Calendar,
  Sparkles,
  Save,
  Download,
  Upload,
  History,
  Lightbulb,
  AlertCircle,
  BarChart3,
  Leaf,
  Droplets,
  Sun,
  Thermometer,
  Wind,
  Gauge
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

const GrowSimulator = () => {
  const { currentTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('parameters');
  const [loading, setLoading] = useState(false);
  const [simulation, setSimulation] = useState(null);
  const [history, setHistory] = useState([]);
  const [presets, setPresets] = useState([]);

  // Simulation Parameters
  const [simulationName, setSimulationName] = useState('');
  const [strain, setStrain] = useState('');
  const [strainType, setStrainType] = useState('Hybrid');
  const [parameters, setParameters] = useState({
    temperature: 24,
    humidity: 60,
    vpd: 1.0,
    lightHours: 18,
    ppfd: 600,
    dli: 35,
    co2: 400,
    nutrientEC: 1.8,
    pH: 6.0
  });
  const [growPhases, setGrowPhases] = useState([
    { phase: 'seedling', duration: 14, parameters: {} },
    { phase: 'vegetative', duration: 28, parameters: {} },
    { phase: 'flowering', duration: 56, parameters: {} }
  ]);
  const [pricePerGram, setPricePerGram] = useState(10);
  const [monteCarloRuns, setMonteCarloRuns] = useState(1000);

  useEffect(() => {
    loadPresets();
    loadHistory();
  }, []);

  const loadPresets = async () => {
    try {
      const response = await api.get('/simulation/presets');
      setPresets(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Presets:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await api.get('/simulation?limit=10');
      setHistory(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Historie:', error);
    }
  };

  const applyPreset = (preset) => {
    setParameters(preset.parameters);
    setGrowPhases(preset.growPhases);
    setStrainType(preset.strainType);
    setSimulationName(preset.name);
  };

  const runSimulation = async () => {
    if (!simulationName || !strain) {
      alert('Bitte gib einen Namen und eine Sorte ein');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/simulation/run', {
        name: simulationName,
        strain,
        strainType,
        parameters,
        growPhases,
        pricePerGram,
        monteCarloRuns
      });

      setSimulation(response.data);
      setActiveTab('results');
      loadHistory();
    } catch (error) {
      console.error('Fehler bei der Simulation:', error);
      alert('Fehler bei der Simulation: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateParameter = (key, value) => {
    setParameters(prev => ({ ...prev, [key]: parseFloat(value) }));
  };

  const updatePhase = (index, field, value) => {
    const newPhases = [...growPhases];
    if (field === 'duration') {
      newPhases[index].duration = parseInt(value);
    } else {
      newPhases[index][field] = value;
    }
    setGrowPhases(newPhases);
  };

  const exportSimulation = () => {
    if (!simulation) return;
    const dataStr = JSON.stringify(simulation, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `simulation-${simulation.name}-${Date.now()}.json`;
    link.click();
  };

  const totalDays = growPhases.reduce((sum, phase) => sum + phase.duration, 0);

  const Card = ({ children, className = '' }) => (
    <div
      className={`rounded-xl border p-6 shadow-lg ${className}`}
      style={{
        backgroundColor: currentTheme.bg.card,
        borderColor: currentTheme.border.default
      }}
    >
      {children}
    </div>
  );

  const TabButton = ({ value, label, icon, disabled = false }) => (
    <button
      onClick={() => !disabled && setActiveTab(value)}
      disabled={disabled}
      className={`px-4 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'
      }`}
      style={{
        backgroundColor: activeTab === value ? currentTheme.accent.color : currentTheme.bg.hover,
        color: activeTab === value ? '#fff' : currentTheme.text.secondary
      }}
    >
      {icon}
      {label}
    </button>
  );

  const Badge = ({ children, variant = 'default' }) => (
    <span
      className="px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{
        backgroundColor: variant === 'default' ? currentTheme.accent.color + '20' : currentTheme.bg.hover,
        color: variant === 'default' ? currentTheme.accent.color : currentTheme.text.secondary
      }}
    >
      {children}
    </span>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: currentTheme.text.primary }}>
            <Sparkles className="w-8 h-8" style={{ color: currentTheme.accent.color }} />
            Grow-Simulator
          </h1>
          <p className="mt-1" style={{ color: currentTheme.text.secondary }}>
            Was-wäre-wenn Szenarien simulieren und Ertrag vorhersagen
          </p>
        </div>
        <button
          onClick={runSimulation}
          disabled={loading}
          className="px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all hover:opacity-90"
          style={{ backgroundColor: currentTheme.accent.color, color: '#fff' }}
        >
          <Play className="w-5 h-5" />
          {loading ? 'Simuliere...' : 'Simulation starten'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <TabButton value="parameters" label="Parameter" icon={<Thermometer className="w-4 h-4" />} />
        <TabButton value="phases" label="Phasen" icon={<Calendar className="w-4 h-4" />} />
        <TabButton value="presets" label="Presets" icon={<Lightbulb className="w-4 h-4" />} />
        <TabButton value="results" label="Ergebnisse" icon={<BarChart3 className="w-4 h-4" />} disabled={!simulation} />
        <TabButton value="history" label="Historie" icon={<History className="w-4 h-4" />} />
      </div>

      {/* PARAMETERS TAB */}
      {activeTab === 'parameters' && (
        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-bold mb-4" style={{ color: currentTheme.text.primary }}>
              Basis-Informationen
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: currentTheme.text.secondary }}>
                  Simulations-Name
                </label>
                <input
                  type="text"
                  value={simulationName}
                  onChange={(e) => setSimulationName(e.target.value)}
                  placeholder="z.B. High-Yield Versuch 1"
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{
                    backgroundColor: currentTheme.bg.hover,
                    borderColor: currentTheme.border.default,
                    color: currentTheme.text.primary
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: currentTheme.text.secondary }}>
                  Sorte
                </label>
                <input
                  type="text"
                  value={strain}
                  onChange={(e) => setStrain(e.target.value)}
                  placeholder="z.B. Northern Lights"
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{
                    backgroundColor: currentTheme.bg.hover,
                    borderColor: currentTheme.border.default,
                    color: currentTheme.text.primary
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: currentTheme.text.secondary }}>
                  Strain-Typ
                </label>
                <select
                  value={strainType}
                  onChange={(e) => setStrainType(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{
                    backgroundColor: currentTheme.bg.hover,
                    borderColor: currentTheme.border.default,
                    color: currentTheme.text.primary
                  }}
                >
                  <option value="Indica">Indica</option>
                  <option value="Sativa">Sativa</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Autoflower">Autoflower</option>
                  <option value="CBD">CBD</option>
                </select>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: currentTheme.text.primary }}>
              <Thermometer className="w-5 h-5" />
              Umgebungsparameter
            </h2>
            <div className="space-y-6">
              {/* Temperature */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium flex items-center gap-2" style={{ color: currentTheme.text.secondary }}>
                    <Thermometer className="w-4 h-4" />
                    Temperatur: {parameters.temperature}°C
                  </label>
                  <Badge variant={parameters.temperature >= 24 && parameters.temperature <= 26 ? 'default' : 'secondary'}>
                    {parameters.temperature >= 24 && parameters.temperature <= 26 ? 'Optimal' : 'Suboptimal'}
                  </Badge>
                </div>
                <input
                  type="range"
                  min="15"
                  max="35"
                  step="0.5"
                  value={parameters.temperature}
                  onChange={(e) => updateParameter('temperature', e.target.value)}
                  className="w-full"
                />
                <p className="text-xs mt-1" style={{ color: currentTheme.text.muted }}>Optimal: 24-26°C</p>
              </div>

              {/* Humidity */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium flex items-center gap-2" style={{ color: currentTheme.text.secondary }}>
                    <Droplets className="w-4 h-4" />
                    Luftfeuchtigkeit: {parameters.humidity}%
                  </label>
                  <Badge variant={parameters.humidity >= 50 && parameters.humidity <= 70 ? 'default' : 'secondary'}>
                    {parameters.humidity >= 50 && parameters.humidity <= 70 ? 'Optimal' : 'Suboptimal'}
                  </Badge>
                </div>
                <input
                  type="range"
                  min="30"
                  max="90"
                  step="1"
                  value={parameters.humidity}
                  onChange={(e) => updateParameter('humidity', e.target.value)}
                  className="w-full"
                />
                <p className="text-xs mt-1" style={{ color: currentTheme.text.muted }}>Optimal: 50-70%</p>
              </div>

              {/* VPD */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium flex items-center gap-2" style={{ color: currentTheme.text.secondary }}>
                    <Wind className="w-4 h-4" />
                    VPD: {parameters.vpd} kPa
                  </label>
                  <Badge variant={parameters.vpd >= 0.8 && parameters.vpd <= 1.2 ? 'default' : 'secondary'}>
                    {parameters.vpd >= 0.8 && parameters.vpd <= 1.2 ? 'Optimal' : 'Suboptimal'}
                  </Badge>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="2.0"
                  step="0.1"
                  value={parameters.vpd}
                  onChange={(e) => updateParameter('vpd', e.target.value)}
                  className="w-full"
                />
                <p className="text-xs mt-1" style={{ color: currentTheme.text.muted }}>Optimal: 0.8-1.2 kPa</p>
              </div>

              {/* Light Hours */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium flex items-center gap-2" style={{ color: currentTheme.text.secondary }}>
                    <Sun className="w-4 h-4" />
                    Lichtstunden: {parameters.lightHours}h
                  </label>
                </div>
                <input
                  type="range"
                  min="12"
                  max="24"
                  step="1"
                  value={parameters.lightHours}
                  onChange={(e) => updateParameter('lightHours', e.target.value)}
                  className="w-full"
                />
                <p className="text-xs mt-1" style={{ color: currentTheme.text.muted }}>Veg: 18h, Flower: 12h</p>
              </div>

              {/* PPFD */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium" style={{ color: currentTheme.text.secondary }}>
                    PPFD: {parameters.ppfd} μmol/m²/s
                  </label>
                </div>
                <input
                  type="range"
                  min="200"
                  max="1500"
                  step="50"
                  value={parameters.ppfd}
                  onChange={(e) => updateParameter('ppfd', e.target.value)}
                  className="w-full"
                />
                <p className="text-xs mt-1" style={{ color: currentTheme.text.muted }}>Veg: 400-600, Flower: 800-1200</p>
              </div>

              {/* DLI */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium" style={{ color: currentTheme.text.secondary }}>
                    DLI: {parameters.dli} mol/m²/d
                  </label>
                  <Badge variant={parameters.dli >= 30 && parameters.dli <= 40 ? 'default' : 'secondary'}>
                    {parameters.dli >= 30 && parameters.dli <= 40 ? 'Optimal' : 'Suboptimal'}
                  </Badge>
                </div>
                <input
                  type="range"
                  min="15"
                  max="65"
                  step="1"
                  value={parameters.dli}
                  onChange={(e) => updateParameter('dli', e.target.value)}
                  className="w-full"
                />
                <p className="text-xs mt-1" style={{ color: currentTheme.text.muted }}>Optimal: 30-40 mol/m²/d</p>
              </div>

              {/* CO2 */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium" style={{ color: currentTheme.text.secondary }}>
                    CO₂: {parameters.co2} ppm
                  </label>
                  <Badge variant={parameters.co2 >= 1000 ? 'default' : 'secondary'}>
                    {parameters.co2 >= 1000 ? 'Enriched' : 'Ambient'}
                  </Badge>
                </div>
                <input
                  type="range"
                  min="400"
                  max="1500"
                  step="50"
                  value={parameters.co2}
                  onChange={(e) => updateParameter('co2', e.target.value)}
                  className="w-full"
                />
                <p className="text-xs mt-1" style={{ color: currentTheme.text.muted }}>Ambient: 400ppm, Optimal: 1000-1200ppm</p>
              </div>

              {/* EC */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium flex items-center gap-2" style={{ color: currentTheme.text.secondary }}>
                    <Leaf className="w-4 h-4" />
                    Nährstoff EC: {parameters.nutrientEC} mS/cm
                  </label>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={parameters.nutrientEC}
                  onChange={(e) => updateParameter('nutrientEC', e.target.value)}
                  className="w-full"
                />
                <p className="text-xs mt-1" style={{ color: currentTheme.text.muted }}>Veg: 1.2-1.8, Flower: 1.8-2.4</p>
              </div>

              {/* pH */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium" style={{ color: currentTheme.text.secondary }}>
                    pH: {parameters.pH}
                  </label>
                  <Badge variant={parameters.pH >= 5.8 && parameters.pH <= 6.2 ? 'default' : 'secondary'}>
                    {parameters.pH >= 5.8 && parameters.pH <= 6.2 ? 'Optimal' : 'Suboptimal'}
                  </Badge>
                </div>
                <input
                  type="range"
                  min="5.5"
                  max="7.0"
                  step="0.1"
                  value={parameters.pH}
                  onChange={(e) => updateParameter('pH', e.target.value)}
                  className="w-full"
                />
                <p className="text-xs mt-1" style={{ color: currentTheme.text.muted }}>Optimal: 5.8-6.2</p>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: currentTheme.text.primary }}>
              <DollarSign className="w-5 h-5" />
              Wirtschaftliche Parameter
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: currentTheme.text.secondary }}>
                  Preis pro Gramm (€)
                </label>
                <input
                  type="number"
                  value={pricePerGram}
                  onChange={(e) => setPricePerGram(parseFloat(e.target.value))}
                  min={1}
                  max={50}
                  step={0.5}
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{
                    backgroundColor: currentTheme.bg.hover,
                    borderColor: currentTheme.border.default,
                    color: currentTheme.text.primary
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: currentTheme.text.secondary }}>
                  Monte-Carlo Simulationen
                </label>
                <input
                  type="number"
                  value={monteCarloRuns}
                  onChange={(e) => setMonteCarloRuns(parseInt(e.target.value))}
                  min={100}
                  max={10000}
                  step={100}
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{
                    backgroundColor: currentTheme.bg.hover,
                    borderColor: currentTheme.border.default,
                    color: currentTheme.text.primary
                  }}
                />
                <p className="text-xs mt-1" style={{ color: currentTheme.text.muted }}>
                  Mehr Durchläufe = genauere Vorhersage
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* PHASES TAB */}
      {activeTab === 'phases' && (
        <Card>
          <h2 className="text-xl font-bold mb-4" style={{ color: currentTheme.text.primary }}>
            Wachstumsphasen (Gesamt: {totalDays} Tage)
          </h2>
          <div className="space-y-4">
            {growPhases.map((phase, index) => (
              <div
                key={index}
                className="p-4 border rounded-lg"
                style={{ borderColor: currentTheme.border.default }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold capitalize" style={{ color: currentTheme.text.primary }}>
                    {phase.phase}
                  </h3>
                  <Badge>{phase.duration} Tage</Badge>
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: currentTheme.text.secondary }}>
                    Dauer (Tage)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="90"
                    step="1"
                    value={phase.duration}
                    onChange={(e) => updatePhase(index, 'duration', e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* PRESETS TAB */}
      {activeTab === 'presets' && (
        <Card>
          <h2 className="text-xl font-bold mb-4" style={{ color: currentTheme.text.primary }}>
            Vorgefertigte Templates
          </h2>
          <p className="mb-6" style={{ color: currentTheme.text.secondary }}>
            Lade bewährte Konfigurationen für verschiedene Szenarien
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {presets.map((preset, index) => (
              <div
                key={index}
                className="p-4 border rounded-lg hover:border-opacity-100 transition-all cursor-pointer"
                style={{ borderColor: currentTheme.border.default }}
              >
                <h3 className="font-bold text-lg mb-2" style={{ color: currentTheme.text.primary }}>
                  {preset.name}
                </h3>
                <p className="text-sm mb-4" style={{ color: currentTheme.text.secondary }}>
                  {preset.description}
                </p>
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: currentTheme.text.muted }}>Strain-Typ:</span>
                    <span style={{ color: currentTheme.text.primary }}>{preset.strainType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: currentTheme.text.muted }}>Temp:</span>
                    <span style={{ color: currentTheme.text.primary }}>{preset.parameters.temperature}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: currentTheme.text.muted }}>CO₂:</span>
                    <span style={{ color: currentTheme.text.primary }}>{preset.parameters.co2} ppm</span>
                  </div>
                </div>
                <button
                  onClick={() => applyPreset(preset)}
                  className="w-full px-4 py-2 rounded-lg border flex items-center justify-center gap-2 hover:opacity-80 transition-all"
                  style={{
                    borderColor: currentTheme.border.default,
                    color: currentTheme.text.primary
                  }}
                >
                  <Upload className="w-4 h-4" />
                  Template laden
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* RESULTS TAB */}
      {activeTab === 'results' && simulation && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <h3 className="text-sm font-medium mb-2" style={{ color: currentTheme.text.secondary }}>
                Erwarteter Ertrag
              </h3>
              <div className="text-3xl font-bold" style={{ color: currentTheme.accent.color }}>
                {simulation.predictions.yieldGrams.expected.toFixed(0)}g
              </div>
              <p className="text-xs mt-1" style={{ color: currentTheme.text.muted }}>
                {simulation.predictions.yieldGrams.min.toFixed(0)}g - {simulation.predictions.yieldGrams.max.toFixed(0)}g
              </p>
            </Card>

            <Card>
              <h3 className="text-sm font-medium mb-2" style={{ color: currentTheme.text.secondary }}>
                Gesamtdauer
              </h3>
              <div className="text-3xl font-bold" style={{ color: currentTheme.text.primary }}>
                {simulation.predictions.totalDays} Tage
              </div>
              <p className="text-xs mt-1" style={{ color: currentTheme.text.muted }}>
                ~{(simulation.predictions.totalDays / 7).toFixed(1)} Wochen
              </p>
            </Card>

            <Card>
              <h3 className="text-sm font-medium mb-2" style={{ color: currentTheme.text.secondary }}>
                Qualität
              </h3>
              <div className="text-3xl font-bold" style={{ color: currentTheme.accent.color }}>
                {simulation.predictions.quality}%
              </div>
              <p className="text-xs mt-1" style={{ color: currentTheme.text.muted }}>
                Vorhersage: {simulation.predictions.probability}%
              </p>
            </Card>

            <Card>
              <h3 className="text-sm font-medium mb-2" style={{ color: currentTheme.text.secondary }}>
                ROI
              </h3>
              <div className="text-3xl font-bold" style={{ color: currentTheme.accent.color }}>
                {simulation.roi.roiPercentage.toFixed(0)}%
              </div>
              <p className="text-xs mt-1" style={{ color: currentTheme.text.muted }}>
                Gewinn: €{simulation.roi.profit.toFixed(2)}
              </p>
            </Card>
          </div>

          {/* Monte Carlo Distribution */}
          {simulation.monteCarlo && simulation.monteCarlo.results.length > 0 && (
            <Card>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: currentTheme.text.primary }}>
                <TrendingUp className="w-5 h-5" />
                Monte-Carlo Verteilung ({simulation.monteCarlo.runs} Simulationen)
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={simulation.monteCarlo.results.slice(0, 100)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={currentTheme.border.default} />
                  <XAxis dataKey="yield" stroke={currentTheme.text.muted} />
                  <YAxis stroke={currentTheme.text.muted} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: currentTheme.bg.card,
                      borderColor: currentTheme.border.default,
                      color: currentTheme.text.primary
                    }}
                  />
                  <Area type="monotone" dataKey="probability" stroke={currentTheme.accent.color} fill={currentTheme.accent.color} fillOpacity={0.3} />
                  <ReferenceLine x={simulation.predictions.yieldGrams.expected} stroke="red" strokeDasharray="3 3" label="Erwartet" />
                </AreaChart>
              </ResponsiveContainer>
              {simulation.monteCarlo.statistics && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
                  <div className="text-center">
                    <p className="text-xs" style={{ color: currentTheme.text.muted }}>Mittelwert</p>
                    <p className="font-bold text-lg" style={{ color: currentTheme.text.primary }}>
                      {simulation.monteCarlo.statistics.mean.toFixed(0)}g
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs" style={{ color: currentTheme.text.muted }}>Median</p>
                    <p className="font-bold text-lg" style={{ color: currentTheme.text.primary }}>
                      {simulation.monteCarlo.statistics.median.toFixed(0)}g
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs" style={{ color: currentTheme.text.muted }}>Std. Abw.</p>
                    <p className="font-bold text-lg" style={{ color: currentTheme.text.primary }}>
                      {simulation.monteCarlo.statistics.stdDev.toFixed(0)}g
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs" style={{ color: currentTheme.text.muted }}>5% Perzentil</p>
                    <p className="font-bold text-lg" style={{ color: currentTheme.text.primary }}>
                      {simulation.monteCarlo.statistics.percentile5.toFixed(0)}g
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs" style={{ color: currentTheme.text.muted }}>95% Perzentil</p>
                    <p className="font-bold text-lg" style={{ color: currentTheme.text.primary }}>
                      {simulation.monteCarlo.statistics.percentile95.toFixed(0)}g
                    </p>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Cost Breakdown */}
          <Card>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: currentTheme.text.primary }}>
              <DollarSign className="w-5 h-5" />
              Kostenaufschlüsselung
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { name: 'Strom', value: simulation.costs.electricity },
                { name: 'Nährstoffe', value: simulation.costs.nutrients },
                { name: 'Wasser', value: simulation.costs.water },
                { name: 'Substrat', value: simulation.costs.substrate }
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke={currentTheme.border.default} />
                <XAxis dataKey="name" stroke={currentTheme.text.muted} />
                <YAxis stroke={currentTheme.text.muted} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: currentTheme.bg.card,
                    borderColor: currentTheme.border.default,
                    color: currentTheme.text.primary
                  }}
                />
                <Bar dataKey="value" fill={currentTheme.accent.color} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: currentTheme.bg.hover }}>
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold" style={{ color: currentTheme.text.primary }}>Gesamtkosten:</span>
                <span className="text-2xl font-bold" style={{ color: currentTheme.text.primary }}>
                  €{simulation.costs.total.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold" style={{ color: currentTheme.text.primary }}>Geschätzter Umsatz:</span>
                <span className="text-2xl font-bold" style={{ color: currentTheme.accent.color }}>
                  €{simulation.roi.revenue.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t" style={{ borderColor: currentTheme.border.default }}>
                <span className="font-semibold" style={{ color: currentTheme.text.primary }}>Gewinn:</span>
                <span className="text-2xl font-bold" style={{ color: currentTheme.accent.color }}>
                  €{simulation.roi.profit.toFixed(2)}
                </span>
              </div>
            </div>
          </Card>

          {/* Optimization Suggestions */}
          {simulation.optimizationSuggestions && simulation.optimizationSuggestions.length > 0 && (
            <Card>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: currentTheme.text.primary }}>
                <Lightbulb className="w-5 h-5" />
                Optimierungsvorschläge
              </h2>
              <div className="space-y-3">
                {simulation.optimizationSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg border flex gap-3"
                    style={{
                      borderColor: currentTheme.border.default,
                      backgroundColor: currentTheme.bg.hover
                    }}
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: currentTheme.accent.color }} />
                    <div className="flex-1">
                      <div className="font-semibold mb-1" style={{ color: currentTheme.text.primary }}>
                        {suggestion.parameter}
                      </div>
                      <div className="text-sm mb-1" style={{ color: currentTheme.text.secondary }}>
                        Aktuell: {suggestion.currentValue} → Empfohlen: {suggestion.suggestedValue}
                      </div>
                      <div className="text-sm mb-1" style={{ color: currentTheme.text.muted }}>
                        {suggestion.reasoning}
                      </div>
                      <div className="text-sm font-medium" style={{ color: currentTheme.accent.color }}>
                        Erwartete Verbesserung: {suggestion.expectedImprovement}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Export Button */}
          <div className="flex justify-end gap-2">
            <button
              onClick={exportSimulation}
              className="px-4 py-2 rounded-lg border flex items-center gap-2 hover:opacity-80 transition-all"
              style={{
                borderColor: currentTheme.border.default,
                color: currentTheme.text.primary
              }}
            >
              <Download className="w-4 h-4" />
              Ergebnisse exportieren
            </button>
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <Card>
          <h2 className="text-xl font-bold mb-4" style={{ color: currentTheme.text.primary }}>
            Vergangene Simulationen
          </h2>
          <p className="mb-6" style={{ color: currentTheme.text.secondary }}>
            Deine letzten 10 Simulationen
          </p>
          {history.length === 0 ? (
            <p className="text-center py-8" style={{ color: currentTheme.text.muted }}>
              Noch keine Simulationen vorhanden
            </p>
          ) : (
            <div className="space-y-3">
              {history.map((sim) => (
                <div
                  key={sim._id}
                  className="p-4 border rounded-lg hover:border-opacity-100 cursor-pointer transition-all"
                  style={{ borderColor: currentTheme.border.default }}
                  onClick={() => setSimulation(sim)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold" style={{ color: currentTheme.text.primary }}>
                        {sim.name}
                      </h3>
                      <p className="text-sm" style={{ color: currentTheme.text.secondary }}>
                        {sim.strain} ({sim.strainType})
                      </p>
                    </div>
                    <Badge>{new Date(sim.createdAt).toLocaleDateString()}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span style={{ color: currentTheme.text.muted }}>Ertrag: </span>
                      <span className="font-medium" style={{ color: currentTheme.text.primary }}>
                        {sim.predictions.yieldGrams.expected.toFixed(0)}g
                      </span>
                    </div>
                    <div>
                      <span style={{ color: currentTheme.text.muted }}>Dauer: </span>
                      <span className="font-medium" style={{ color: currentTheme.text.primary }}>
                        {sim.predictions.totalDays} Tage
                      </span>
                    </div>
                    <div>
                      <span style={{ color: currentTheme.text.muted }}>ROI: </span>
                      <span className="font-medium" style={{ color: currentTheme.text.primary }}>
                        {sim.roi.roiPercentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default GrowSimulator;
