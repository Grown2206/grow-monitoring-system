import React, { useState, useEffect } from 'react';
import { Save, Bell, Wifi, Smartphone, Sliders, Shield, Power, AlertTriangle, CloudOff } from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import { useSocket } from '../context/SocketContext';
import NotificationSettings from './NotificationSettings';
import { Input, SaveButton } from './common/Form';
import { SettingsSection } from './common/Settings';
import useAsyncAction from '../hooks/useAsyncAction';
import { confirmAction } from '../hooks/useConfirm';
import settingsService from '../services/settingsService';
import { useTheme } from '../theme';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('notifications');
  const { showAlert } = useAlert();
  const { sensorData } = useSocket();
  const { currentTheme } = useTheme();
  const { loading, execute } = useAsyncAction();

  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const url = await settingsService.getWebhook();
      if (url) setWebhookUrl(url);
    } catch (e) {
      console.error("Ladefehler:", e);
      showAlert("Konnte Einstellungen nicht laden. Offline Modus?", "warning");
    }
  };

  const handleSaveWebhook = async () => {
    await execute(
      async () => {
        await settingsService.updateWebhook(webhookUrl);
      },
      'Webhook URL aktualisiert'
    );
  };

  const handleSystemAction = async (action) => {
    const actionText = action === 'reboot' ? 'neu starten' : 'zurücksetzen';
    if (!confirmAction(`Möchtest du das System wirklich ${actionText}?`)) return;

    await execute(
      async () => {
        if (action === 'reboot') await settingsService.reboot();
        if (action === 'reset') await settingsService.reset();
      },
      `Befehl "${action}" erfolgreich gesendet`
    );
  };

  const TabButton = ({ id, icon, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors font-medium whitespace-nowrap`}
      style={{
        borderColor: activeTab === id ? currentTheme.accent.color : 'transparent',
        color: activeTab === id ? currentTheme.accent.color : currentTheme.text.secondary,
        backgroundColor: activeTab === id ? currentTheme.bg.card : 'transparent'
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div
      className="border rounded-2xl overflow-hidden shadow-xl max-w-4xl mx-auto mb-10"
      style={{
        backgroundColor: currentTheme.bg.primary,
        borderColor: currentTheme.border.default
      }}
    >
      {/* Header */}
      <div
        className="p-6 border-b"
        style={{
          borderColor: currentTheme.border.default,
          backgroundColor: currentTheme.bg.secondary
        }}
      >
        <h2
          className="text-xl font-bold flex items-center gap-2"
          style={{ color: currentTheme.text.primary }}
        >
          <Sliders style={{ color: currentTheme.colors.primary }} /> Systemeinstellungen
        </h2>
        <p className="text-sm mt-1" style={{ color: currentTheme.text.secondary }}>
          Konfiguriere Automatisierung, Benachrichtigungen und Hardware.
        </p>
      </div>

      {/* Tabs */}
      <div
        className="flex overflow-x-auto border-b"
        style={{
          borderColor: currentTheme.border.default,
          backgroundColor: currentTheme.bg.secondary
        }}
      >
        <TabButton id="notifications" icon={<Bell size={18} />} label="Benachrichtigungen" />
        <TabButton id="network" icon={<Wifi size={18} />} label="Netzwerk" />
        <TabButton id="system" icon={<Shield size={18} />} label="System" />
      </div>

      <div className="p-6 min-h-[400px]">
        {/* NOTIFICATIONS TAB */}
        {activeTab === 'notifications' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Push-Notifications (PWA) */}
            <NotificationSettings />

            {/* Webhook Integration */}
            <SettingsSection title="Webhook Integration" icon={Smartphone}>
              <p className="text-sm mb-4" style={{ color: currentTheme.text.secondary }}>
                Verbinde externe Dienste (Discord, Slack, Telegram)
              </p>

              <div className="space-y-4">
                <Input
                  label="Webhook URL"
                  type="text"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  helper="POST-Anfragen werden bei kritischen Events gesendet (Temperatur, Gas, Wassermangel)"
                  className="font-mono text-sm"
                />

                <div className="flex justify-end pt-2">
                  <SaveButton onClick={handleSaveWebhook} loading={loading} label="Webhook Speichern" />
                </div>
              </div>
            </SettingsSection>
          </div>
        )}

        {/* NETWORK TAB */}
        {activeTab === 'network' && (
          <div className="text-center py-10 animate-in fade-in duration-300" style={{ color: currentTheme.text.secondary }}>
            <Wifi size={48} className="mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-medium mb-2" style={{ color: currentTheme.text.primary }}>
              Netzwerk Status
            </h3>
            <p className="max-w-md mx-auto mb-6">
              Die WLAN Konfiguration ist fest auf dem ESP32 gespeichert (config.h oder im .ino Code).
            </p>

            <div
              className="inline-block p-6 rounded-xl border text-left max-w-lg w-full"
              style={{
                backgroundColor: currentTheme.bg.secondary,
                borderColor: currentTheme.border.default
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <CloudOff style={{ color: currentTheme.text.secondary }} />
                <div>
                  <div className="text-sm font-bold" style={{ color: currentTheme.text.primary }}>
                    Verbindungs-Check
                  </div>
                  <div className="text-xs" style={{ color: currentTheme.text.secondary }}>
                    Prüfe, ob dein ESP32 Daten sendet
                  </div>
                </div>
              </div>
              <ul className="text-sm space-y-2 list-disc list-inside" style={{ color: currentTheme.text.secondary }}>
                <li>ESP32 ist im gleichen 2.4GHz WLAN?</li>
                <li>MQTT Broker IP im ESP Code korrekt?</li>
                <li>Backend (dieser Server) läuft?</li>
              </ul>
            </div>
          </div>
        )}

        {/* SYSTEM TAB */}
        {activeTab === 'system' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div
              className="p-6 rounded-xl"
              style={{
                backgroundColor: `${currentTheme.colors.error}10`,
                borderColor: `${currentTheme.colors.error}30`,
                border: '1px solid'
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="p-3 rounded-full"
                  style={{ backgroundColor: `${currentTheme.colors.error}20`, color: currentTheme.colors.error }}
                >
                  <AlertTriangle />
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-1" style={{ color: currentTheme.colors.error }}>
                    Gefahrenzone
                  </h4>
                  <p className="text-sm mb-6" style={{ color: currentTheme.text.secondary }}>
                    Kritische Aktionen für die Hardware. Nur ausführen, wenn nötig.
                  </p>

                  <div className="flex flex-wrap gap-4">
                    <button
                      onClick={() => handleSystemAction('reboot')}
                      className="px-5 py-2.5 rounded-lg font-medium transition-colors border flex items-center gap-2"
                      style={{
                        backgroundColor: currentTheme.bg.secondary,
                        borderColor: currentTheme.border.default,
                        color: currentTheme.text.primary
                      }}
                    >
                      <Power size={18} /> ESP32 Neustarten
                    </button>

                    <button
                      onClick={() => handleSystemAction('reset')}
                      className="px-5 py-2.5 rounded-lg font-medium transition-colors border flex items-center gap-2"
                      style={{
                        backgroundColor: `${currentTheme.colors.error}20`,
                        borderColor: `${currentTheme.colors.error}50`,
                        color: currentTheme.colors.error
                      }}
                    >
                      <Power size={18} /> Werkseinstellungen
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center text-xs mt-8" style={{ color: currentTheme.text.secondary }}>
              System ID: GM-ESP32-V2 • Firmware: 2.1.0 • Backend: Node.js
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
