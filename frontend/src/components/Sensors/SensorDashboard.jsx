import React, { useState } from 'react';
import SensorCard from './SensorCard';
import CalibrationWizard from './CalibrationWizard';
import SensorHistoryChart from './SensorHistoryChart';
import { Activity, Settings, TrendingUp } from 'lucide-react';

/**
 * Sensor Dashboard
 * Vollständige EC/pH Sensor-Übersicht
 */
const SensorDashboard = () => {
  const [activeView, setActiveView] = useState('overview'); // 'overview', 'calibrate-ec', 'calibrate-ph', 'history'

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Activity className="text-blue-500" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">EC / pH Sensoren</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Atlas Scientific EZO-EC & EZO-pH
            </p>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveView('overview')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === 'overview'
                ? 'bg-white dark:bg-gray-700 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Übersicht
          </button>
          <button
            onClick={() => setActiveView('calibrate-ec')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === 'calibrate-ec'
                ? 'bg-white dark:bg-gray-700 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            EC Kalibrierung
          </button>
          <button
            onClick={() => setActiveView('calibrate-ph')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === 'calibrate-ph'
                ? 'bg-white dark:bg-gray-700 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            pH Kalibrierung
          </button>
          <button
            onClick={() => setActiveView('history')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === 'history'
                ? 'bg-white dark:bg-gray-700 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Historie
          </button>
        </div>
      </div>

      {/* Content */}
      {activeView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SensorCard />
          <div className="space-y-6">
            <SensorHistoryChart compact />
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Settings size={20} />
                EC & pH Grundlagen
              </h3>
              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">EC (Electrical Conductivity)</div>
                  <p>Misst gelöste Nährstoffe in der Lösung. Optimal: 0.8-2.5 mS/cm je nach Wachstumsphase.</p>
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">pH-Wert</div>
                  <p>Bestimmt Nährstoffverfügbarkeit. Optimal: 5.5-6.5 für Hydroponik.</p>
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Kalibrierung</div>
                  <p>Regelmäßige Kalibrierung (alle 30 Tage) gewährleistet genaue Messungen.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeView === 'calibrate-ec' && (
        <div className="max-w-2xl">
          <CalibrationWizard
            sensorType="ec"
            onComplete={() => {
              alert('EC-Kalibrierung abgeschlossen!');
              setActiveView('overview');
            }}
          />
        </div>
      )}

      {activeView === 'calibrate-ph' && (
        <div className="max-w-2xl">
          <CalibrationWizard
            sensorType="ph"
            onComplete={() => {
              alert('pH-Kalibrierung abgeschlossen!');
              setActiveView('overview');
            }}
          />
        </div>
      )}

      {activeView === 'history' && (
        <div>
          <SensorHistoryChart />
        </div>
      )}
    </div>
  );
};

export default SensorDashboard;
