/**
 * Grow Simulation Service
 * Berechnet Ertragsprognosen, Monte-Carlo Simulationen, Kosten und ROI
 */

const SimulationRun = require('../models/SimulationRun');

class SimulationService {
  /**
   * Hauptfunktion: Führt eine komplette Simulation durch
   */
  async runSimulation(params) {
    const {
      name,
      strain,
      strainType,
      parameters,
      growPhases,
      monteCarloRuns = 1000,
      userId,
      pricePerGram = 10
    } = params;

    // Berechne Gesamtdauer
    const totalDays = growPhases.reduce((sum, phase) => sum + phase.duration, 0);

    // 1. Yield-Prediction
    const yieldPrediction = this.predictYield(parameters, strainType, totalDays);

    // 2. Monte-Carlo Simulation für Variabilität
    const monteCarlo = await this.runMonteCarloSimulation(
      parameters,
      strainType,
      totalDays,
      monteCarloRuns
    );

    // 3. Kosten-Berechnung
    const costs = this.calculateCosts(parameters, totalDays);

    // 4. ROI-Berechnung
    const roi = this.calculateROI(monteCarlo.statistics.median, costs, pricePerGram);

    // 5. Optimierungsvorschläge
    const optimizationSuggestions = this.generateOptimizationSuggestions(
      parameters,
      strainType
    );

    // Speichere Simulation
    const simulation = new SimulationRun({
      name,
      strain,
      strainType,
      parameters,
      growPhases,
      predictions: {
        totalDays,
        yieldGrams: {
          min: monteCarlo.statistics.percentile5,
          expected: monteCarlo.statistics.median,
          max: monteCarlo.statistics.percentile95
        },
        quality: this.calculateQualityScore(parameters),
        probability: this.calculateProbabilityScore(parameters, strainType)
      },
      monteCarlo: {
        runs: monteCarloRuns,
        results: monteCarlo.results.slice(0, 100), // Speichere nur 100 für Visualisierung
        statistics: monteCarlo.statistics
      },
      costs,
      roi,
      optimizationSuggestions,
      userId
    });

    await simulation.save();
    return simulation;
  }

  /**
   * Yield-Prediction Modell
   * Basierend auf empirischen Cannabis-Daten
   */
  predictYield(params, strainType, duration) {
    // Basis-Yield pro Pflanze (Gramm)
    const baseYield = {
      'Indica': 50,
      'Sativa': 45,
      'Hybrid': 47,
      'Autoflower': 30,
      'CBD': 40
    };

    // Berechne Optimierungsfaktoren
    const tempFactor = this.calculateTempFactor(params.temperature);
    const vpdFactor = this.calculateVPDFactor(params.vpd);
    const lightFactor = this.calculateLightFactor(params.dli);
    const nutrientFactor = this.calculateNutrientFactor(params.nutrientEC, params.pH);
    const co2Factor = this.calculateCO2Factor(params.co2);

    // Durchschnittlicher Optimierungsfaktor
    const optimizationFactor = (
      tempFactor * 0.25 +
      vpdFactor * 0.25 +
      lightFactor * 0.25 +
      nutrientFactor * 0.15 +
      co2Factor * 0.10
    );

    // Dauer-Faktor (90 Tage = Baseline)
    const durationFactor = duration / 90;

    // Finale Berechnung
    const expectedYield = baseYield[strainType] * optimizationFactor * durationFactor;

    return {
      base: baseYield[strainType],
      optimizationFactor,
      durationFactor,
      expected: Math.max(0, expectedYield)
    };
  }

  /**
   * Temperatur-Faktor (Optimum: 24-26°C)
   */
  calculateTempFactor(temp) {
    if (temp >= 24 && temp <= 26) return 1.0;
    if (temp >= 22 && temp < 24) return 0.95;
    if (temp > 26 && temp <= 28) return 0.95;
    if (temp >= 20 && temp < 22) return 0.85;
    if (temp > 28 && temp <= 30) return 0.80;
    if (temp >= 18 && temp < 20) return 0.70;
    if (temp > 30 && temp <= 32) return 0.65;
    return 0.5; // Zu kalt oder zu heiß
  }

  /**
   * VPD-Faktor (Optimum: 0.8-1.2 kPa für Veg/Flower)
   */
  calculateVPDFactor(vpd) {
    if (vpd >= 0.8 && vpd <= 1.2) return 1.0;
    if (vpd >= 0.6 && vpd < 0.8) return 0.9;
    if (vpd > 1.2 && vpd <= 1.4) return 0.95;
    if (vpd >= 0.4 && vpd < 0.6) return 0.75;
    if (vpd > 1.4 && vpd <= 1.6) return 0.85;
    return 0.6;
  }

  /**
   * Licht-Faktor (DLI: Optimum 30-40 mol/m²/d für Flower)
   */
  calculateLightFactor(dli) {
    if (dli >= 30 && dli <= 40) return 1.0;
    if (dli >= 25 && dli < 30) return 0.9;
    if (dli > 40 && dli <= 50) return 0.95;
    if (dli >= 20 && dli < 25) return 0.80;
    if (dli > 50 && dli <= 60) return 0.85;
    if (dli >= 15 && dli < 20) return 0.65;
    return 0.5;
  }

  /**
   * Nährstoff-Faktor (EC + pH kombiniert)
   */
  calculateNutrientFactor(ec, pH) {
    // EC-Faktor (Optimum: 1.8-2.2 mS/cm)
    let ecFactor = 1.0;
    if (ec >= 1.8 && ec <= 2.2) ecFactor = 1.0;
    else if (ec >= 1.5 && ec < 1.8) ecFactor = 0.9;
    else if (ec > 2.2 && ec <= 2.5) ecFactor = 0.9;
    else if (ec >= 1.0 && ec < 1.5) ecFactor = 0.75;
    else if (ec > 2.5 && ec <= 3.0) ecFactor = 0.70;
    else ecFactor = 0.5;

    // pH-Faktor (Optimum: 5.8-6.2)
    let pHFactor = 1.0;
    if (pH >= 5.8 && pH <= 6.2) pHFactor = 1.0;
    else if (pH >= 5.5 && pH < 5.8) pHFactor = 0.95;
    else if (pH > 6.2 && pH <= 6.5) pHFactor = 0.95;
    else if (pH >= 5.2 && pH < 5.5) pHFactor = 0.80;
    else if (pH > 6.5 && pH <= 7.0) pHFactor = 0.80;
    else pHFactor = 0.6;

    return (ecFactor + pHFactor) / 2;
  }

  /**
   * CO2-Faktor (Optimum: 1000-1200 ppm)
   */
  calculateCO2Factor(co2) {
    if (co2 >= 1000 && co2 <= 1200) return 1.15; // CO2-Boost
    if (co2 >= 800 && co2 < 1000) return 1.05;
    if (co2 > 1200 && co2 <= 1400) return 1.10;
    if (co2 >= 600 && co2 < 800) return 1.02;
    return 1.0; // Normal atmosphärisch (~400 ppm)
  }

  /**
   * Monte-Carlo Simulation für Variabilität
   * Simuliert Genetik-Variation, Umwelt-Schwankungen, etc.
   */
  async runMonteCarloSimulation(baseParams, strainType, duration, runs = 1000) {
    const results = [];

    for (let i = 0; i < runs; i++) {
      // Variiere Parameter um ±10%
      const variedParams = {
        temperature: this.varyParameter(baseParams.temperature, 0.1),
        humidity: this.varyParameter(baseParams.humidity, 0.1),
        vpd: this.varyParameter(baseParams.vpd, 0.1),
        lightHours: baseParams.lightHours, // Konstant
        ppfd: this.varyParameter(baseParams.ppfd, 0.1),
        dli: this.varyParameter(baseParams.dli, 0.1),
        co2: this.varyParameter(baseParams.co2, 0.05),
        nutrientEC: this.varyParameter(baseParams.nutrientEC, 0.1),
        pH: this.varyParameter(baseParams.pH, 0.05)
      };

      // Berechne Yield mit varierten Parametern
      const prediction = this.predictYield(variedParams, strainType, duration);
      results.push({
        yield: prediction.expected,
        probability: 1 / runs
      });
    }

    // Sortiere Ergebnisse
    results.sort((a, b) => a.yield - b.yield);

    // Berechne Statistiken
    const statistics = this.calculateStatistics(results.map(r => r.yield));

    return {
      results,
      statistics
    };
  }

  /**
   * Variiere Parameter mit Normalverteilung
   */
  varyParameter(value, variationPercent) {
    // Box-Muller Transformation für Normalverteilung
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    // Variation: mean = value, stdDev = value * variationPercent
    const variation = value * variationPercent * z;
    return Math.max(0, value + variation);
  }

  /**
   * Berechne Statistiken aus Ergebnis-Array
   */
  calculateStatistics(values) {
    const n = values.length;
    const sorted = [...values].sort((a, b) => a - b);

    const mean = values.reduce((sum, v) => sum + v, 0) / n;
    const median = sorted[Math.floor(n * 0.5)];
    const percentile5 = sorted[Math.floor(n * 0.05)];
    const percentile95 = sorted[Math.floor(n * 0.95)];

    // Standardabweichung
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    return {
      mean,
      median,
      stdDev,
      percentile5,
      percentile95,
      min: sorted[0],
      max: sorted[n - 1]
    };
  }

  /**
   * Kosten-Berechnung
   */
  calculateCosts(params, duration) {
    // 1. Stromkosten
    const electricityPrice = 0.35; // EUR/kWh (Deutschland 2024)
    const lightWattage = 300; // Annahme: 300W LED für 6 Pflanzen
    const auxiliaryWattage = 50; // Lüfter, Pumpen, etc.

    const lightKwh = (lightWattage / 1000) * params.lightHours * duration;
    const auxiliaryKwh = (auxiliaryWattage / 1000) * 24 * duration;
    const totalKwh = lightKwh + auxiliaryKwh;
    const electricityCost = totalKwh * electricityPrice;

    // 2. Nährstoff-Kosten
    const nutrientCostPerWeek = 10; // EUR
    const weeks = Math.ceil(duration / 7);
    const nutrientCost = nutrientCostPerWeek * weeks;

    // 3. Wasser-Kosten (vernachlässigbar)
    const waterCost = 2;

    // 4. Substrat-Kosten (einmalig)
    const substrateCost = 30;

    const total = electricityCost + nutrientCost + waterCost + substrateCost;

    return {
      electricity: parseFloat(electricityCost.toFixed(2)),
      nutrients: parseFloat(nutrientCost.toFixed(2)),
      water: waterCost,
      substrate: substrateCost,
      total: parseFloat(total.toFixed(2)),
      breakdown: {
        totalKwh: parseFloat(totalKwh.toFixed(2)),
        electricityPrice,
        weeks
      }
    };
  }

  /**
   * ROI-Berechnung
   */
  calculateROI(yieldGrams, costs, pricePerGram = 10) {
    const revenue = yieldGrams * pricePerGram;
    const profit = revenue - costs.total;
    const roiPercentage = costs.total > 0 ? (profit / costs.total) * 100 : 0;

    // Break-Even berechnen (bei wie viel Gramm Ertrag = Kosten?)
    const breakEvenGrams = costs.total / pricePerGram;

    return {
      investment: costs.total,
      revenue: parseFloat(revenue.toFixed(2)),
      profit: parseFloat(profit.toFixed(2)),
      roiPercentage: parseFloat(roiPercentage.toFixed(2)),
      breakEvenDays: 0, // Wird später berechnet wenn nötig
      pricePerGram,
      breakEvenGrams: parseFloat(breakEvenGrams.toFixed(2))
    };
  }

  /**
   * Qualitäts-Score (0-100)
   * Basierend auf optimalen Bedingungen
   */
  calculateQualityScore(params) {
    const tempFactor = this.calculateTempFactor(params.temperature);
    const vpdFactor = this.calculateVPDFactor(params.vpd);
    const lightFactor = this.calculateLightFactor(params.dli);
    const nutrientFactor = this.calculateNutrientFactor(params.nutrientEC, params.pH);

    const avgFactor = (tempFactor + vpdFactor + lightFactor + nutrientFactor) / 4;
    return Math.round(avgFactor * 100);
  }

  /**
   * Wahrscheinlichkeits-Score (0-100)
   * Wie wahrscheinlich ist diese Prognose?
   */
  calculateProbabilityScore(params, strainType) {
    // Basis-Confidence
    let confidence = 70;

    // Reduziere Confidence bei extremen Werten
    if (params.temperature < 18 || params.temperature > 30) confidence -= 15;
    if (params.vpd < 0.5 || params.vpd > 1.5) confidence -= 10;
    if (params.dli < 20 || params.dli > 50) confidence -= 10;

    // Autoflower = höhere Vorhersagbarkeit
    if (strainType === 'Autoflower') confidence += 10;

    return Math.max(30, Math.min(95, confidence));
  }

  /**
   * Optimierungsvorschläge generieren
   */
  generateOptimizationSuggestions(params, strainType) {
    const suggestions = [];

    // Temperatur-Optimierung
    if (params.temperature < 24 || params.temperature > 26) {
      suggestions.push({
        parameter: 'temperature',
        currentValue: params.temperature,
        suggestedValue: 25,
        expectedImprovement: '+5-10% Ertrag',
        reasoning: 'Optimale Temperatur für maximales Wachstum ist 24-26°C'
      });
    }

    // VPD-Optimierung
    if (params.vpd < 0.8 || params.vpd > 1.2) {
      suggestions.push({
        parameter: 'vpd',
        currentValue: params.vpd,
        suggestedValue: 1.0,
        expectedImprovement: '+5-8% Ertrag',
        reasoning: 'VPD 0.8-1.2 kPa ist optimal für Transpiration und Nährstoffaufnahme'
      });
    }

    // Licht-Optimierung
    if (params.dli < 30 || params.dli > 40) {
      suggestions.push({
        parameter: 'dli',
        currentValue: params.dli,
        suggestedValue: 35,
        expectedImprovement: '+10-15% Ertrag',
        reasoning: 'DLI 30-40 mol/m²/d maximiert Photosynthese ohne Stress'
      });
    }

    // EC-Optimierung
    if (params.nutrientEC < 1.8 || params.nutrientEC > 2.2) {
      suggestions.push({
        parameter: 'nutrientEC',
        currentValue: params.nutrientEC,
        suggestedValue: 2.0,
        expectedImprovement: '+3-5% Ertrag',
        reasoning: 'EC 1.8-2.2 mS/cm liefert optimale Nährstoffkonzentration'
      });
    }

    // pH-Optimierung
    if (params.pH < 5.8 || params.pH > 6.2) {
      suggestions.push({
        parameter: 'pH',
        currentValue: params.pH,
        suggestedValue: 6.0,
        expectedImprovement: '+2-4% Ertrag',
        reasoning: 'pH 5.8-6.2 optimiert Nährstoffverfügbarkeit'
      });
    }

    // CO2-Vorschlag (wenn noch nicht genutzt)
    if (params.co2 < 800) {
      suggestions.push({
        parameter: 'co2',
        currentValue: params.co2,
        suggestedValue: 1200,
        expectedImprovement: '+15-20% Ertrag',
        reasoning: 'CO2-Supplementierung kann Ertrag signifikant steigern'
      });
    }

    return suggestions;
  }

  /**
   * Parameter-Optimierung via Grid-Search
   */
  async optimizeParameters(strainType, constraints = {}, duration = 90) {
    let bestParams = null;
    let bestYield = 0;

    // Definiere Suchraum
    const searchSpace = {
      temperature: constraints.temperature || this.generateRange(22, 28, 0.5),
      vpd: constraints.vpd || this.generateRange(0.8, 1.4, 0.1),
      dli: constraints.dli || this.generateRange(25, 45, 2),
      nutrientEC: constraints.nutrientEC || this.generateRange(1.5, 2.5, 0.2),
      pH: constraints.pH || [6.0],
      co2: constraints.co2 || [400, 800, 1200]
    };

    // Grid-Search (vereinfacht - nicht alle Kombinationen)
    let iterations = 0;
    const maxIterations = 500;

    for (const temp of searchSpace.temperature) {
      for (const vpd of searchSpace.vpd) {
        for (const dli of searchSpace.dli) {
          for (const ec of searchSpace.nutrientEC) {
            for (const ph of searchSpace.pH) {
              for (const co2 of searchSpace.co2) {
                if (iterations++ > maxIterations) break;

                const params = {
                  temperature: temp,
                  humidity: 60, // Wird aus VPD berechnet
                  vpd,
                  lightHours: 18,
                  ppfd: Math.round((dli * 1000000) / (18 * 3600)),
                  dli,
                  co2,
                  nutrientEC: ec,
                  pH: ph
                };

                const prediction = this.predictYield(params, strainType, duration);

                if (prediction.expected > bestYield) {
                  bestYield = prediction.expected;
                  bestParams = params;
                }
              }
            }
          }
        }
      }
    }

    return {
      bestParams,
      bestYield,
      improvement: bestYield
    };
  }

  /**
   * Hilfsfunktion: Generiere Range
   */
  generateRange(min, max, step) {
    const range = [];
    for (let i = min; i <= max; i += step) {
      range.push(parseFloat(i.toFixed(2)));
    }
    return range;
  }

  /**
   * Lade Simulation by ID
   */
  async getSimulation(id) {
    return await SimulationRun.findById(id);
  }

  /**
   * Lade User's Simulationen
   */
  async getUserSimulations(userId, limit = 20) {
    return await SimulationRun.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  /**
   * Lösche Simulation
   */
  async deleteSimulation(id, userId) {
    return await SimulationRun.findOneAndDelete({ _id: id, userId });
  }

  /**
   * Presets/Templates
   */
  getPresets() {
    return [
      {
        name: 'Budget Grow',
        description: 'Minimale Kosten, moderate Erträge',
        strainType: 'Autoflower',
        parameters: {
          temperature: 22,
          humidity: 60,
          vpd: 0.9,
          lightHours: 16,
          ppfd: 400,
          dli: 25,
          co2: 400,
          nutrientEC: 1.5,
          pH: 6.0
        },
        growPhases: [
          { phase: 'seedling', duration: 14, parameters: {} },
          { phase: 'vegetative', duration: 21, parameters: {} },
          { phase: 'flowering', duration: 35, parameters: {} }
        ]
      },
      {
        name: 'High-Yield Pro',
        description: 'Maximum Ertrag, höhere Kosten',
        strainType: 'Indica',
        parameters: {
          temperature: 25,
          humidity: 55,
          vpd: 1.1,
          lightHours: 12,
          ppfd: 900,
          dli: 40,
          co2: 1200,
          nutrientEC: 2.2,
          pH: 5.9
        },
        growPhases: [
          { phase: 'seedling', duration: 14, parameters: {} },
          { phase: 'vegetative', duration: 35, parameters: { lightHours: 18 } },
          { phase: 'flowering', duration: 56, parameters: { lightHours: 12 } },
          { phase: 'late_flowering', duration: 14, parameters: {} }
        ]
      },
      {
        name: 'Balanced',
        description: 'Optimale Balance Kosten/Ertrag',
        strainType: 'Hybrid',
        parameters: {
          temperature: 24,
          humidity: 60,
          vpd: 1.0,
          lightHours: 18,
          ppfd: 600,
          dli: 35,
          co2: 400,
          nutrientEC: 1.8,
          pH: 6.0
        },
        growPhases: [
          { phase: 'seedling', duration: 14, parameters: {} },
          { phase: 'vegetative', duration: 28, parameters: { lightHours: 18 } },
          { phase: 'flowering', duration: 49, parameters: { lightHours: 12 } }
        ]
      },
      {
        name: 'Sativa Long Flower',
        description: 'Für Sativa mit langer Blütephase',
        strainType: 'Sativa',
        parameters: {
          temperature: 26,
          humidity: 55,
          vpd: 1.2,
          lightHours: 12,
          ppfd: 800,
          dli: 38,
          co2: 800,
          nutrientEC: 2.0,
          pH: 6.0
        },
        growPhases: [
          { phase: 'seedling', duration: 14, parameters: {} },
          { phase: 'vegetative', duration: 42, parameters: { lightHours: 18 } },
          { phase: 'flowering', duration: 70, parameters: { lightHours: 12 } },
          { phase: 'late_flowering', duration: 14, parameters: {} }
        ]
      }
    ];
  }
}

module.exports = new SimulationService();
