const { sendAlert } = require('./notificationService');
const VPDConfig = require('../models/VPDConfig');
const SystemConfig = require('../models/SystemConfig');
const vpdService = require('./vpdService');

// Lazy-load MQTT client to avoid circular dependency
let mqttClient = null;
const getMQTTClient = () => {
  if (!mqttClient) {
    try {
      const mqttService = require('./mqttService');
      mqttClient = mqttService.client;
    } catch (e) {
      console.error('⚠️ MQTT Client nicht verfügbar:', e.message);
    }
  }
  return mqttClient;
};

// --- STATUS SPEICHER ---
let lastWatering = { 1: 0, 2: 0 };
let lastLightState = null;      // Damit wir nicht unnötig Befehle senden
let manualOverrideUntil = 0;    // Timestamp: Bis wann ist Automatik pausiert?

// VPD Control State
let lastVPDUpdate = 0;          // Timestamp der letzten VPD-Anpassung
let currentFanSpeed = 50;       // Aktuelle Lüftergeschwindigkeit (0-100)
let lastVPD = null;             // Letzter VPD-Wert

// Device State Tracking - für Frontend Status Sync
let deviceStates = {
  relays: {
    light: false,
    fan_exhaust: false,
    fan_circulation: false,
    pump_main: false,
    heater: false,
    dehumidifier: false
  },
  pwm: {
    fan_exhaust: 0,
    grow_light: 0
  },
  rj11: {
    enabled: false,
    dimLevel: 0,
    mode: 'OFF'
  }
};

// --- DYNAMISCHE KONFIGURATION ---
// Diese Werte können jetzt zur Laufzeit geändert werden (z.B. via App)
let autoConfig = {
  cooldownMinutes: 60,      // Gieß-Pause
  dryThreshold: 30,         // Gieß-Start bei %
  manualPauseMinutes: 30,   // Pause nach manuellem Eingriff

  lightStartHour: 6,        // 06:00 Uhr
  lightDuration: 18,        // 18h (Vegetation)

  vpdMin: 0.8,              // kPa
  vpdMax: 1.2,              // kPa

  maxTempSafe: 40.0,        // °C Not-Aus
  maxGasSafe: 3500,         // Raw Not-Aus

  // NEU: Pflanzenspezifische Einstellungen
  plantSpecific: {
    enabled: false,          // Pflanzenspezifische Bewässerung aktiviert?
    individualThresholds: false, // Individuelle Schwellwerte pro Pflanze
    zoneBasedVPD: false      // VPD-Optimierung pro Zone (bottom/middle/top)
  },

  // NEU: Wachstumsstadien-basierte Lichtsteuerung
  growthStageLight: {
    enabled: false,
    seedling: { duration: 16, intensity: 60 },    // 16h/Tag, 60% Intensität
    vegetative: { duration: 18, intensity: 80 },  // 18h/Tag, 80% Intensität
    flowering: { duration: 12, intensity: 100 },  // 12h/Tag, 100% Intensität
    harvest: { duration: 12, intensity: 50 }      // 12h/Tag, 50% Intensität
  },

  // NEU: Zonen-basierte VPD-Ziele
  vpdZones: {
    bottom: { min: 0.8, max: 1.0 },   // Niedrigere Zone: etwas feuchter
    middle: { min: 0.9, max: 1.2 },   // Mittlere Zone: Standard
    top: { min: 1.0, max: 1.4 }       // Obere Zone: etwas trockener
  }
};

// Helper: VPD Berechnung (Deprecated - use vpdService.calculateVPD instead)
// Kept for backward compatibility with autoConfig
const calculateVPD = (temp, humidity) => {
  return vpdService.calculateVPD(temp, humidity);
};

// --- EXTERNE FUNKTION: MANUELLER EINGRIFF ---
// Muss aufgerufen werden, wenn User im Frontend einen Button drückt
const notifyManualAction = () => {
  manualOverrideUntil = Date.now() + (autoConfig.manualPauseMinutes * 60 * 1000);
  console.log(`🖐️ Manuelle Steuerung erkannt. Automatik pausiert für ${autoConfig.manualPauseMinutes} Min.`);
};

// --- CONFIG PERSISTENCE ---
// Load config from MongoDB on startup
const loadAutomationConfig = async () => {
  try {
    const config = await SystemConfig.getConfig('automation');
    if (config && config.automation) {
      autoConfig = { ...autoConfig, ...config.automation };
      console.log('✅ Automation Config loaded from MongoDB');
    }
  } catch (error) {
    console.error('❌ Failed to load automation config from MongoDB:', error.message);
  }
};

// --- EXTERNE FUNKTION: CONFIG UPDATE ---
// Wird aufgerufen, wenn User Einstellungen in der App ändert
const updateAutomationConfig = async (newConfig) => {
  autoConfig = { ...autoConfig, ...newConfig };

  // Persist to MongoDB
  try {
    await SystemConfig.updateConfig('automation', { automation: autoConfig }, 'user');
    console.log("⚙️ Automation Config aktualisiert & gespeichert:", autoConfig);
  } catch (error) {
    console.error('❌ Failed to save automation config to MongoDB:', error.message);
  }
};

const getAutomationConfig = () => autoConfig;

// --- HAUPTFUNKTION ---
const checkAutomationRules = async (sensorData, espSocket, broadcast) => {
  if (!espSocket) return;

  // 1. SAFETY CHECK (Priorität 1: Immer aktiv, auch bei manuellem Override!)
  if (checkSafetyRules(sensorData, espSocket, broadcast)) {
    return;
  }

  // 2. MANUELLER OVERRIDE PRÜFEN
  if (Date.now() < manualOverrideUntil) {
    // Optional: Frontend informieren, dass Automatik pausiert ist
    return;
  }

  // 3. LICHT ZEITSTEUERUNG
  checkLightSchedule(espSocket);

  // 4. VPD LÜFTER STEUERUNG (Async - Advanced PID Control)
  await checkEnvironmentalControl(sensorData, espSocket);

  // 5. BEWÄSSERUNG
  // Alte Gruppen-basierte Bewässerung (Fallback)
  if (!autoConfig.plantSpecific.enabled) {
    checkGroup(1, [sensorData.soil[0], sensorData.soil[1], sensorData.soil[2]], espSocket);
    checkGroup(2, [sensorData.soil[3], sensorData.soil[4], sensorData.soil[5]], espSocket);
  } else {
    // NEU: Pflanzenspezifische Bewässerung
    await checkPlantSpecificWatering(sensorData.soil || [], espSocket);
  }
};

// --- SUBSYSTEME ---

const checkSafetyRules = (data, socket, broadcast) => {
  let safetyTriggered = false;
  let reason = "";

  // Berechne maximale Temperatur von allen 3 Sensoren (schlechtester Fall)
  const temps = [data.temp_bottom, data.temp_middle, data.temp_top].filter(t => t != null && typeof t === 'number' && t > 0);
  const maxTemp = temps.length > 0 ? Math.max(...temps) : 0;

  if (maxTemp > autoConfig.maxTempSafe) {
    reason = `🔥 KRITISCHE HITZE: ${maxTemp.toFixed(1)}°C`;
    safetyTriggered = true;
  } else if (data.gas > autoConfig.maxGasSafe) {
    reason = `☠️ GAS/RAUCH ALARM: Level ${data.gas}`;
    safetyTriggered = true;
  }

  if (safetyTriggered) {
    console.log(`🚨 SAFETY TRIGGER: ${reason}. Not-Aus aktiviert!`);
    
    const offCmd = (cmd) => JSON.stringify({ command: cmd, state: false });
    
    socket.send(offCmd("LIGHT"));
    socket.send(JSON.stringify({ command: "PUMP", id: 1, state: false }));
    socket.send(JSON.stringify({ command: "PUMP", id: 2, state: false }));
    socket.send(offCmd("FAN_INTAKE"));
    socket.send(offCmd("FAN_EXHAUST"));
    socket.send(offCmd("HUMID"));

    if (broadcast) {
        broadcast({
            type: 'alert',
            level: 'critical',
            message: `NOT-AUS AKTIVIERT: ${reason}`
        });
    }
    sendAlert("🚨 SYSTEM NOT-AUS", `Das System wurde abgeschaltet.\nGrund: **${reason}**`, 0xFF0000);
    
    return true;
  }
  return false;
};

// Hilfsfunktion: Dominantes Wachstumsstadium ermitteln
const getDominantGrowthStage = () => {
  // In Produktion würde das aus der Datenbank kommen
  // Für jetzt verwenden wir 'vegetative' als Default
  // TODO: Integration mit Plant Database
  return 'vegetative';
};

// NEU: Zonen-basierte VPD-Optimierung
const checkZoneBasedVPD = async (data, socket) => {
  try {
    // Berechne VPD für jede Zone
    const zones = ['bottom', 'middle', 'top'];
    const zoneVPDs = {};

    zones.forEach(zone => {
      const temp = data[`temp_${zone}`];
      const humidity = data[`humidity_${zone}`];

      if (temp && humidity && temp > 0 && humidity > 0) {
        const vpd = vpdService.calculateVPD(temp, humidity);
        zoneVPDs[zone] = {
          vpd,
          temp,
          humidity,
          target: autoConfig.vpdZones[zone]
        };
      }
    });

    if (Object.keys(zoneVPDs).length === 0) {
      console.log('⚠️ Zonen-VPD: Keine gültigen Zonen-Daten');
      return;
    }

    // Analysiere welche Zone am kritischsten ist
    let criticalZone = null;
    let maxDeviation = 0;

    Object.entries(zoneVPDs).forEach(([zone, data]) => {
      const target = data.target;
      const vpd = data.vpd;

      // Berechne Abweichung vom Zielbereich
      let deviation = 0;
      if (vpd < target.min) {
        deviation = target.min - vpd;
      } else if (vpd > target.max) {
        deviation = vpd - target.max;
      }

      if (deviation > maxDeviation) {
        maxDeviation = deviation;
        criticalZone = { zone, ...data, deviation };
      }
    });

    if (!criticalZone || maxDeviation < 0.1) {
      console.log('🌿 Zonen-VPD: Alle Zonen im Zielbereich');
      return;
    }

    console.log(`📊 Zonen-VPD: Kritische Zone = ${criticalZone.zone.toUpperCase()}`);
    console.log(`   VPD: ${criticalZone.vpd.toFixed(2)} kPa (Ziel: ${criticalZone.target.min}-${criticalZone.target.max})`);
    console.log(`   Temp: ${criticalZone.temp.toFixed(1)}°C, RH: ${criticalZone.humidity.toFixed(1)}%`);

    // Entscheide Lüfter-Strategie basierend auf kritischer Zone
    let fanSpeed = currentFanSpeed;

    if (criticalZone.vpd < criticalZone.target.min) {
      // VPD zu niedrig -> Lüfter erhöhen
      fanSpeed = Math.min(100, currentFanSpeed + 10);
      console.log(`   ↑ Erhöhe Lüfter auf ${fanSpeed}% (VPD zu niedrig)`);
    } else if (criticalZone.vpd > criticalZone.target.max) {
      // VPD zu hoch -> Lüfter reduzieren
      fanSpeed = Math.max(0, currentFanSpeed - 10);
      console.log(`   ↓ Reduziere Lüfter auf ${fanSpeed}% (VPD zu hoch)`);
    }

    if (fanSpeed !== currentFanSpeed) {
      const pwmValue = Math.round((fanSpeed / 100) * 255);
      socket.send(JSON.stringify({
        command: "FAN_PWM",
        value: pwmValue
      }));

      currentFanSpeed = fanSpeed;
      deviceStates.pwm.fan_exhaust = pwmValue;
      lastVPDUpdate = Date.now();
      lastVPD = criticalZone.vpd;
    }

  } catch (error) {
    console.error('❌ Fehler bei Zonen-VPD-Steuerung:', error);
  }
};

const checkLightSchedule = (socket) => {
    const now = new Date();
    const currentHour = now.getHours();

    let lightDuration = autoConfig.lightDuration;
    let lightIntensity = 100;

    // NEU: Wachstumsstadien-basierte Lichtsteuerung
    if (autoConfig.growthStageLight.enabled) {
      const dominantStage = getDominantGrowthStage();
      const stageConfig = autoConfig.growthStageLight[dominantStage];

      if (stageConfig) {
        lightDuration = stageConfig.duration;
        lightIntensity = stageConfig.intensity;
        console.log(`🌱 Licht-Modus: ${dominantStage} (${lightDuration}h, ${lightIntensity}%)`);
      }
    }

    // Berechnung des End-Zeitpunkts
    const endHour = (autoConfig.lightStartHour + lightDuration) % 24;

    let shouldBeOn = false;

    if (autoConfig.lightStartHour < endHour) {
        // Gleicher Tag (z.B. 06:00 bis 22:00)
        shouldBeOn = currentHour >= autoConfig.lightStartHour && currentHour < endHour;
    } else {
        // Über Mitternacht (z.B. 18:00 bis 12:00)
        shouldBeOn = currentHour >= autoConfig.lightStartHour || currentHour < endHour;
    }

    // Nur senden, wenn sich der Zustand ändert (vermeidet Traffic)
    if (lastLightState !== shouldBeOn) {
        console.log(`💡 AUTO: Licht Zeitplan -> ${shouldBeOn ? 'AN' : 'AUS'} (${currentHour}:00 Uhr)`);
        socket.send(JSON.stringify({ command: "LIGHT", state: shouldBeOn }));

        // NEU: PWM Intensität setzen wenn eingeschaltet
        if (shouldBeOn && autoConfig.growthStageLight.enabled) {
          socket.send(JSON.stringify({
            command: "LIGHT_PWM",
            value: Math.round((lightIntensity / 100) * 255) // 0-255 PWM Wert
          }));
          console.log(`💡 AUTO: Licht-Intensität -> ${lightIntensity}%`);
        }

        lastLightState = shouldBeOn;
        deviceStates.relays.light = shouldBeOn;
        deviceStates.pwm.grow_light = shouldBeOn ? Math.round((lightIntensity / 100) * 255) : 0;
        // Relay-Watchdog über Licht-State informieren
        try {
          const relayWatchdog = require('./relayWatchdogService');
          relayWatchdog.updateRelayState('light', shouldBeOn);
        } catch (e) { /* Watchdog nicht verfügbar */ }
    }
};

const checkEnvironmentalControl = async (data, socket) => {
  try {
    // Durchschnittswerte von 3 SHT31 Sensoren berechnen (exclude 0 values from non-existent sensors)
    const temps = [data.temp_bottom, data.temp_middle, data.temp_top].filter(t => t != null && typeof t === 'number' && t > 0);
    const humidities = [data.humidity_bottom, data.humidity_middle, data.humidity_top].filter(h => h != null && typeof h === 'number' && h > 0);
    const avgTemp = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : null;
    const avgHumidity = humidities.length > 0 ? humidities.reduce((a, b) => a + b, 0) / humidities.length : null;

    if (!avgTemp || !avgHumidity) {
      console.log('⚠️ VPD: Keine gültigen Sensordaten von SHT31 Sensoren');
      return;
    }

    // NEU: Zonen-basierte VPD-Steuerung
    if (autoConfig.plantSpecific.zoneBasedVPD) {
      await checkZoneBasedVPD(data, socket);
      return;
    }

    // VPD-Config aus DB holen
    const vpdConfig = await VPDConfig.getOrCreate();

    // Prüfen ob Auto-VPD aktiviert ist
    if (!vpdConfig.enabled) {
      // Fallback auf alte einfache Steuerung
      const vpd = vpdService.calculateVPD(avgTemp, avgHumidity);
      if (vpd < autoConfig.vpdMin) {
        socket.send(JSON.stringify({ command: "FAN_EXHAUST", state: true }));
      } else if (vpd > autoConfig.vpdMax) {
        socket.send(JSON.stringify({ command: "FAN_EXHAUST", state: false }));
      }
      return;
    }

    const now = Date.now();

    // Update-Intervall prüfen (Standard: 30 Sekunden)
    const timeSinceLastUpdate = (now - lastVPDUpdate) / 1000;
    if (timeSinceLastUpdate < vpdConfig.updateInterval) {
      return; // Noch nicht Zeit für Update
    }

    // VPD berechnen mit Durchschnittswerten
    const currentVPD = vpdService.calculateVPD(avgTemp, avgHumidity);
    if (!currentVPD) {
      console.log('⚠️ VPD: Ungültige VPD-Berechnung');
      return;
    }

    // Zielbereich ermitteln
    const targetRange = vpdConfig.targetRange;

    // Hysterese prüfen - verhindert zu häufige Anpassungen
    if (vpdConfig.hysteresis.enabled && lastVPD !== null) {
      const vpdChange = Math.abs(currentVPD - lastVPD);
      const timeSinceChange = (now - lastVPDUpdate) / 1000;

      if (vpdChange < vpdConfig.hysteresis.threshold &&
          timeSinceChange < vpdConfig.hysteresis.minTimeBetweenChanges) {
        return; // Änderung zu gering oder zu früh
      }
    }

    // Analyse durchführen
    const analysis = vpdService.analyzeVPD(currentVPD, targetRange);

    // Notfall-Modi prüfen
    if (vpdConfig.emergency.enabled) {
      if (currentVPD < vpdConfig.emergency.criticalLowVPD.threshold) {
        handleEmergencyVPD('low', currentVPD, vpdConfig);
        lastVPDUpdate = now;
        lastVPD = currentVPD;
        return;
      }
      if (currentVPD > vpdConfig.emergency.criticalHighVPD.threshold) {
        handleEmergencyVPD('high', currentVPD, vpdConfig);
        lastVPDUpdate = now;
        lastVPD = currentVPD;
        return;
      }
    }

    // Neue Fan-Geschwindigkeit berechnen (PID-Controller)
    const newFanSpeed = vpdService.calculateFanSpeed(
      currentVPD,
      targetRange,
      currentFanSpeed,
      vpdConfig.aggressiveness
    );

    // Fan-Limits anwenden
    const limitedFanSpeed = Math.max(
      vpdConfig.fanLimits.min,
      Math.min(vpdConfig.fanLimits.max, newFanSpeed)
    );

    // Nur senden wenn sich Geschwindigkeit geändert hat
    if (limitedFanSpeed !== currentFanSpeed) {
      // MQTT-Command an ESP32 senden
      const client = getMQTTClient();
      if (client) {
        client.publish('grow_drexl_v2/command', JSON.stringify({
          action: 'set_fan_pwm',
          value: limitedFanSpeed
        }));
      }

      console.log(`🌡️ VPD: ${currentVPD.toFixed(2)} kPa (${analysis.status}) → Fan: ${currentFanSpeed}% → ${limitedFanSpeed}%`);

      // Statistiken aktualisieren
      vpdConfig.updateStatistics(currentVPD, analysis.inRange);
      vpdConfig.logAction(currentVPD, limitedFanSpeed, `${analysis.status}: ${analysis.recommendation}`);

      // Logging
      if (vpdConfig.logging.enabled && vpdConfig.logging.logChanges) {
        console.log(`📊 VPD-Anpassung: VPD=${currentVPD.toFixed(2)} kPa, Fan=${limitedFanSpeed}%, Status=${analysis.status}`);
      }

      // Speichern
      await vpdConfig.save();

      currentFanSpeed = limitedFanSpeed;
      deviceStates.pwm.fan_exhaust = limitedFanSpeed;
    }

    lastVPDUpdate = now;
    lastVPD = currentVPD;

  } catch (error) {
    console.error('❌ VPD Control Error:', error);
  }
};

// Notfall-Handler für kritische VPD-Werte
const handleEmergencyVPD = (type, vpd, config) => {
  const emergency = type === 'low'
    ? config.emergency.criticalLowVPD
    : config.emergency.criticalHighVPD;

  console.log(`🚨 VPD EMERGENCY: ${type.toUpperCase()} - ${vpd.toFixed(2)} kPa`);

  const client = getMQTTClient();

  switch (emergency.action) {
    case 'min_fan':
      currentFanSpeed = config.fanLimits.min;
      if (client) {
        client.publish('grow_drexl_v2/command', JSON.stringify({
          action: 'set_fan_pwm',
          value: config.fanLimits.min
        }));
      }
      console.log(`🔧 Emergency: Fan auf Minimum (${config.fanLimits.min}%)`);
      break;

    case 'max_fan':
      currentFanSpeed = config.fanLimits.max;
      if (client) {
        client.publish('grow_drexl_v2/command', JSON.stringify({
          action: 'set_fan_pwm',
          value: config.fanLimits.max
        }));
      }
      console.log(`🔧 Emergency: Fan auf Maximum (${config.fanLimits.max}%)`);
      break;

    case 'disable':
      config.enabled = false;
      config.save();
      console.log('🔧 Emergency: Auto-VPD deaktiviert');
      break;

    case 'alert_only':
      console.log('🔧 Emergency: Nur Alert, keine Aktion');
      break;
  }

  // Benachrichtigung senden
  if (config.notifications.enabled && config.notifications.onCritical) {
    sendAlert(
      `🚨 Kritisches VPD: ${type === 'low' ? 'Zu niedrig' : 'Zu hoch'}`,
      `VPD: **${vpd.toFixed(2)} kPa**\nAktion: ${emergency.action}`,
      type === 'low' ? 0xFFA500 : 0xFF0000
    );
  }
};

const checkGroup = (pumpId, moistures, socket) => {
  const validReadings = moistures.filter(m => m > 1 && m <= 100);
  if (validReadings.length === 0) return;

  const avg = validReadings.reduce((a, b) => a + b, 0) / validReadings.length;

  if (avg < autoConfig.dryThreshold) {
    const now = Date.now();
    const lastRun = lastWatering[pumpId];

    if (now - lastRun > autoConfig.cooldownMinutes * 60 * 1000) {
      console.log(`🤖 AUTO: Gruppe ${pumpId} zu trocken (${avg.toFixed(1)}%). Starte Pumpe!`);

      socket.send(JSON.stringify({ command: "PUMP", id: pumpId, state: true }));

      sendAlert(
        `💧 Automatische Bewässerung (Pumpe ${pumpId})`,
        `Durchschnittsfeuchte: **${avg.toFixed(1)}%**`,
        0x3498DB
      );

      lastWatering[pumpId] = now;
    }
  }
};

// NEU: Pflanzenspezifische Bewässerung mit individuellen Schwellwerten
const checkPlantSpecificWatering = async (moistures, socket) => {
  if (!autoConfig.plantSpecific.enabled) return;

  try {
    // Hole Pflanzendaten aus localStorage (via Digital Twin)
    // In echter Implementierung würde das aus der Datenbank kommen
    const plantConfigs = [
      { slotIndex: 0, pumpId: 1, threshold: autoConfig.dryThreshold, enabled: true },
      { slotIndex: 1, pumpId: 1, threshold: autoConfig.dryThreshold, enabled: true },
      { slotIndex: 2, pumpId: 1, threshold: autoConfig.dryThreshold, enabled: true },
      { slotIndex: 3, pumpId: 2, threshold: autoConfig.dryThreshold, enabled: true },
      { slotIndex: 4, pumpId: 2, threshold: autoConfig.dryThreshold, enabled: true },
      { slotIndex: 5, pumpId: 2, threshold: autoConfig.dryThreshold, enabled: true }
    ];

    const now = Date.now();

    // Prüfe jede Pumpen-Gruppe separat
    for (let pumpId = 1; pumpId <= 2; pumpId++) {
      const plantsInGroup = plantConfigs.filter(p => p.pumpId === pumpId && p.enabled);

      // Sammle Feuchtigkeitswerte für diese Gruppe
      const moistureValues = plantsInGroup
        .map(p => moistures[p.slotIndex])
        .filter(m => m > 1 && m <= 100);

      if (moistureValues.length === 0) continue;

      // Prüfe ob MINDESTENS EINE Pflanze zu trocken ist
      const needsWater = plantsInGroup.some(plant => {
        const moisture = moistures[plant.slotIndex];
        return moisture > 0 && moisture < plant.threshold;
      });

      if (needsWater) {
        const lastRun = lastWatering[pumpId];

        if (now - lastRun > autoConfig.cooldownMinutes * 60 * 1000) {
          const avgMoisture = moistureValues.reduce((a, b) => a + b, 0) / moistureValues.length;
          const dryPlants = plantsInGroup.filter(p => moistures[p.slotIndex] < p.threshold);

          console.log(`🌱 PFLANZEN-AUTO: Pumpe ${pumpId} aktiviert für ${dryPlants.length} trockene Pflanze(n)`);
          console.log(`   Durchschnitt: ${avgMoisture.toFixed(1)}%, Trockenste: ${Math.min(...moistureValues).toFixed(1)}%`);

          socket.send(JSON.stringify({ command: "PUMP", id: pumpId, state: true }));

          sendAlert(
            `🌱 Pflanzen-Bewässerung (Pumpe ${pumpId})`,
            `${dryPlants.length} Pflanze(n) benötigen Wasser\nDurchschnitt: **${avgMoisture.toFixed(1)}%**`,
            0x2ECC71
          );

          lastWatering[pumpId] = now;
        }
      }
    }
  } catch (error) {
    console.error('❌ Fehler bei pflanzenspezifischer Bewässerung:', error);
  }
};

// Getter für Device States (für Frontend Status Sync)
const getDeviceStates = () => deviceStates;

// Update Device State (wird von manuellen Befehlen aufgerufen)
const updateDeviceState = (type, key, value) => {
  if (type === 'relay' && deviceStates.relays[key] !== undefined) {
    deviceStates.relays[key] = value;
    // Relay-Watchdog über State-Änderung informieren
    try {
      const relayWatchdog = require('./relayWatchdogService');
      relayWatchdog.updateRelayState(key, value);
    } catch (e) { /* Watchdog nicht verfügbar */ }
  } else if (type === 'pwm' && deviceStates.pwm[key] !== undefined) {
    deviceStates.pwm[key] = value;
  } else if (type === 'rj11') {
    deviceStates.rj11 = { ...deviceStates.rj11, ...key };
  }
};

// ============================================
// EVENT-BASED INITIALIZATION
// Entkoppelt mqttService <-> automationService
// ============================================

/**
 * Initialize automation service with event-based communication
 * Call this from server.js after services are loaded
 */
const initializeAutomation = async () => {
  try {
    // Load config from MongoDB
    await loadAutomationConfig();

    const { sensorDataEmitter } = require('./mqttService');

    // WICHTIG: AutomationEngine starten
    const automationEngine = require('./automationEngine');
    automationEngine.start();
    console.log('✅ AutomationEngine gestartet');

    // Relay-Watchdog starten (Max-Laufzeiten + Interlocks)
    const relayWatchdog = require('./relayWatchdogService');
    // publishCommand und emitToClients werden unten im Event-Handler genutzt,
    // aber für den Watchdog brauchen wir globale Referenzen
    let _publishCommand = null;
    let _emitToClients = null;

    // Listen to sensor data events from MQTT service
    sensorDataEmitter.on('sensorData', async ({ data, publishCommand, emitToClients }) => {
      // Lazy-Init: Watchdog mit MQTT-Callbacks verbinden (einmalig beim ersten Event)
      if (!_publishCommand) {
        _publishCommand = (cmd) => publishCommand(cmd);
        _emitToClients = (event, payload) => emitToClients(event, payload);
        relayWatchdog.start(_publishCommand, _emitToClients);
      }
      // Update AutomationEngine mit neuen Sensordaten
      automationEngine.updateSensorData(data);

      // Create mock socket object for backward compatibility (für alte automationService Logik)
      const mockESP32Socket = {
        send: (msg) => {
          try {
            const cmd = JSON.parse(msg);
            publishCommand(cmd);
          } catch (e) {
            console.error('❌ Mock Socket Error:', e.message);
          }
        }
      };

      // Broadcast function
      const broadcast = (msg) => {
        emitToClients('automation', msg);
      };

      // Run automation rules (alte Logik)
      await checkAutomationRules(data, mockESP32Socket, broadcast);
    });

    console.log('✅ Automation Service initialized with event-based communication');
  } catch (error) {
    console.error('❌ Failed to initialize automation service:', error);
  }
};

module.exports = {
  checkAutomationRules,
  notifyManualAction,
  updateAutomationConfig,
  getAutomationConfig,
  getDeviceStates,
  updateDeviceState,
  checkPlantSpecificWatering,
  initializeAutomation  // NEW: Event-based initialization
};