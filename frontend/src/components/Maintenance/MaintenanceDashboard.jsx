import { useState, useEffect } from 'react';
import { useTheme } from '../../theme';
import { api } from '../../utils/api';
import {
  Wrench,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  Calendar,
  AlertCircle,
  Zap,
  BarChart3,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

function MaintenanceDashboard() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [maintenanceForm, setMaintenanceForm] = useState({
    type: 'inspection',
    description: '',
    cost: 0
  });
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await api.get('/maintenance/dashboard');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Fehler beim Laden des Dashboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeDevices = async () => {
    try {
      await api.post('/maintenance/initialize');
      await loadDashboard();
    } catch (error) {
      console.error('Fehler beim Initialisieren:', error);
    }
  };

  const updateDevice = async (deviceType, deviceId) => {
    try {
      await api.post(`/maintenance/analytics/${deviceType}/${deviceId}/update`);
      await loadDashboard();
    } catch (error) {
      console.error('Fehler beim Aktualisieren:', error);
    }
  };

  const addMaintenance = async () => {
    if (!selectedDevice) return;

    try {
      await api.post(
        `/maintenance/analytics/${selectedDevice.deviceType}/${selectedDevice.deviceId}/maintenance`,
        maintenanceForm
      );
      setMaintenanceForm({ type: 'inspection', description: '', cost: 0 });
      setSelectedDevice(null);
      await loadDashboard();
    } catch (error) {
      console.error('Fehler beim Hinzufügen der Wartung:', error);
    }
  };

  const getHealthColor = (score) => {
    if (score >= 85) return '#10b981';
    if (score >= 70) return '#3b82f6';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getSeverityColor = (severity) => {
    const colors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#fb923c',
      critical: '#ef4444'
    };
    return colors[severity] || '#6b7280';
  };

  const getDeviceIcon = (deviceType) => {
    const icons = {
      fan_exhaust: '🌀',
      pump: '💧',
      light: '💡',
      sensor: '📡',
      filter: '🔧',
      humidifier: '💨'
    };
    return icons[deviceType] || '⚙️';
  };

  const getDeviceName = (deviceType, deviceId) => {
    const names = {
      fan_exhaust: 'Abluft-Ventilator',
      pump: 'Pumpe',
      light: 'Beleuchtung',
      sensor: 'Sensor',
      filter: 'Filter',
      humidifier: 'Luftbefeuchter'
    };
    return `${names[deviceType] || deviceType} (${deviceId})`;
  };

  const getRecommendedActionText = (action) => {
    const texts = {
      none: 'Keine Aktion erforderlich',
      monitor: 'Überwachen',
      schedule_maintenance: 'Wartung planen',
      urgent_maintenance: 'Dringende Wartung',
      replace: 'Austausch erforderlich'
    };
    return texts[action] || action;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `Überfällig (${Math.abs(diffDays)} Tage)`;
    if (diffDays === 0) return 'Heute';
    if (diffDays === 1) return 'Morgen';
    if (diffDays < 7) return `In ${diffDays} Tagen`;
    return d.toLocaleDateString('de-DE');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" style={{ color: isDark ? '#60a5fa' : '#3b82f6' }} />
      </div>
    );
  }

  if (!dashboardData || dashboardData.summary.totalDevices === 0) {
    return (
      <div className="text-center py-12">
        <Wrench className="w-16 h-16 mx-auto mb-4" style={{ color: isDark ? '#9ca3af' : '#6b7280' }} />
        <h3 className="text-xl font-semibold mb-2" style={{ color: isDark ? '#f3f4f6' : '#111827' }}>
          Keine Geräte gefunden
        </h3>
        <p className="mb-4" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
          Initialisiere Standard-Geräte für Predictive Maintenance
        </p>
        <button
          onClick={initializeDevices}
          className="px-6 py-2 rounded-lg font-medium transition-colors"
          style={{
            backgroundColor: isDark ? '#3b82f6' : '#2563eb',
            color: '#ffffff'
          }}
        >
          Geräte initialisieren
        </button>
      </div>
    );
  }

  const { summary, devices, urgentDevices, upcomingMaintenance, recentAnomalies } = dashboardData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: isDark ? '#f3f4f6' : '#111827' }}>
            <Activity className="w-6 h-6" />
            Predictive Maintenance
          </h2>
          <p style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
            KI-basierte Wartungsvorhersage und Anomalie-Erkennung
          </p>
        </div>
        <button
          onClick={loadDashboard}
          className="p-2 rounded-lg transition-colors"
          style={{
            backgroundColor: isDark ? '#374151' : '#f3f4f6',
            color: isDark ? '#f3f4f6' : '#111827'
          }}
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b" style={{ borderColor: isDark ? '#374151' : '#e5e7eb' }}>
        {['overview', 'devices', 'anomalies', 'maintenance'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 font-medium transition-colors"
            style={{
              color: activeTab === tab
                ? (isDark ? '#60a5fa' : '#2563eb')
                : (isDark ? '#9ca3af' : '#6b7280'),
              borderBottom: activeTab === tab ? '2px solid' : 'none',
              borderColor: activeTab === tab ? (isDark ? '#60a5fa' : '#2563eb') : 'transparent'
            }}
          >
            {tab === 'overview' && 'Übersicht'}
            {tab === 'devices' && 'Geräte'}
            {tab === 'anomalies' && 'Anomalien'}
            {tab === 'maintenance' && 'Wartung'}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: isDark ? '#1f2937' : '#ffffff', border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Gesamt</span>
                <Wrench className="w-5 h-5" style={{ color: isDark ? '#60a5fa' : '#3b82f6' }} />
              </div>
              <div className="text-3xl font-bold" style={{ color: isDark ? '#f3f4f6' : '#111827' }}>
                {summary.totalDevices}
              </div>
              <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                Geräte überwacht
              </div>
            </div>

            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: isDark ? '#1f2937' : '#ffffff', border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Gesund</span>
                <CheckCircle className="w-5 h-5" style={{ color: '#10b981' }} />
              </div>
              <div className="text-3xl font-bold" style={{ color: '#10b981' }}>
                {summary.healthyDevices}
              </div>
              <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                Health Score ≥ 85%
              </div>
            </div>

            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: isDark ? '#1f2937' : '#ffffff', border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Warnung</span>
                <AlertCircle className="w-5 h-5" style={{ color: '#f59e0b' }} />
              </div>
              <div className="text-3xl font-bold" style={{ color: '#f59e0b' }}>
                {summary.warningDevices}
              </div>
              <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                Health Score 50-85%
              </div>
            </div>

            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: isDark ? '#1f2937' : '#ffffff', border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Kritisch</span>
                <AlertTriangle className="w-5 h-5" style={{ color: '#ef4444' }} />
              </div>
              <div className="text-3xl font-bold" style={{ color: '#ef4444' }}>
                {summary.criticalDevices}
              </div>
              <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                Health Score &lt; 50%
              </div>
            </div>
          </div>

          {/* Health Score Chart */}
          <div
            className="p-6 rounded-lg"
            style={{ backgroundColor: isDark ? '#1f2937' : '#ffffff', border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}` }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: isDark ? '#f3f4f6' : '#111827' }}>
              Durchschnittlicher Health Score: {summary.avgHealthScore}%
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={devices.map(d => ({
                name: getDeviceName(d.deviceType, d.deviceId),
                healthScore: d.healthScore,
                fill: getHealthColor(d.healthScore)
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: isDark ? '#9ca3af' : '#6b7280' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                    border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="healthScore" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Urgent Devices */}
            <div
              className="p-6 rounded-lg"
              style={{ backgroundColor: isDark ? '#1f2937' : '#ffffff', border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}` }}
            >
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: isDark ? '#f3f4f6' : '#111827' }}>
                <AlertTriangle className="w-5 h-5" style={{ color: '#ef4444' }} />
                Dringende Wartungen
              </h3>
              {urgentDevices.length === 0 ? (
                <p style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Keine dringenden Wartungen</p>
              ) : (
                <div className="space-y-3">
                  {urgentDevices.map((device, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: isDark ? '#374151' : '#f9fafb' }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium" style={{ color: isDark ? '#f3f4f6' : '#111827' }}>
                          {getDeviceIcon(device.deviceType)} {getDeviceName(device.deviceType, device.deviceId)}
                        </span>
                        <span
                          className="text-sm font-medium px-2 py-1 rounded"
                          style={{
                            backgroundColor: '#fee2e2',
                            color: '#ef4444'
                          }}
                        >
                          {Math.round(device.healthScore)}%
                        </span>
                      </div>
                      <p className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                        {getRecommendedActionText(device.predictions?.recommendedAction)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Anomalies */}
            <div
              className="p-6 rounded-lg"
              style={{ backgroundColor: isDark ? '#1f2937' : '#ffffff', border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}` }}
            >
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: isDark ? '#f3f4f6' : '#111827' }}>
                <Zap className="w-5 h-5" style={{ color: '#f59e0b' }} />
                Aktuelle Anomalien
              </h3>
              {recentAnomalies.length === 0 ? (
                <p style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Keine aktuellen Anomalien</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {recentAnomalies.slice(0, 5).map((anomaly, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: isDark ? '#374151' : '#f9fafb' }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium" style={{ color: isDark ? '#f3f4f6' : '#111827' }}>
                          {getDeviceIcon(anomaly.deviceType)} {anomaly.deviceType}
                        </span>
                        <span
                          className="text-xs px-2 py-1 rounded"
                          style={{
                            backgroundColor: getSeverityColor(anomaly.severity) + '20',
                            color: getSeverityColor(anomaly.severity)
                          }}
                        >
                          {anomaly.severity}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                        {anomaly.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Devices Tab */}
      {activeTab === 'devices' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {devices.map((device, idx) => (
            <div
              key={idx}
              className="p-6 rounded-lg"
              style={{ backgroundColor: isDark ? '#1f2937' : '#ffffff', border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{getDeviceIcon(device.deviceType)}</span>
                  <div>
                    <h3 className="font-semibold" style={{ color: isDark ? '#f3f4f6' : '#111827' }}>
                      {getDeviceName(device.deviceType, device.deviceId)}
                    </h3>
                    <p className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                      {device.metrics?.operatingHours?.toFixed(0) || 0} Betriebsstunden
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => updateDevice(device.deviceType, device.deviceId)}
                  className="p-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: isDark ? '#374151' : '#f3f4f6',
                    color: isDark ? '#f3f4f6' : '#111827'
                  }}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Health Score */}
              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                    Health Score
                  </span>
                  <span
                    className="text-sm font-bold"
                    style={{ color: getHealthColor(device.healthScore) }}
                  >
                    {Math.round(device.healthScore)}%
                  </span>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: isDark ? '#374151' : '#e5e7eb' }}
                >
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${device.healthScore}%`,
                      backgroundColor: getHealthColor(device.healthScore)
                    }}
                  />
                </div>
              </div>

              {/* Predictions */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Nächste Wartung:</span>
                  <span className="font-medium" style={{ color: isDark ? '#f3f4f6' : '#111827' }}>
                    {formatDate(device.predictions?.nextMaintenanceDate)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Ausfallrisiko:</span>
                  <span
                    className="font-medium"
                    style={{
                      color: device.predictions?.failureProbability > 0.7
                        ? '#ef4444'
                        : device.predictions?.failureProbability > 0.4
                        ? '#f59e0b'
                        : '#10b981'
                    }}
                  >
                    {((device.predictions?.failureProbability || 0) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Empfehlung:</span>
                  <span className="font-medium" style={{ color: isDark ? '#f3f4f6' : '#111827' }}>
                    {getRecommendedActionText(device.predictions?.recommendedAction)}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => setSelectedDevice(device)}
                className="w-full py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                style={{
                  backgroundColor: isDark ? '#3b82f6' : '#2563eb',
                  color: '#ffffff'
                }}
              >
                <Calendar className="w-4 h-4" />
                Wartung eintragen
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Anomalies Tab */}
      {activeTab === 'anomalies' && (
        <div className="space-y-4">
          {devices.map((device, idx) => (
            device.anomalies && device.anomalies.length > 0 && (
              <div
                key={idx}
                className="p-6 rounded-lg"
                style={{ backgroundColor: isDark ? '#1f2937' : '#ffffff', border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}` }}
              >
                <h3 className="font-semibold mb-4" style={{ color: isDark ? '#f3f4f6' : '#111827' }}>
                  {getDeviceIcon(device.deviceType)} {getDeviceName(device.deviceType, device.deviceId)}
                </h3>
                <div className="space-y-3">
                  {device.anomalies.slice(-5).reverse().map((anomaly, aIdx) => (
                    <div
                      key={aIdx}
                      className="p-4 rounded-lg"
                      style={{ backgroundColor: isDark ? '#374151' : '#f9fafb' }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium" style={{ color: isDark ? '#f3f4f6' : '#111827' }}>
                          {anomaly.type === 'spike' && '⬆️ Spike'}
                          {anomaly.type === 'degradation' && '⬇️ Degradation'}
                          {anomaly.type === 'drift' && '↗️ Drift'}
                          {anomaly.type === 'unusual_pattern' && '⚡ Ungewöhnlich'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs px-2 py-1 rounded"
                            style={{
                              backgroundColor: getSeverityColor(anomaly.severity) + '20',
                              color: getSeverityColor(anomaly.severity)
                            }}
                          >
                            {anomaly.severity}
                          </span>
                          <span className="text-xs" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                            {new Date(anomaly.timestamp).toLocaleString('de-DE')}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                        {anomaly.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {/* Maintenance Tab */}
      {activeTab === 'maintenance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Upcoming Maintenance */}
          <div
            className="p-6 rounded-lg"
            style={{ backgroundColor: isDark ? '#1f2937' : '#ffffff', border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}` }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: isDark ? '#f3f4f6' : '#111827' }}>
              Anstehende Wartungen
            </h3>
            <div className="space-y-3">
              {upcomingMaintenance.map((device, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg flex items-center justify-between"
                  style={{ backgroundColor: isDark ? '#374151' : '#f9fafb' }}
                >
                  <div>
                    <div className="font-medium" style={{ color: isDark ? '#f3f4f6' : '#111827' }}>
                      {getDeviceIcon(device.deviceType)} {getDeviceName(device.deviceType, device.deviceId)}
                    </div>
                    <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                      {formatDate(device.predictions?.nextMaintenanceDate)}
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5" style={{ color: isDark ? '#9ca3af' : '#6b7280' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Maintenance History */}
          <div
            className="p-6 rounded-lg"
            style={{ backgroundColor: isDark ? '#1f2937' : '#ffffff', border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}` }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: isDark ? '#f3f4f6' : '#111827' }}>
              Wartungshistorie
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {devices.flatMap(device =>
                (device.maintenanceHistory || []).map((record, idx) => ({
                  ...record,
                  deviceType: device.deviceType,
                  deviceId: device.deviceId
                }))
              )
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 10)
                .map((record, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: isDark ? '#374151' : '#f9fafb' }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium" style={{ color: isDark ? '#f3f4f6' : '#111827' }}>
                        {getDeviceIcon(record.deviceType)} {getDeviceName(record.deviceType, record.deviceId)}
                      </span>
                      <span className="text-xs" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                        {new Date(record.timestamp).toLocaleDateString('de-DE')}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                      {record.type} - {record.description}
                    </p>
                    {record.cost > 0 && (
                      <p className="text-xs mt-1" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                        Kosten: {record.cost.toFixed(2)} €
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Form Modal */}
      {selectedDevice && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setSelectedDevice(null)}
        >
          <div
            className="p-6 rounded-lg w-full max-w-md"
            style={{ backgroundColor: isDark ? '#1f2937' : '#ffffff' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#f3f4f6' : '#111827' }}>
              Wartung eintragen
            </h3>
            <p className="mb-4" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
              {getDeviceIcon(selectedDevice.deviceType)} {getDeviceName(selectedDevice.deviceType, selectedDevice.deviceId)}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                  Wartungstyp
                </label>
                <select
                  value={maintenanceForm.type}
                  onChange={e => setMaintenanceForm({ ...maintenanceForm, type: e.target.value })}
                  className="w-full p-2 rounded-lg border"
                  style={{
                    backgroundColor: isDark ? '#374151' : '#ffffff',
                    borderColor: isDark ? '#4b5563' : '#d1d5db',
                    color: isDark ? '#f3f4f6' : '#111827'
                  }}
                >
                  <option value="inspection">Inspektion</option>
                  <option value="cleaning">Reinigung</option>
                  <option value="calibration">Kalibrierung</option>
                  <option value="part_replacement">Teileaustausch</option>
                  <option value="full_service">Vollservice</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                  Beschreibung
                </label>
                <textarea
                  value={maintenanceForm.description}
                  onChange={e => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                  className="w-full p-2 rounded-lg border"
                  rows="3"
                  style={{
                    backgroundColor: isDark ? '#374151' : '#ffffff',
                    borderColor: isDark ? '#4b5563' : '#d1d5db',
                    color: isDark ? '#f3f4f6' : '#111827'
                  }}
                  placeholder="Beschreibe die durchgeführte Wartung..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                  Kosten (€)
                </label>
                <input
                  type="number"
                  value={maintenanceForm.cost}
                  onChange={e => setMaintenanceForm({ ...maintenanceForm, cost: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 rounded-lg border"
                  style={{
                    backgroundColor: isDark ? '#374151' : '#ffffff',
                    borderColor: isDark ? '#4b5563' : '#d1d5db',
                    color: isDark ? '#f3f4f6' : '#111827'
                  }}
                  step="0.01"
                  min="0"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={addMaintenance}
                  className="flex-1 py-2 px-4 rounded-lg font-medium transition-colors"
                  style={{
                    backgroundColor: isDark ? '#3b82f6' : '#2563eb',
                    color: '#ffffff'
                  }}
                >
                  Speichern
                </button>
                <button
                  onClick={() => setSelectedDevice(null)}
                  className="flex-1 py-2 px-4 rounded-lg font-medium transition-colors"
                  style={{
                    backgroundColor: isDark ? '#374151' : '#f3f4f6',
                    color: isDark ? '#f3f4f6' : '#111827'
                  }}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MaintenanceDashboard;
