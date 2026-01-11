const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialisierung (wird übersprungen, wenn kein Key da ist)
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

const getConsultation = async (req, res) => {
  try {
    const { sensorData, plants, logs } = req.body;

    // 1. Prompt zusammenbauen (Der Kontext für die KI)
    const systemPrompt = `
      Du bist ein professioneller Master Grower und Botaniker für Indoor-Pflanzenzucht.
      Analysiere die folgenden Telemetrie-Daten einer Grow-Box und gib präzise, hilfreiche Empfehlungen.
      
      AKTUELLE UMGEBUNG:
      - Temperatur: ${sensorData.temp}°C
      - Luftfeuchtigkeit: ${sensorData.humidity}%
      - Licht: ${sensorData.lux} Lux
      - Bodenfeuchtigkeit: ${sensorData.soil.join(', ')}%
      - Tank Level: ${sensorData.tank}
      
      PFLANZEN STATUS:
      ${plants.map(p => `- ${p.name} (${p.strain}): ${p.stage}`).join('\n')}
      
      LETZTE SYSTEM LOGS:
      ${logs.slice(0, 5).map(l => `[${l.type}] ${l.message}`).join('\n')}

      AUFGABE:
      1. Bewerte das aktuelle Klima (VPD, Temp, RLF) passend zur Pflanzenphase.
      2. Erkenne Risiken (Schimmel, Austrocknung, Lichtstress).
      3. Gib 3 konkrete Handlungsempfehlungen.
      
      Antworte kurz, prägnant und im Markdown Format. Nutze Emojis.
    `;

    // 2. KI Abfragen (oder Simulieren)
    if (genAI) {
      const model = genAI.getGenerativeModel({ model: "gemini-pro"});
      const result = await model.generateContent(systemPrompt);
      const response = await result.response;
      const text = response.text();
      res.json({ analysis: text });
    } else {
      // --- SIMULATION (Falls kein API Key eingerichtet ist) ---
      console.log("⚠️ Kein API Key gefunden. Sende Simulation.");
      await new Promise(r => setTimeout(r, 2000)); // Ladezeit faken
      
      res.json({ 
        analysis: `### 🌱 AI Grow Analyse (Simulation)
        
**1. Klima-Check:**
Die Temperatur von **${sensorData.temp}°C** ist optimal. Die Luftfeuchtigkeit von **${sensorData.humidity}%** liegt im guten Bereich für die vegetative Phase, könnte aber für die späte Blüte zu hoch sein (Schimmelgefahr!).

**2. Risiken:**
* ⚠️ **Pflanze 3** scheint etwas trocken zu sein (${sensorData.soil[2]}%).
* Der Wassertank sollte bald aufgefüllt werden.

**3. Empfehlungen:**
1.  💧 **Gießen:** Prüfe die Töpfe hinten rechts.
2.  💨 **Umluft:** Stelle sicher, dass der Ventilator nachts läuft, um Micro-Klima Stau zu verhindern.
3.  📝 **Düngung:** Basierend auf der Phase "Vegetation" kannst du den EC-Wert leicht erhöhen.

*(Hinweis: Trage deinen GEMINI_API_KEY in die .env Datei ein, um echte Live-Analysen zu erhalten!)*`
      });
    }

  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ message: "KI Analyse fehlgeschlagen." });
  }
};

module.exports = { getConsultation };