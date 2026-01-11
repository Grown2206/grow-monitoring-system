/**
 * VPD Service - Vapor Pressure Deficit Berechnungen & Steuerung
 *
 * VPD (Vapor Pressure Deficit) = Dampfdruckdefizit
 * Wichtigster Klimafaktor für optimales Pflanzenwachstum
 *
 * Optimal:
 * - Seedling: 0.4-0.8 kPa
 * - Vegetative: 0.8-1.2 kPa
 * - Flowering: 1.0-1.5 kPa
 * - Late Flowering: 1.2-1.6 kPa
 */

class VPDService {
  constructor() {
    this.lastCalculation = null;
    this.history = [];
  }

  /**
   * Berechnet VPD aus Temperatur und Luftfeuchtigkeit
   *
   * Formel: VPD = SVP × (1 - RH/100)
   * Wobei SVP = Sättigungsdampfdruck
   *
   * @param {number} tempCelsius - Temperatur in °C
   * @param {number} relativeHumidity - Relative Luftfeuchtigkeit in %
   * @returns {number} VPD in kPa
   */
  calculateVPD(tempCelsius, relativeHumidity) {
    if (!tempCelsius || !relativeHumidity) {
      return null;
    }

    // SVP Berechnung mit Antoine-Gleichung (vereinfachte Form)
    // Gültig für 0-100°C
    const svp = 0.6108 * Math.exp((17.27 * tempCelsius) / (tempCelsius + 237.3));

    // VPD = SVP × (1 - RH/100)
    const vpd = svp * (1 - relativeHumidity / 100);

    this.lastCalculation = {
      vpd: Math.round(vpd * 100) / 100,
      temp: tempCelsius,
      humidity: relativeHumidity,
      svp: Math.round(svp * 100) / 100,
      timestamp: new Date()
    };

    // Historie speichern (max. 1000 Einträge)
    this.history.push(this.lastCalculation);
    if (this.history.length > 1000) {
      this.history.shift();
    }

    return vpd;
  }

  /**
   * Gibt Ziel-VPD-Bereich basierend auf Wachstumsphase zurück
   *
   * @param {string} growStage - seedling, vegetative, flowering, late_flowering
   * @returns {object} { min: number, max: number, optimal: number }
   */
  getTargetVPD(growStage = 'vegetative') {
    const targets = {
      seedling: {
        min: 0.4,
        max: 0.8,
        optimal: 0.6,
        description: 'Keimling - Niedrige VPD für zarte Pflanzen'
      },
      vegetative: {
        min: 0.8,
        max: 1.2,
        optimal: 1.0,
        description: 'Vegetativ - Moderate VPD für kräftiges Wachstum'
      },
      flowering: {
        min: 1.0,
        max: 1.5,
        optimal: 1.25,
        description: 'Blüte - Höhere VPD für dichte Blüten'
      },
      late_flowering: {
        min: 1.2,
        max: 1.6,
        optimal: 1.4,
        description: 'Späte Blüte - Maximale VPD für Harzproduktion'
      }
    };

    return targets[growStage] || targets.vegetative;
  }

  /**
   * Analysiert aktuelles VPD und gibt Status zurück
   *
   * @param {number} currentVPD - Aktuelles VPD
   * @param {object} targetRange - Zielbereich { min, max }
   * @returns {object} Status-Objekt
   */
  analyzeVPD(currentVPD, targetRange) {
    const { min, max, optimal } = targetRange;

    let status, severity, recommendation;

    if (currentVPD < min - 0.3) {
      status = 'critical_low';
      severity = 'critical';
      recommendation = 'VPD zu niedrig! Erhöhe Temperatur oder senke Luftfeuchtigkeit stark.';
    } else if (currentVPD < min) {
      status = 'low';
      severity = 'warning';
      recommendation = 'VPD etwas niedrig. Erhöhe Temperatur oder senke Luftfeuchtigkeit leicht.';
    } else if (currentVPD >= min && currentVPD <= max) {
      status = 'optimal';
      severity = 'ok';
      recommendation = 'VPD im optimalen Bereich! Perfekte Bedingungen.';
    } else if (currentVPD <= max + 0.3) {
      status = 'high';
      severity = 'warning';
      recommendation = 'VPD etwas hoch. Senke Temperatur oder erhöhe Luftfeuchtigkeit leicht.';
    } else {
      status = 'critical_high';
      severity = 'critical';
      recommendation = 'VPD zu hoch! Senke Temperatur oder erhöhe Luftfeuchtigkeit stark.';
    }

    const difference = currentVPD - optimal;
    const percentageOff = Math.round((difference / optimal) * 100);

    return {
      status,
      severity,
      recommendation,
      difference: Math.round(difference * 100) / 100,
      percentageOff,
      inRange: currentVPD >= min && currentVPD <= max
    };
  }

  /**
   * PID-Controller für Fan-PWM basierend auf VPD
   *
   * Berechnet optimale Lüftergeschwindigkeit um Ziel-VPD zu erreichen
   *
   * @param {number} currentVPD - Aktuelles VPD
   * @param {object} targetVPD - Zielbereich
   * @param {number} currentFanSpeed - Aktuelle Lüftergeschwindigkeit (0-100)
   * @param {string} aggressiveness - 'gentle', 'normal', 'aggressive'
   * @returns {number} Neue Lüftergeschwindigkeit (0-100)
   */
  calculateFanSpeed(currentVPD, targetVPD, currentFanSpeed = 50, aggressiveness = 'normal') {
    const { min, max, optimal } = targetVPD;

    // Fehler berechnen (positiv = zu hoch, negativ = zu niedrig)
    const error = currentVPD - optimal;

    // Aggressivitäts-Faktoren
    const factors = {
      gentle: { step: 5, max: 70, min: 20 },
      normal: { step: 10, max: 85, min: 30 },
      aggressive: { step: 15, max: 100, min: 40 }
    };

    const { step, max: maxSpeed, min: minSpeed } = factors[aggressiveness] || factors.normal;

    let newSpeed = currentFanSpeed;

    // VPD zu hoch (zu trocken) → Mehr Lüften → Kühler → Niedrigere VPD
    if (error > 0.4) {
      // Kritisch hoch - Volle Power
      newSpeed = maxSpeed;
    } else if (error > 0.2) {
      // Deutlich zu hoch - Stark erhöhen
      newSpeed = Math.min(currentFanSpeed + step * 2, maxSpeed);
    } else if (error > 0.1) {
      // Leicht zu hoch - Moderat erhöhen
      newSpeed = Math.min(currentFanSpeed + step, maxSpeed);
    }
    // VPD zu niedrig (zu feucht) → Weniger Lüften → Wärmer → Höhere VPD
    else if (error < -0.4) {
      // Kritisch niedrig - Minimum
      newSpeed = minSpeed;
    } else if (error < -0.2) {
      // Deutlich zu niedrig - Stark senken
      newSpeed = Math.max(currentFanSpeed - step * 2, minSpeed);
    } else if (error < -0.1) {
      // Leicht zu niedrig - Moderat senken
      newSpeed = Math.max(currentFanSpeed - step, minSpeed);
    }
    // Im optimalen Bereich (-0.1 bis +0.1)
    else {
      // Keine Änderung oder nur feine Anpassung
      if (Math.abs(error) < 0.05) {
        // Perfekt - keine Änderung
        return currentFanSpeed;
      } else {
        // Feintuning
        const adjustment = error > 0 ? step / 2 : -step / 2;
        newSpeed = Math.max(minSpeed, Math.min(maxSpeed, currentFanSpeed + adjustment));
      }
    }

    // Auf ganze Zahlen runden
    return Math.round(newSpeed);
  }

  /**
   * Berechnet optimale Temperatur für gegebene VPD und Luftfeuchtigkeit
   *
   * @param {number} targetVPD - Ziel-VPD in kPa
   * @param {number} humidity - Aktuelle Luftfeuchtigkeit in %
   * @returns {number} Optimale Temperatur in °C
   */
  calculateOptimalTemp(targetVPD, humidity) {
    // Umkehrung der VPD-Formel
    // VPD = SVP × (1 - RH/100)
    // SVP = VPD / (1 - RH/100)

    const svp = targetVPD / (1 - humidity / 100);

    // Umkehrung der Antoine-Gleichung
    // SVP = 0.6108 × exp((17.27 × T) / (T + 237.3))
    // T = (237.3 × ln(SVP/0.6108)) / (17.27 - ln(SVP/0.6108))

    const temp = (237.3 * Math.log(svp / 0.6108)) / (17.27 - Math.log(svp / 0.6108));

    return Math.round(temp * 10) / 10;
  }

  /**
   * Berechnet optimale Luftfeuchtigkeit für gegebene VPD und Temperatur
   *
   * @param {number} targetVPD - Ziel-VPD in kPa
   * @param {number} temp - Aktuelle Temperatur in °C
   * @returns {number} Optimale Luftfeuchtigkeit in %
   */
  calculateOptimalHumidity(targetVPD, temp) {
    // SVP berechnen
    const svp = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));

    // Umkehrung: VPD = SVP × (1 - RH/100)
    // RH = (1 - VPD/SVP) × 100

    const humidity = (1 - targetVPD / svp) * 100;

    return Math.round(humidity);
  }

  /**
   * Gibt Statistiken über VPD-Historie zurück
   *
   * @param {number} hours - Anzahl Stunden für Analyse (default: 24)
   * @returns {object} Statistiken
   */
  getStatistics(hours = 24) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentHistory = this.history.filter(h => h.timestamp > cutoff);

    if (recentHistory.length === 0) {
      return null;
    }

    const vpds = recentHistory.map(h => h.vpd);
    const avg = vpds.reduce((a, b) => a + b, 0) / vpds.length;
    const min = Math.min(...vpds);
    const max = Math.max(...vpds);

    // Standardabweichung
    const variance = vpds.reduce((sum, vpd) => sum + Math.pow(vpd - avg, 2), 0) / vpds.length;
    const stdDev = Math.sqrt(variance);

    // Zeit im optimalen Bereich (0.8-1.5 kPa)
    const timeInRange = recentHistory.filter(h => h.vpd >= 0.8 && h.vpd <= 1.5).length;
    const percentInRange = (timeInRange / recentHistory.length) * 100;

    return {
      average: Math.round(avg * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      percentInRange: Math.round(percentInRange),
      dataPoints: recentHistory.length,
      period: `${hours} Stunden`
    };
  }

  /**
   * Gibt letzte Berechnung zurück
   */
  getLastCalculation() {
    return this.lastCalculation;
  }

  /**
   * Gibt komplette Historie zurück (optional gefiltert)
   */
  getHistory(limit = 100) {
    return this.history.slice(-limit);
  }

  /**
   * Löscht Historie (für Testing/Reset)
   */
  clearHistory() {
    this.history = [];
    this.lastCalculation = null;
  }
}

// Singleton-Pattern
const vpdService = new VPDService();

module.exports = vpdService;
