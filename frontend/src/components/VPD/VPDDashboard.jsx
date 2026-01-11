import React, { useState, useEffect } from 'react';
import VPDCard from './VPDCard';
import VPDConfigPanel from './VPDConfigPanel';
import VPDHistoryChart from './VPDHistoryChart';
import { Activity } from 'lucide-react';

/**
 * VPD Dashboard Page
 * Vollständige VPD-Übersicht mit aktuellen Werten, Konfiguration und Historie
 */
const VPDDashboard = () => {
  const [activeView, setActiveView] = useState('overview'); // 'overview', 'config', 'history'

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Activity className="text-blue-500" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">VPD Control</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Vapor Pressure Deficit Steuerung
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
            onClick={() => setActiveView('config')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === 'config'
                ? 'bg-white dark:bg-gray-700 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Konfiguration
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
          <VPDCard />
          <div className="space-y-6">
            <VPDHistoryChart compact />
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-3">Was ist VPD?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Das Dampfdruckdefizit (VPD) ist der Unterschied zwischen dem maximalen
                Wasserdampf, den die Luft aufnehmen kann, und dem tatsächlich vorhandenen
                Wasserdampf. Es ist einer der wichtigsten Faktoren für optimales Pflanzenwachstum.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Keimling</div>
                  <div className="font-semibold">0.4 - 0.8 kPa</div>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Vegetativ</div>
                  <div className="font-semibold">0.8 - 1.2 kPa</div>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Blüte</div>
                  <div className="font-semibold">1.0 - 1.5 kPa</div>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Späte Blüte</div>
                  <div className="font-semibold">1.2 - 1.6 kPa</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeView === 'config' && (
        <div className="max-w-4xl">
          <VPDConfigPanel />
        </div>
      )}

      {activeView === 'history' && (
        <div>
          <VPDHistoryChart />
        </div>
      )}
    </div>
  );
};

export default VPDDashboard;
