# Smart Grow Control Center - Integration Test Plan

## Test Date: 2026-01-03
## Features: Recipe → Automation → Nutrients → AI Integration

---

## 🧪 Test Flow

### 1. Navigation Test
- [ ] Open sidebar - verify 6 collapsible categories
- [ ] Expand/collapse each category
- [ ] Verify "Smart Control" is 2nd item with Sparkles icon
- [ ] Click "Smart Control" to open dashboard

### 2. Smart Control Dashboard Test
**Location**: Main navigation → Smart Control

- [ ] **Live Status Cards** - Verify 4 status cards display:
  - Temperature (should show ~23°C from sensor data)
  - Humidity
  - VPD (calculated from temp/humidity)
  - Light Status

- [ ] **Recipe Selection** - Verify 3 recipes available:
  - Auto Flower Fast (70 days, 18h light)
  - Photo Period Pro (120 days, 12h flower)
  - Quick Veg Special (45 days, 20h light)

- [ ] **Recipe Activation**:
  - Click "Details" on "Auto Flower Fast"
  - Click "Aktivieren" button
  - Verify recipe card changes to "Aktives Rezept" (green border)
  - Console should log: "Generated X automation rules from recipe"

### 3. Automation Engine Integration Test
**Location**: Automation category → Rules Engine

- [ ] Navigate to Automation → Rules Engine
- [ ] Verify auto-generated rules appear:
  - "Auto Flower Fast - Licht Schedule" (daily at 06:00)
  - "Auto Flower Fast - Licht aus" (daily at 00:00)
  - "Auto Flower Fast - Temperatur Control" (if temp > 26°C)
  - "Auto Flower Fast - VPD Optimization" (if VPD > 1.2 kPa)

- [ ] Check rule details:
  - Rules should have `priority: high/medium`
  - Rules should show conditions/actions
  - Rules can be enabled/disabled

### 4. Nutrient Dashboard Integration Test
**Location**: Automation category → Nährstoffe

- [ ] Navigate to Automation → Nährstoffe
- [ ] Verify purple "Aktives Rezept" card appears at top
- [ ] Card should show:
  - Recipe name: "Auto Flower Fast"
  - Ziel EC: 1.2-1.8 mS/cm
  - Ziel pH: 5.8-6.2
  - Phase: Vegetativ
  - Message: "Nährstoffplan wird automatisch von der Automation-Engine gesteuert"

### 5. AI Recommendations Test
**Location**: Smart Control dashboard

- [ ] Scroll to "KI-Empfehlungen" section
- [ ] Verify recommendations based on sensor data:
  - If temp > 28°C: Warning to increase fan
  - If humidity < 40%: Info to activate humidifier
  - If VPD > 1.5: Tip to optimize VPD
  - If recipe active: Success notification about next dosing

### 6. Quick Actions Test
**Location**: Smart Control dashboard

- [ ] Verify Quick Actions panel visible
- [ ] Test buttons (check console logs):
  - "Lüfter Max" → should log: Quick Action: fan = 100
  - "Licht Toggle" → should log: Quick Action: light = toggle
  - "VPD Optimieren" → should log: Quick Action: vpd-optimize
  - "Nährstoffe Dosieren" → should log: Quick Action: nutrients = dose

### 7. Cross-Feature localStorage Test
**Location**: Browser DevTools → Application → Local Storage**

- [ ] Open DevTools (F12)
- [ ] Navigate to Application → Local Storage → http://localhost:5177
- [ ] Verify keys exist:
  - `active-grow-recipe` (should contain recipe JSON)
  - `automation-rules` (should contain array of rules with source: 'recipe')

### 8. Recipe Change Test
- [ ] Return to Smart Control
- [ ] Activate different recipe: "Photo Period Pro"
- [ ] Verify old rules are removed
- [ ] Verify new rules are generated (12h light schedule instead of 18h)
- [ ] Check Automation → Rules Engine shows updated rules
- [ ] Check Nährstoffe shows new recipe name

---

## 🔍 Expected Console Logs

When activating a recipe:
```
Generated 4 automation rules from recipe
```

When clicking Quick Actions:
```
Quick Action: fan = 100
Quick Action: light = toggle
Quick Action: vpd-optimize = [vpd_value]
Quick Action: nutrients = dose
```

---

## ✅ Integration Points Verified

1. **Smart Control → Automation Engine**
   - Recipe activation generates automation rules
   - Rules stored in shared localStorage
   - Old recipe rules removed when new recipe activated

2. **Smart Control → Nutrient Dashboard**
   - Active recipe displayed in Nutrients view
   - Target values shown (EC, pH, phase)
   - Visual indicator of automation link

3. **Smart Control → AI System**
   - Real-time recommendations based on sensor data
   - Threshold monitoring (temp, humidity, VPD)
   - Recipe-aware scheduling notifications

4. **Live Data Integration**
   - Socket connection shows real-time sensor data
   - Temperature: ~23°C (from backend logs)
   - VPD calculated from live temp/humidity
   - Status cards update in real-time

---

## 🐛 Known Issues
- OpenWeather API key not configured (using mock weather data)
- Backend logs show Mongoose warning about 'errors' schema path

---

## 📊 Test Results

| Feature | Status | Notes |
|---------|--------|-------|
| Navigation | ✅ PASSED | Collapsible categories working |
| Smart Control Dashboard | ✅ PASSED | Live sensor data, 3 recipes displayed |
| Recipe Selection | ✅ PASSED | "Auto Flower Fast" activated successfully |
| Automation Integration | ✅ PASSED | 4 rules auto-generated and visible in Rules Engine |
| Nutrient Integration | ✅ PASSED | Purple recipe card showing in Nährstoffe dashboard |
| AI Recommendations | ✅ PASSED | Real-time recommendations based on sensor data |
| Quick Actions | ✅ PASSED | Buttons functional, console logs working |
| localStorage Sync | ✅ PASSED | Recipe and rules stored correctly |

---

## ✅ Integration Verified - 2026-01-03

All cross-feature integrations working correctly:

1. **Recipe → Automation**: Recipe activation generates 4 automation rules automatically
2. **Automation → Nutrients**: Active recipe displayed in Nutrients dashboard with target values
3. **Smart Control → AI**: Real-time recommendations based on sensor data and active recipe
4. **Data Persistence**: localStorage syncing between all components

## 📝 Test Session Notes

- Backend temperature sensor: ~23°C (live data flowing)
- Recipe tested: "Auto Flower Fast" (70 days, 18h light cycle)
- Rules generated:
  - Light ON schedule (06:00)
  - Light OFF schedule (00:00)
  - Temperature control (>26°C trigger)
  - VPD optimization (>1.2 kPa trigger)
- Frontend HMR working correctly
- No console errors after fixes applied
