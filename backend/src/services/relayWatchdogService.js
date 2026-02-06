/**
 * Relay Watchdog Service
 *
 * Überwacht alle Relay-Zustände und erzwingt:
 * 1. Max-Laufzeiten pro Gerät (Auto-Off bei Überschreitung)
 * 2. Geräte-Interlocks (keine widersprüchlichen Geräte gleichzeitig)
 * 3. Relay-State-Tracking mit Timestamps
 */

const { sendAlert } = require('./notificationService');
const { DEVICE_DEFINITIONS } = require('../config/devices');

// ==========================================
// KONFIGURATION
// ==========================================

// Max-Laufzeiten in Millisekunden
const MAX_RUNTIME_MS = {
  light:            12 * 60 * 60 * 1000,   // 12h (Lichtzyklen können lang sein)
  fan_exhaust:      24 * 60 * 60 * 1000,   // 24h (kann dauerhaft laufen)
  fan_circulation:  24 * 60 * 60 * 1000,   // 24h (kann dauerhaft laufen)
  pump_main:         2 * 60 * 60 * 1000,   // 2h  (Luftbefeuchter)
  pump_mix:         30 * 60 * 1000,        // 30min (Tank-Pumpe)
  nutrient_pump:    10 * 60 * 1000,        // 10min (Dosierung)
  heater:            4 * 60 * 60 * 1000,   // 4h  (Brandrisiko!)
  dehumidifier:      6 * 60 * 60 * 1000,   // 6h  (Motor-Überhitzung)
};

// Geräte-Interlocks: Diese Paare dürfen NICHT gleichzeitig laufen
const INTERLOCKS = [
  { a: 'heater', b: 'dehumidifier', reason: 'Heizung und Entfeuchter gleichzeitig ist sinnlos und energieverschwendend' },
];

// Check-Intervall (wie oft wird auf Timeouts geprüft)
const CHECK_INTERVAL_MS = 60 * 1000; // Jede Minute

// ==========================================
// STATE
// ==========================================

// Relay-Zustände mit Zeitstempel wann eingeschaltet
// { light: { on: true, since: 1706000000000 }, ... }
const relayStates = {};

// Initialisiere alle bekannten Relays
Object.keys(DEVICE_DEFINITIONS.relays).forEach(id => {
  relayStates[id] = { on: false, since: null };
});

let checkInterval = null;
let publishCommandFn = null;  // Wird von mqttService gesetzt
let emitToClientsFn = null;   // Wird von mqttService gesetzt

// ==========================================
// CORE FUNCTIONS
// ==========================================

/**
 * Relay-Status Update (aufgerufen bei jedem relayUpdate Event)
 */
const updateRelayState = (relay, state) => {
  if (!relayStates[relay]) {
    console.warn(`⚠️ Relay-Watchdog: Unbekanntes Relay "${relay}"`);
    return;
  }

  const wasOn = relayStates[relay].on;
  const isOn = !!state;

  if (isOn && !wasOn) {
    // Relay wurde eingeschaltet → Timestamp setzen
    relayStates[relay] = { on: true, since: Date.now() };
    console.log(`🔌 Watchdog: ${relay} EIN (Timer gestartet, Max: ${formatDuration(MAX_RUNTIME_MS[relay])})`);

    // Interlock prüfen
    checkInterlocks(relay);
  } else if (!isOn && wasOn) {
    // Relay wurde ausgeschaltet → Reset
    relayStates[relay] = { on: false, since: null };
    console.log(`🔌 Watchdog: ${relay} AUS (Timer gestoppt)`);
  }
};

/**
 * Prüft ob Geräte-Interlocks verletzt werden
 */
const checkInterlocks = (justActivated) => {
  for (const lock of INTERLOCKS) {
    let conflict = null;

    if (justActivated === lock.a && relayStates[lock.b]?.on) {
      conflict = lock.b;
    } else if (justActivated === lock.b && relayStates[lock.a]?.on) {
      conflict = lock.a;
    }

    if (conflict) {
      console.warn(`⚠️ INTERLOCK: ${justActivated} eingeschaltet → ${conflict} wird deaktiviert (${lock.reason})`);

      // Konfliktgerät ausschalten
      forceRelayOff(conflict, `Interlock mit ${getLabel(justActivated)}`);

      sendAlert(
        '⚠️ Geräte-Interlock',
        `**${getLabel(conflict)}** wurde automatisch ausgeschaltet weil **${getLabel(justActivated)}** eingeschaltet wurde.\n\nGrund: ${lock.reason}`,
        0xFFA500 // Orange
      );
    }
  }
};

/**
 * Periodischer Check aller Relay-Laufzeiten
 */
const checkTimeouts = () => {
  const now = Date.now();

  for (const [relay, state] of Object.entries(relayStates)) {
    if (!state.on || !state.since) continue;

    const runtime = now - state.since;
    const maxRuntime = MAX_RUNTIME_MS[relay];

    if (!maxRuntime) continue;

    if (runtime >= maxRuntime) {
      console.error(`🚨 TIMEOUT: ${relay} läuft seit ${formatDuration(runtime)} (Max: ${formatDuration(maxRuntime)}). Auto-OFF!`);

      // Relay zwangs-ausschalten
      forceRelayOff(relay, `Max-Laufzeit überschritten (${formatDuration(maxRuntime)})`);

      sendAlert(
        '🚨 Relay-Timeout Auto-OFF',
        `**${getLabel(relay)}** wurde nach **${formatDuration(runtime)}** automatisch abgeschaltet.\n\nMax erlaubte Laufzeit: ${formatDuration(maxRuntime)}\n\n⚠️ Bitte System prüfen!`,
        0xFF0000 // Rot
      );
    }
  }
};

/**
 * Erzwingt das Ausschalten eines Relays über MQTT
 */
const forceRelayOff = (relay, reason) => {
  // State sofort updaten
  relayStates[relay] = { on: false, since: null };

  // MQTT Command senden
  if (publishCommandFn) {
    publishCommandFn({
      command: 'RELAY',
      relay: relay,
      state: false,
      source: 'watchdog',
      reason: reason
    });
  }

  // Frontend benachrichtigen
  if (emitToClientsFn) {
    emitToClientsFn('relayUpdate', { relay, state: false, source: 'watchdog', reason });
    emitToClientsFn('alert', {
      type: 'warning',
      message: `${getLabel(relay)} wurde vom Watchdog abgeschaltet: ${reason}`
    });
  }
};

// ==========================================
// HILFSFUNKTIONEN
// ==========================================

const formatDuration = (ms) => {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}min`;
  const h = Math.floor(ms / 3600000);
  const m = Math.round((ms % 3600000) / 60000);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
};

const getLabel = (relay) => {
  return DEVICE_DEFINITIONS.relays[relay]?.label || relay;
};

/**
 * Gibt den aktuellen Status aller Relays zurück (für API/Frontend)
 */
const getRelayStates = () => {
  const states = {};
  for (const [relay, state] of Object.entries(relayStates)) {
    states[relay] = {
      on: state.on,
      since: state.since,
      runtime: state.on && state.since ? Date.now() - state.since : 0,
      maxRuntime: MAX_RUNTIME_MS[relay] || null,
      remainingMs: state.on && state.since && MAX_RUNTIME_MS[relay]
        ? Math.max(0, MAX_RUNTIME_MS[relay] - (Date.now() - state.since))
        : null
    };
  }
  return states;
};

// ==========================================
// LIFECYCLE
// ==========================================

/**
 * Startet den Watchdog-Service
 * @param {Function} publishCmd - Funktion zum Senden von MQTT-Commands
 * @param {Function} emitClients - Funktion zum Senden an Socket.IO Clients
 */
const start = (publishCmd, emitClients) => {
  publishCommandFn = publishCmd;
  emitToClientsFn = emitClients;

  // Periodischen Check starten
  checkInterval = setInterval(checkTimeouts, CHECK_INTERVAL_MS);

  console.log('🐕 Relay-Watchdog gestartet');
  console.log('   Max-Laufzeiten:', Object.entries(MAX_RUNTIME_MS).map(([k, v]) => `${k}: ${formatDuration(v)}`).join(', '));
  console.log('   Interlocks:', INTERLOCKS.map(l => `${l.a} ↔ ${l.b}`).join(', '));
};

const stop = () => {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
  console.log('🐕 Relay-Watchdog gestoppt');
};

module.exports = {
  updateRelayState,
  getRelayStates,
  start,
  stop,
  MAX_RUNTIME_MS,
  INTERLOCKS
};
