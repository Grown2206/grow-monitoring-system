import React, { useState } from 'react';
import VPDCard from './VPDCard';
import VPDConfigPanel from './VPDConfigPanel';
import VPDHistoryChart from './VPDHistoryChart';
import { Activity } from 'lucide-react';
import { useTheme } from '../../theme';

/**
 * VPD Dashboard Page
 * Vollständige VPD-Übersicht mit aktuellen Werten, Konfiguration und Historie
 */
const VPDDashboard = () => {
  const { currentTheme } = useTheme();
  const [activeView, setActiveView] = useState('overview'); // 'overview', 'config', 'history'

  const tabStyle = (isActive) => ({
    backgroundColor: isActive ? currentTheme.bg.card : 'transparent',
    color: isActive ? currentTheme.text.primary : currentTheme.text.secondary,
    boxShadow: isActive ? '0 1px 2px 0 rgba(0,0,0,0.05)' : 'none'
  });

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="p-3 rounded-lg"
            style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)' }}
          >
            <Activity className="text-blue-500" size={24} />
          </div>
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ color: currentTheme.text.primary }}
            >
              VPD Control
            </h1>
            <p
              className="text-sm"
              style={{ color: currentTheme.text.secondary }}
            >
              Vapor Pressure Deficit Steuerung
            </p>
          </div>
        </div>

        {/* View Tabs */}
        <div
          className="flex gap-2 p-1 rounded-lg"
          style={{ backgroundColor: currentTheme.bg.hover }}
        >
          <button
            onClick={() => setActiveView('overview')}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
            style={tabStyle(activeView === 'overview')}
          >
            Übersicht
          </button>
          <button
            onClick={() => setActiveView('config')}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
            style={tabStyle(activeView === 'config')}
          >
            Konfiguration
          </button>
          <button
            onClick={() => setActiveView('history')}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
            style={tabStyle(activeView === 'history')}
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
            <div
              className="rounded-lg shadow-md p-6"
              style={{
                backgroundColor: currentTheme.bg.card,
                color: currentTheme.text.primary
              }}
            >
              <h3 className="text-lg font-semibold mb-3">Was ist VPD?</h3>
              <p
                className="text-sm mb-4"
                style={{ color: currentTheme.text.secondary }}
              >
                Das Dampfdruckdefizit (VPD) ist der Unterschied zwischen dem maximalen
                Wasserdampf, den die Luft aufnehmen kann, und dem tatsächlich vorhandenen
                Wasserdampf. Es ist einer der wichtigsten Faktoren für optimales Pflanzenwachstum.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div
                  className="rounded-lg p-3"
                  style={{ border: `1px solid ${currentTheme.border.default}` }}
                >
                  <div
                    className="text-xs mb-1"
                    style={{ color: currentTheme.text.secondary }}
                  >
                    Keimling
                  </div>
                  <div
                    className="font-semibold"
                    style={{ color: currentTheme.text.primary }}
                  >
                    0.4 - 0.8 kPa
                  </div>
                </div>
                <div
                  className="rounded-lg p-3"
                  style={{ border: `1px solid ${currentTheme.border.default}` }}
                >
                  <div
                    className="text-xs mb-1"
                    style={{ color: currentTheme.text.secondary }}
                  >
                    Vegetativ
                  </div>
                  <div
                    className="font-semibold"
                    style={{ color: currentTheme.text.primary }}
                  >
                    0.8 - 1.2 kPa
                  </div>
                </div>
                <div
                  className="rounded-lg p-3"
                  style={{ border: `1px solid ${currentTheme.border.default}` }}
                >
                  <div
                    className="text-xs mb-1"
                    style={{ color: currentTheme.text.secondary }}
                  >
                    Blüte
                  </div>
                  <div
                    className="font-semibold"
                    style={{ color: currentTheme.text.primary }}
                  >
                    1.0 - 1.5 kPa
                  </div>
                </div>
                <div
                  className="rounded-lg p-3"
                  style={{ border: `1px solid ${currentTheme.border.default}` }}
                >
                  <div
                    className="text-xs mb-1"
                    style={{ color: currentTheme.text.secondary }}
                  >
                    Späte Blüte
                  </div>
                  <div
                    className="font-semibold"
                    style={{ color: currentTheme.text.primary }}
                  >
                    1.2 - 1.6 kPa
                  </div>
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
