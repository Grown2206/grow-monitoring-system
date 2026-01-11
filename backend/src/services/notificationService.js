const fetch = require('node-fetch'); // Falls node < 18, sonst ist fetch native

// In einer echten App würde man dies in der DB pro User speichern
// Hier nutzen wir eine Variable zur Laufzeit
let webhookUrl = ""; 

const setWebhook = (url) => {
  webhookUrl = url;
  console.log("🔔 Webhook URL aktualisiert.");
};

const getWebhook = () => webhookUrl;

const sendAlert = async (title, message, color = 0xFF0000) => {
  if (!webhookUrl) return;

  try {
    const payload = {
      embeds: [{
        title: title,
        description: message,
        color: color, // Dezimalfarbe (Rot=16711680, Grün=5763719)
        footer: { text: "GrowMonitor System v1.1" },
        timestamp: new Date()
      }]
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
  } catch (error) {
    console.error("Webhook Sende-Fehler:", error.message);
  }
};

module.exports = { setWebhook, getWebhook, sendAlert };