const { GoogleGenerativeAI } = require('@google/generative-ai');
const Camera = require('../models/Camera');
const Plant = require('../models/Plant');
const PlantGrowthLog = require('../models/PlantGrowthLog');
const axios = require('axios');

/**
 * Plant Analysis Service
 * Nutzt Gemini Vision API für automatische Pflanzenanalyse
 * - Breite-Schätzung via Kamera-Bild
 * - Gesundheitsbewertung (1-10)
 * - Blattfarbe & Probleme erkennen
 *
 * Läuft 1x täglich automatisch + manueller Trigger
 */
class PlantAnalysisService {
  constructor() {
    this.genAI = process.env.GEMINI_API_KEY
      ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      : null;
    this.analysisInterval = null;
    this.analysisIntervalHours = 24; // 1x täglich
    this.lastAnalysis = null;
    this.isAnalyzing = false;
  }

  /**
   * Service starten
   */
  start() {
    if (!this.genAI) {
      console.log('📷 PlantAnalysis: Kein GEMINI_API_KEY - Vision-Analyse deaktiviert');
      return;
    }

    console.log('📷 Plant Analysis Service gestartet (1x täglich)');

    // Periodische Analyse
    this.analysisInterval = setInterval(() => {
      this.analyzeAllPlants();
    }, this.analysisIntervalHours * 60 * 60 * 1000);

    // Erste Analyse nach 10 Minuten (System stabilisieren)
    setTimeout(() => this.analyzeAllPlants(), 10 * 60 * 1000);
  }

  /**
   * Service stoppen
   */
  stop() {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
  }

  /**
   * Status abrufen
   */
  getStatus() {
    return {
      enabled: !!this.genAI,
      isAnalyzing: this.isAnalyzing,
      lastAnalysis: this.lastAnalysis,
      intervalHours: this.analysisIntervalHours
    };
  }

  /**
   * Alle Pflanzen analysieren (Hauptmethode)
   */
  async analyzeAllPlants() {
    if (!this.genAI) {
      return { success: false, error: 'Gemini API nicht konfiguriert' };
    }

    if (this.isAnalyzing) {
      return { success: false, error: 'Analyse läuft bereits' };
    }

    this.isAnalyzing = true;

    try {
      // 1. Online-Kamera finden
      const camera = await Camera.findOne({ status: 'online' }).sort({ lastSeen: -1 });
      if (!camera || !camera.ip) {
        console.log('📷 PlantAnalysis: Keine Online-Kamera verfügbar');
        this.isAnalyzing = false;
        return { success: false, error: 'Keine Online-Kamera' };
      }

      // 2. Snapshot aufnehmen
      let imageBuffer;
      try {
        const response = await axios.get(`http://${camera.ip}/capture`, {
          responseType: 'arraybuffer',
          timeout: 15000
        });
        imageBuffer = Buffer.from(response.data);
      } catch (err) {
        console.error('📷 PlantAnalysis: Snapshot fehlgeschlagen:', err.message);
        this.isAnalyzing = false;
        return { success: false, error: 'Kamera-Snapshot fehlgeschlagen' };
      }

      // 3. Aktive Pflanzen laden
      const plants = await Plant.find({
        stage: { $nin: ['Leer', 'Geerntet'] }
      });

      if (plants.length === 0) {
        this.isAnalyzing = false;
        return { success: false, error: 'Keine aktiven Pflanzen' };
      }

      // 4. Gemini Vision API aufrufen
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const plantInfo = plants.map(p =>
        `Slot ${p.slotId}: ${p.name || 'Unbenannt'} (${p.strain || 'Unbekannt'}, Phase: ${p.stage || 'Unbekannt'})`
      ).join('; ');

      const prompt = `Du bist ein Grow-Experte. Analysiere dieses Bild einer Indoor-Growbox.
Es gibt ${plants.length} Pflanzen. ${plantInfo}

Für JEDE sichtbare Pflanze, schätze:
1. Kanopie-BREITE in Zentimetern (geschätzt vom Bild)
2. Gesundheitsbewertung von 1 (schlecht) bis 10 (perfekt)
3. Blattfarbe: "dunkelgruen", "hellgruen", "gelblich", "braun", "gefleckt"
4. Sichtbare Probleme (leeres Array wenn keine)

Antworte NUR mit validem JSON in diesem Format:
{"plants":[{"slotId":1,"width_cm":25,"health":8,"leafColor":"dunkelgruen","issues":[]}]}`;

      const imageBase64 = imageBuffer.toString('base64');

      const result = await model.generateContent([
        prompt,
        { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } }
      ]);

      const responseText = result.response.text();

      // 5. JSON parsen
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('📷 PlantAnalysis: Kein valides JSON in Gemini-Antwort');
        this.isAnalyzing = false;
        return { success: false, error: 'Ungültige AI-Antwort' };
      }

      const analysis = JSON.parse(jsonMatch[0]);

      // 6. Growth Logs aktualisieren
      const results = await this.updateGrowthLogs(analysis.plants || []);

      this.lastAnalysis = new Date();
      this.isAnalyzing = false;

      console.log(`📷 PlantAnalysis: ${results.length} Pflanzen analysiert`);
      return {
        success: true,
        analyzed: results.length,
        results,
        timestamp: this.lastAnalysis
      };

    } catch (error) {
      console.error('📷 PlantAnalysis Fehler:', error.message);
      this.isAnalyzing = false;
      return { success: false, error: error.message };
    }
  }

  /**
   * Growth Logs mit Analyse-Ergebnissen aktualisieren
   */
  async updateGrowthLogs(plantAnalyses) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const results = [];

    for (const analysis of plantAnalyses) {
      try {
        const plant = await Plant.findOne({ slotId: analysis.slotId });
        if (!plant) continue;

        // Heutiges Log finden oder erstellen
        let log = await PlantGrowthLog.findOne({ plant: plant._id, date: today });

        if (!log) {
          log = new PlantGrowthLog({
            plant: plant._id,
            date: today,
            environment: {},
            measurements: {
              height: { value: null, unit: 'cm' },
              width: { value: null, unit: 'cm' },
              stemDiameter: { value: null, unit: 'mm' }
            },
            health: {
              overall: 5,
              leafColor: 'dunkelgrün'
            },
            notes: 'Automatisch erstellt durch Pflanzen-Analyse'
          });
        }

        // Breite aktualisieren
        if (analysis.width_cm && analysis.width_cm > 0) {
          log.measurements.width = { value: analysis.width_cm, unit: 'cm' };
        }

        // Gesundheit aktualisieren
        if (analysis.health) {
          log.health.overall = Math.min(10, Math.max(1, analysis.health));
        }
        if (analysis.leafColor) {
          log.health.leafColor = analysis.leafColor;
        }

        // Probleme hinzufügen
        if (analysis.issues && analysis.issues.length > 0) {
          if (!log.health.issues) log.health.issues = [];
          for (const issue of analysis.issues) {
            log.health.issues.push({
              type: this.mapIssueType(issue),
              severity: 'leicht',
              description: issue
            });
          }
        }

        await log.save();
        results.push({
          slotId: analysis.slotId,
          name: plant.name,
          width: analysis.width_cm,
          health: analysis.health,
          leafColor: analysis.leafColor,
          issues: analysis.issues
        });

        console.log(`  📷 Slot ${analysis.slotId}: Breite=${analysis.width_cm}cm, Gesundheit=${analysis.health}/10`);

      } catch (error) {
        console.error(`  ❌ Fehler Slot ${analysis.slotId}:`, error.message);
      }
    }

    return results;
  }

  /**
   * Issue-Typ aus Freitext mappen
   */
  mapIssueType(issueText) {
    const lower = (issueText || '').toLowerCase();
    if (lower.includes('naehr') || lower.includes('nutrient') || lower.includes('deficien') || lower.includes('mangel')) return 'Nährstoffmangel';
    if (lower.includes('schaedl') || lower.includes('pest') || lower.includes('insekt')) return 'Schädlinge';
    if (lower.includes('licht') || lower.includes('light') || lower.includes('burn') || lower.includes('brand')) return 'Lichtstress';
    if (lower.includes('hitze') || lower.includes('heat') || lower.includes('trock')) return 'Hitzestress';
    if (lower.includes('ueber') || lower.includes('over') || lower.includes('wasser')) return 'Überwässerung';
    return 'Sonstiges';
  }
}

module.exports = new PlantAnalysisService();
