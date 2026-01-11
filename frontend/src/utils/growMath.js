// Berechnung des Sättigungsdampfdrucks (SVP)
const calculateSVP = (temp) => {
  return 0.61078 * Math.exp((17.27 * temp) / (temp + 237.3));
};

// 1. VPD (Vapor Pressure Deficit) in kPa
export const calculateVPD = (temp, humidity) => {
  if (!temp || !humidity) return 0;
  const svp = calculateSVP(temp);
  const vpd = svp * (1 - humidity / 100);
  return parseFloat(vpd.toFixed(2));
};

// 2. Taupunkt (Dew Point) in °C
export const calculateDewPoint = (temp, humidity) => {
  if (!temp || !humidity) return 0;
  const a = 17.27;
  const b = 237.7;
  const alpha = ((a * temp) / (b + temp)) + Math.log(humidity / 100.0);
  const dewPoint = (b * alpha) / (a - alpha);
  return parseFloat(dewPoint.toFixed(1));
};

// 3. DLI (Daily Light Integral) in mol/m²/d
// Annahme: Wir rechnen Lux grob in PPFD um (Sonnenlicht/Weißlicht Faktor ~0.015)
// und nehmen an, das Licht ist 'hours' Stunden an.
export const calculateDLI = (lux, hours = 18) => {
  if (!lux) return 0;
  const ppfd = lux * 0.015; // Umrechnungsfaktor (variiert je nach Lampe, 0.015 ist guter Durchschnitt)
  const dli = (ppfd * 3600 * hours) / 1000000;
  return parseFloat(dli.toFixed(1));
};

// Helper: Status Farbe für VPD
export const getVPDStatus = (vpd, stage = 'vegetative') => {
  // Idealwerte: Veg: 0.8 - 1.1 | Blüte: 1.0 - 1.5
  let min = 0.8, max = 1.2;
  
  if (stage === 'flowering') { min = 1.0; max = 1.5; }
  else if (stage === 'seedling') { min = 0.4; max = 0.8; }

  if (vpd >= min && vpd <= max) return { color: 'emerald', label: 'Perfekt' };
  if (vpd < min) return { color: 'blue', label: 'Zu Feucht (Niedrig)' };
  return { color: 'amber', label: 'Zu Trocken (Hoch)' };
};