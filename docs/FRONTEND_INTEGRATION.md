# Frontend-Integration: Nährstoff-Management

## ✅ Was ist bereits fertig?

- ✅ **API-Wrapper** (`frontend/src/utils/api.js`) - `nutrientsAPI` komplett
- ✅ **Legacy-Wrapper** (`frontend/src/services/api.js`) - Backwards-Kompatibilität
- ✅ **Dashboard-Komponente** (`frontend/src/components/Nutrients/NutrientDashboard.jsx`)

---

## 🔧 Integration in die App

### Schritt 1: Icons importieren

**Datei: `frontend/src/App.jsx`**

```jsx
// Ergänze in der Import-Zeile von lucide-react:
import {
  LayoutDashboard, Sprout, Settings as SettingsIcon, BarChart3,
  Calendar, Cpu, Bot, Sliders, Bell, Menu, X, Leaf, BookOpen, LogOut, Loader,
  Beaker  // ← NEU HINZUFÜGEN
} from 'lucide-react';
```

### Schritt 2: Komponente importieren

**Datei: `frontend/src/App.jsx`** (oben bei den anderen Imports)

```jsx
import Dashboard from './components/Dashboard';
import Plants from './components/Plants';
import Controls from './components/Controls';
import Analytics from './components/Analytics';
import CalendarView from './components/CalendarView';
import Hardware from './components/Hardware';
import AIConsultant from './components/AIConsultant';
import Settings from './components/Settings';
import GrowRecipes from './components/GrowRecipes';
import Login from './components/Auth/Login';
import NutrientDashboard from './components/Nutrients/NutrientDashboard';  // ← NEU
```

### Schritt 3: Navigation erweitern

**Datei: `frontend/src/App.jsx`** in der `AppContent`-Funktion

Finde das `navItems`-Array (ca. Zeile 117-127) und ergänze:

```jsx
const navItems = [
  { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Übersicht' },
  { id: 'plants', icon: <Sprout size={20} />, label: 'Pflanzen' },
  { id: 'recipes', icon: <BookOpen size={20} />, label: 'Rezepte' },
  { id: 'calendar', icon: <Calendar size={20} />, label: 'Kalender' },
  { id: 'analytics', icon: <BarChart3 size={20} />, label: 'Historie' },
  { id: 'controls', icon: <Sliders size={20} />, label: 'Steuerung' },
  { id: 'nutrients', icon: <Beaker size={20} />, label: 'Nährstoffe' },  // ← NEU
  { id: 'ai', icon: <Bot size={20} />, label: 'AI Consultant' },
  { id: 'hardware', icon: <Cpu size={20} />, label: 'System' },
  { id: 'settings', icon: <SettingsIcon size={20} />, label: 'Einstellungen' },
];
```

### Schritt 4: Render-Switch erweitern

**Datei: `frontend/src/App.jsx`** in der `main`-Section (ca. Zeile 202-213)

```jsx
<main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
  <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
    {activeTab === 'dashboard' && <Dashboard changeTab={setActiveTab} />}
    {activeTab === 'plants' && <Plants />}
    {activeTab === 'recipes' && <GrowRecipes />}
    {activeTab === 'calendar' && <CalendarView />}
    {activeTab === 'ai' && <AIConsultant />}
    {activeTab === 'analytics' && <Analytics />}
    {activeTab === 'hardware' && <Hardware />}
    {activeTab === 'controls' && <Controls />}
    {activeTab === 'nutrients' && <NutrientDashboard />}  {/* ← NEU */}
    {activeTab === 'settings' && <Settings />}
  </div>
</main>
```

### Schritt 5: Page-Title aktualisieren

**Datei: `frontend/src/App.jsx`** in der `getPageTitle()`-Funktion (ca. Zeile 102-115)

```jsx
const getPageTitle = () => {
  switch(activeTab) {
    case 'dashboard': return 'System Übersicht';
    case 'plants': return 'Pflanzen Management';
    case 'recipes': return 'Grow-Rezepte';
    case 'calendar': return 'Grow Kalender';
    case 'analytics': return 'Daten & Analyse';
    case 'controls': return 'Manuelle Steuerung';
    case 'nutrients': return 'Nährstoff-Management';  // ← NEU
    case 'settings': return 'Einstellungen';
    case 'hardware': return 'System Status';
    case 'ai': return 'AI Consultant';
    default: return 'GrowMonitor';
  }
};
```

---

## ✅ Komplett! Teste die Integration

1. **Frontend starten:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Browser öffnen:**
   ```
   http://localhost:5173
   ```

3. **Tab "Nährstoffe" im Sidebar klicken**

4. **Dashboard sollte angezeigt werden mit:**
   - EC/pH/Temp Live-Werte
   - Reservoir-Füllstände
   - Button "Jetzt Dosieren"

---

## 🎨 Weitere UI-Komponenten (Optional)

### 1. Schedule-Editor erstellen

**Datei: `frontend/src/components/Nutrients/ScheduleEditor.jsx`**

```jsx
import React, { useState } from 'react';
import { nutrientsAPI } from '../../utils/api';

export default function ScheduleEditor({ onClose, onSave }) {
  const [form, setForm] = useState({
    name: 'Neuer Zeitplan',
    type: 'fixed',
    schedule: {
      enabled: true,
      daysOfWeek: [1, 3, 5],  // Mo, Mi, Fr
      time: '09:00'
    },
    dosage: {
      singlePump: {
        enabled: true,
        ml_per_liter: 2,
        pumpId: 1
      }
    },
    waterVolume: {
      liters: 10
    }
  });

  const handleSubmit = async () => {
    try {
      await nutrientsAPI.createSchedule(form);
      onSave();
      onClose();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full">
        <h2 className="text-2xl font-bold text-white mb-6">Zeitplan erstellen</h2>

        {/* Form-Felder hier ergänzen */}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg">
            Abbrechen
          </button>
          <button onClick={handleSubmit} className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg">
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 2. Dosage-History hinzufügen

**In `NutrientDashboard.jsx` ergänzen:**

```jsx
import { nutrientsAPI } from '../../utils/api';

const [logs, setLogs] = useState([]);

useEffect(() => {
  loadLogs();
}, []);

const loadLogs = async () => {
  try {
    const data = await nutrientsAPI.getLogs({ limit: 10 });
    setLogs(data.data || data);
  } catch (error) {
    console.error(error);
  }
};

// Im JSX ergänzen:
<div>
  <h3 className="text-lg font-bold text-white mb-4">Letzte Dosierungen</h3>
  <div className="space-y-2">
    {logs.map(log => (
      <div key={log._id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="flex justify-between">
          <span className="text-sm text-slate-400">
            {new Date(log.createdAt).toLocaleString('de-DE')}
          </span>
          <span className="text-emerald-400 font-mono">
            {log.dosage.totalVolume_ml}ml
          </span>
        </div>
        {log.notes && (
          <div className="text-xs text-slate-500 mt-1">{log.notes}</div>
        )}
      </div>
    ))}
  </div>
</div>
```

### 3. Statistiken anzeigen

```jsx
const [stats, setStats] = useState(null);

const loadStats = async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const data = await nutrientsAPI.getStats(thirtyDaysAgo.toISOString(), new Date().toISOString());
  setStats(data.data || data);
};

// JSX:
{stats && (
  <div className="grid grid-cols-3 gap-4">
    <div className="bg-slate-900 p-4 rounded-xl">
      <div className="text-xs text-slate-500">Dosierungen (30d)</div>
      <div className="text-2xl font-bold text-white">{stats.totalDosages}</div>
    </div>
    <div className="bg-slate-900 p-4 rounded-xl">
      <div className="text-xs text-slate-500">Gesamt-Volumen</div>
      <div className="text-2xl font-bold text-white">{stats.totalVolume_liters.toFixed(1)}L</div>
    </div>
    <div className="bg-slate-900 p-4 rounded-xl">
      <div className="text-xs text-slate-500">Ø EC-Anstieg</div>
      <div className="text-2xl font-bold text-emerald-400">+{stats.avgECIncrease.toFixed(2)}</div>
    </div>
  </div>
)}
```

---

## 🧪 Test-Szenarien

### 1. Backend läuft, ESP32 offline

**Erwartetes Verhalten:**
- Dashboard zeigt Daten an
- Reservoir-Status wird geladen
- EC/pH/Temp zeigen letzte bekannte Werte oder "--"
- Manuelle Dosierung schickt Command, ESP32 antwortet nicht → Timeout

### 2. Backend läuft, ESP32 online

**Erwartetes Verhalten:**
- Live-Werte werden angezeigt
- Manuelle Dosierung funktioniert
- Status-Updates in Echtzeit
- Warnungen bei niedrigem Füllstand

### 3. Backend offline

**Erwartetes Verhalten:**
- API-Calls schlagen fehl
- Error-Handling im Frontend zeigt Fehlermeldung
- Keine Crashes

---

## 🎨 Styling-Anpassungen

### Dark Mode ist bereits aktiv

Alle Komponenten nutzen:
- `bg-slate-900` - Cards
- `border-slate-800` - Borders
- `text-white` - Primär-Text
- `text-slate-400` - Sekundär-Text
- `text-emerald-400` - Akzent-Farbe

### Farb-Schema anpassen

Wenn gewünscht, ändere in `NutrientDashboard.jsx`:

```jsx
// Von Emerald zu anderem Akzent
className="text-emerald-400"  →  className="text-purple-400"
className="bg-emerald-500"    →  className="bg-purple-500"
```

---

## 📱 Responsive Design

Das Dashboard ist bereits responsive:

- **Mobile** (< 768px): 1 Spalte
- **Tablet** (768-1024px): 2 Spalten
- **Desktop** (> 1024px): 3 Spalten

Grid-Layout:
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

---

## 🐛 Troubleshooting

### "Cannot read property 'data' of undefined"

**Problem:** API gibt nicht erwartetefind Format zurück

**Lösung:**
```jsx
// Statt:
setReservoir(resData.data);

// Besser:
setReservoir(resData?.data || resData);
```

### "CORS Error"

**Problem:** Backend blockt Frontend-Requests

**Lösung in `backend/.env`:**
```env
FRONTEND_URL=http://localhost:5173
```

### Manuelle Dosierung schlägt fehl

**Prüfe:**
1. Backend läuft? → `http://localhost:3000/api/nutrients/reservoir`
2. ESP32 verbunden? → Serial Monitor
3. MQTT-Broker läuft? → `mosquitto_sub -h localhost -t "#" -v`

---

## ✅ Checkliste

- [ ] Icons importiert (`Beaker` von lucide-react)
- [ ] Komponente importiert (`NutrientDashboard`)
- [ ] navItems erweitert
- [ ] Render-Switch ergänzt
- [ ] getPageTitle aktualisiert
- [ ] Frontend läuft ohne Fehler
- [ ] Tab "Nährstoffe" sichtbar
- [ ] Dashboard wird angezeigt
- [ ] API-Calls funktionieren

---

## 🚀 Next Steps

1. **Testen:**
   - Manuelle Dosierung durchführen
   - Logs prüfen
   - Reservoir-Status aktualisieren

2. **Erweitern:**
   - Schedule-Editor bauen
   - Statistiken integrieren
   - Kalibrierungs-Wizard

3. **Optimieren:**
   - Loading-States verfeinern
   - Error-Handling verbessern
   - Notifications bei Warnungen

---

**Status:** ✅ Ready to Use
**Dokumentation:** `docs/NUTRIENT_QUICKSTART.md`
**Support:** GitHub Issues

Viel Erfolg! 🌱💧
