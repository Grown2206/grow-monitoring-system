import { useState, useEffect } from 'react';
import { useTheme } from '../../theme';
import { useAlert } from '../../context/AlertContext';
import settingsService from '../../services/settingsService';
import { Settings, Save, RefreshCw, CheckCircle, AlertTriangle, Zap } from 'lucide-react';
import { Input, SaveButton, Checkbox, Toggle } from '../common/Form';
import { SettingsSection } from '../common/Settings';
import useAsyncAction from '../../hooks/useAsyncAction';

function AutomationSettings() {
  const { currentTheme } = useTheme();
  const { showAlert } = useAlert();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const { loading: saving, execute } = useAsyncAction();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await settingsService.getAutomationConfig();
      setConfig(data);
    } catch (error) {
      console.error('Error loading automation config:', error);
      showAlert('Fehler beim Laden der Konfiguration', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    await execute(
      async () => {
        await settingsService.updateAutomationConfig(config);
      },
      'Konfiguration erfolgreich gespeichert!'
    );
  };

  const updateConfig = (path, value) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      const keys = path.split('.');
      let current = newConfig;

      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="animate-spin" size={32} style={{ color: currentTheme.accent.color }} />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-4 rounded-lg border" style={{
        backgroundColor: currentTheme.bg.card,
        borderColor: currentTheme.border.default
      }}>
        <p style={{ color: currentTheme.text.secondary }}>Keine Konfiguration verfügbar</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings size={24} style={{ color: currentTheme.accent.color }} />
          <h2 className="text-2xl font-bold" style={{ color: currentTheme.text.primary }}>
            Erweiterte Automatisierung
          </h2>
        </div>

        <SaveButton onClick={saveConfig} loading={saving} label="Speichern" />
      </div>

      {/* Pflanzenspezifische Einstellungen */}
      <SettingsSection title="Pflanzenspezifische Features" icon={Zap}>

        <div className="space-y-4">
          {/* Pflanzenspezifische Bewässerung */}
          <label className="flex items-center justify-between p-3 rounded-lg hover:bg-opacity-50 transition-all cursor-pointer" style={{
            backgroundColor: currentTheme.bg.hover
          }}>
            <div>
              <div className="font-medium" style={{ color: currentTheme.text.primary }}>
                Pflanzenspezifische Bewässerung
              </div>
              <div className="text-sm" style={{ color: currentTheme.text.secondary }}>
                Bewässerung basierend auf individuellen Pflanzen statt Gruppen
              </div>
            </div>
            <input
              type="checkbox"
              checked={config.plantSpecific?.enabled || false}
              onChange={(e) => updateConfig('plantSpecific.enabled', e.target.checked)}
              className="w-5 h-5 rounded"
            />
          </label>

          {/* Zonen-basierte VPD-Steuerung */}
          <label className="flex items-center justify-between p-3 rounded-lg hover:bg-opacity-50 transition-all cursor-pointer" style={{
            backgroundColor: currentTheme.bg.hover
          }}>
            <div>
              <div className="font-medium" style={{ color: currentTheme.text.primary }}>
                Zonen-basierte VPD-Optimierung
              </div>
              <div className="text-sm" style={{ color: currentTheme.text.secondary }}>
                VPD-Steuerung für bottom/middle/top Zonen separat
              </div>
            </div>
            <input
              type="checkbox"
              checked={config.plantSpecific?.zoneBasedVPD || false}
              onChange={(e) => updateConfig('plantSpecific.zoneBasedVPD', e.target.checked)}
              className="w-5 h-5 rounded"
            />
          </label>
        </div>
      </SettingsSection>

      {/* Wachstumsstadien-basierte Lichtsteuerung */}
      <SettingsSection title="Wachstumsstadien-Lichtsteuerung">

        <div className="space-y-4">
          <label className="flex items-center justify-between p-3 rounded-lg hover:bg-opacity-50 transition-all cursor-pointer" style={{
            backgroundColor: currentTheme.bg.hover
          }}>
            <div>
              <div className="font-medium" style={{ color: currentTheme.text.primary }}>
                Automatische Anpassung aktivieren
              </div>
              <div className="text-sm" style={{ color: currentTheme.text.secondary }}>
                Lichtdauer und Intensität basierend auf Wachstumsstadium
              </div>
            </div>
            <input
              type="checkbox"
              checked={config.growthStageLight?.enabled || false}
              onChange={(e) => updateConfig('growthStageLight.enabled', e.target.checked)}
              className="w-5 h-5 rounded"
            />
          </label>

          {config.growthStageLight?.enabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Seedling */}
              <div className="p-4 rounded-lg border" style={{
                backgroundColor: currentTheme.bg.hover,
                borderColor: currentTheme.border.default
              }}>
                <div className="text-sm font-semibold mb-3" style={{ color: currentTheme.text.primary }}>
                  🌱 Keimling (Seedling)
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs" style={{ color: currentTheme.text.secondary }}>Dauer (Stunden)</label>
                    <input
                      type="number"
                      value={config.growthStageLight.seedling.duration}
                      onChange={(e) => updateConfig('growthStageLight.seedling.duration', parseInt(e.target.value))}
                      className="w-full px-3 py-2 rounded border mt-1"
                      style={{
                        backgroundColor: currentTheme.bg.card,
                        borderColor: currentTheme.border.default,
                        color: currentTheme.text.primary
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-xs" style={{ color: currentTheme.text.secondary }}>Intensität (%)</label>
                    <input
                      type="number"
                      value={config.growthStageLight.seedling.intensity}
                      onChange={(e) => updateConfig('growthStageLight.seedling.intensity', parseInt(e.target.value))}
                      className="w-full px-3 py-2 rounded border mt-1"
                      style={{
                        backgroundColor: currentTheme.bg.card,
                        borderColor: currentTheme.border.default,
                        color: currentTheme.text.primary
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Vegetative */}
              <div className="p-4 rounded-lg border" style={{
                backgroundColor: currentTheme.bg.hover,
                borderColor: currentTheme.border.default
              }}>
                <div className="text-sm font-semibold mb-3" style={{ color: currentTheme.text.primary }}>
                  🌿 Vegetativ (Vegetative)
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs" style={{ color: currentTheme.text.secondary }}>Dauer (Stunden)</label>
                    <input
                      type="number"
                      value={config.growthStageLight.vegetative.duration}
                      onChange={(e) => updateConfig('growthStageLight.vegetative.duration', parseInt(e.target.value))}
                      className="w-full px-3 py-2 rounded border mt-1"
                      style={{
                        backgroundColor: currentTheme.bg.card,
                        borderColor: currentTheme.border.default,
                        color: currentTheme.text.primary
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-xs" style={{ color: currentTheme.text.secondary }}>Intensität (%)</label>
                    <input
                      type="number"
                      value={config.growthStageLight.vegetative.intensity}
                      onChange={(e) => updateConfig('growthStageLight.vegetative.intensity', parseInt(e.target.value))}
                      className="w-full px-3 py-2 rounded border mt-1"
                      style={{
                        backgroundColor: currentTheme.bg.card,
                        borderColor: currentTheme.border.default,
                        color: currentTheme.text.primary
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Flowering */}
              <div className="p-4 rounded-lg border" style={{
                backgroundColor: currentTheme.bg.hover,
                borderColor: currentTheme.border.default
              }}>
                <div className="text-sm font-semibold mb-3" style={{ color: currentTheme.text.primary }}>
                  🌺 Blüte (Flowering)
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs" style={{ color: currentTheme.text.secondary }}>Dauer (Stunden)</label>
                    <input
                      type="number"
                      value={config.growthStageLight.flowering.duration}
                      onChange={(e) => updateConfig('growthStageLight.flowering.duration', parseInt(e.target.value))}
                      className="w-full px-3 py-2 rounded border mt-1"
                      style={{
                        backgroundColor: currentTheme.bg.card,
                        borderColor: currentTheme.border.default,
                        color: currentTheme.text.primary
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-xs" style={{ color: currentTheme.text.secondary }}>Intensität (%)</label>
                    <input
                      type="number"
                      value={config.growthStageLight.flowering.intensity}
                      onChange={(e) => updateConfig('growthStageLight.flowering.intensity', parseInt(e.target.value))}
                      className="w-full px-3 py-2 rounded border mt-1"
                      style={{
                        backgroundColor: currentTheme.bg.card,
                        borderColor: currentTheme.border.default,
                        color: currentTheme.text.primary
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Harvest */}
              <div className="p-4 rounded-lg border" style={{
                backgroundColor: currentTheme.bg.hover,
                borderColor: currentTheme.border.default
              }}>
                <div className="text-sm font-semibold mb-3" style={{ color: currentTheme.text.primary }}>
                  🌾 Erntereif (Harvest)
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs" style={{ color: currentTheme.text.secondary }}>Dauer (Stunden)</label>
                    <input
                      type="number"
                      value={config.growthStageLight.harvest.duration}
                      onChange={(e) => updateConfig('growthStageLight.harvest.duration', parseInt(e.target.value))}
                      className="w-full px-3 py-2 rounded border mt-1"
                      style={{
                        backgroundColor: currentTheme.bg.card,
                        borderColor: currentTheme.border.default,
                        color: currentTheme.text.primary
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-xs" style={{ color: currentTheme.text.secondary }}>Intensität (%)</label>
                    <input
                      type="number"
                      value={config.growthStageLight.harvest.intensity}
                      onChange={(e) => updateConfig('growthStageLight.harvest.intensity', parseInt(e.target.value))}
                      className="w-full px-3 py-2 rounded border mt-1"
                      style={{
                        backgroundColor: currentTheme.bg.card,
                        borderColor: currentTheme.border.default,
                        color: currentTheme.text.primary
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </SettingsSection>

      {/* VPD Zonen-Einstellungen */}
      {config.plantSpecific?.zoneBasedVPD && (
        <SettingsSection title="VPD-Zonen Zielwerte">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Bottom Zone */}
            <div className="p-4 rounded-lg border" style={{
              backgroundColor: currentTheme.bg.hover,
              borderColor: currentTheme.border.default
            }}>
              <div className="text-sm font-semibold mb-3" style={{ color: currentTheme.text.primary }}>
                Unten (Bottom)
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-xs" style={{ color: currentTheme.text.secondary }}>Min VPD (kPa)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.vpdZones.bottom.min}
                    onChange={(e) => updateConfig('vpdZones.bottom.min', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 rounded border mt-1"
                    style={{
                      backgroundColor: currentTheme.bg.card,
                      borderColor: currentTheme.border.default,
                      color: currentTheme.text.primary
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs" style={{ color: currentTheme.text.secondary }}>Max VPD (kPa)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.vpdZones.bottom.max}
                    onChange={(e) => updateConfig('vpdZones.bottom.max', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 rounded border mt-1"
                    style={{
                      backgroundColor: currentTheme.bg.card,
                      borderColor: currentTheme.border.default,
                      color: currentTheme.text.primary
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Middle Zone */}
            <div className="p-4 rounded-lg border" style={{
              backgroundColor: currentTheme.bg.hover,
              borderColor: currentTheme.border.default
            }}>
              <div className="text-sm font-semibold mb-3" style={{ color: currentTheme.text.primary }}>
                Mitte (Middle)
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-xs" style={{ color: currentTheme.text.secondary }}>Min VPD (kPa)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.vpdZones.middle.min}
                    onChange={(e) => updateConfig('vpdZones.middle.min', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 rounded border mt-1"
                    style={{
                      backgroundColor: currentTheme.bg.card,
                      borderColor: currentTheme.border.default,
                      color: currentTheme.text.primary
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs" style={{ color: currentTheme.text.secondary }}>Max VPD (kPa)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.vpdZones.middle.max}
                    onChange={(e) => updateConfig('vpdZones.middle.max', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 rounded border mt-1"
                    style={{
                      backgroundColor: currentTheme.bg.card,
                      borderColor: currentTheme.border.default,
                      color: currentTheme.text.primary
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Top Zone */}
            <div className="p-4 rounded-lg border" style={{
              backgroundColor: currentTheme.bg.hover,
              borderColor: currentTheme.border.default
            }}>
              <div className="text-sm font-semibold mb-3" style={{ color: currentTheme.text.primary }}>
                Oben (Top)
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-xs" style={{ color: currentTheme.text.secondary }}>Min VPD (kPa)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.vpdZones.top.min}
                    onChange={(e) => updateConfig('vpdZones.top.min', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 rounded border mt-1"
                    style={{
                      backgroundColor: currentTheme.bg.card,
                      borderColor: currentTheme.border.default,
                      color: currentTheme.text.primary
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs" style={{ color: currentTheme.text.secondary }}>Max VPD (kPa)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.vpdZones.top.max}
                    onChange={(e) => updateConfig('vpdZones.top.max', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 rounded border mt-1"
                    style={{
                      backgroundColor: currentTheme.bg.card,
                      borderColor: currentTheme.border.default,
                      color: currentTheme.text.primary
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </SettingsSection>
      )}
    </div>
  );
}

export default AutomationSettings;
