import { useState, useEffect } from 'react';
import { useTheme } from '../../theme';
import { useSocket } from '../../context/SocketContext';
import { calculateVPD } from '../../utils/growMath';
import DigitalTwin from './DigitalTwin';
import {
  Settings, Edit, Trash2, Plus, ChevronDown, ChevronUp,
  Activity, TrendingUp, AlertTriangle, Info
} from 'lucide-react';

function PlantGrid() {
  const { currentTheme } = useTheme();
  const { sensorData } = useSocket();
  const [plants, setPlants] = useState([]);
  const [expandedPlant, setExpandedPlant] = useState(null);

  // Initialisiere 6 Pflanzen beim ersten Laden
  useEffect(() => {
    const savedPlants = localStorage.getItem('digital-twin-plants');
    if (savedPlants) {
      setPlants(JSON.parse(savedPlants));
    } else {
      // Standard 6 Pflanzen erstellen
      const defaultPlants = [
        {
          id: 1,
          slotIndex: 0, // Index für soilMoisture Array
          name: 'Pflanze 1 (Unten Links)',
          position: 'bottom',
          zone: 'left',
          growthStage: 'vegetative',
          strain: 'Northern Lights',
          plantedDate: new Date().toISOString(),
          healthScore: 85,
          notes: ''
        },
        {
          id: 2,
          slotIndex: 1,
          name: 'Pflanze 2 (Unten Mitte)',
          position: 'bottom',
          zone: 'center',
          growthStage: 'vegetative',
          strain: 'Blue Dream',
          plantedDate: new Date().toISOString(),
          healthScore: 85,
          notes: ''
        },
        {
          id: 3,
          slotIndex: 2,
          name: 'Pflanze 3 (Unten Rechts)',
          position: 'bottom',
          zone: 'right',
          growthStage: 'flowering',
          strain: 'OG Kush',
          plantedDate: new Date().toISOString(),
          healthScore: 85,
          notes: ''
        },
        {
          id: 4,
          slotIndex: 3,
          name: 'Pflanze 4 (Mitte Links)',
          position: 'middle',
          zone: 'left',
          growthStage: 'vegetative',
          strain: 'White Widow',
          plantedDate: new Date().toISOString(),
          healthScore: 85,
          notes: ''
        },
        {
          id: 5,
          slotIndex: 4,
          name: 'Pflanze 5 (Mitte Rechts)',
          position: 'middle',
          zone: 'right',
          growthStage: 'seedling',
          strain: 'Amnesia Haze',
          plantedDate: new Date().toISOString(),
          healthScore: 85,
          notes: ''
        },
        {
          id: 6,
          slotIndex: 5,
          name: 'Pflanze 6 (Oben Mitte)',
          position: 'top',
          zone: 'center',
          growthStage: 'flowering',
          strain: 'Gorilla Glue',
          plantedDate: new Date().toISOString(),
          healthScore: 85,
          notes: ''
        }
      ];
      setPlants(defaultPlants);
      localStorage.setItem('digital-twin-plants', JSON.stringify(defaultPlants));
    }
  }, []);

  // Speichere Pflanzen bei Änderungen
  useEffect(() => {
    if (plants.length > 0) {
      localStorage.setItem('digital-twin-plants', JSON.stringify(plants));
    }
  }, [plants]);

  // Hole Sensordaten für eine spezifische Pflanze basierend auf Position
  const getPlantSensorData = (plant) => {
    if (!sensorData) return { temp: 24, humidity: 50, soilTemp: 22, light: 0 };

    let temp, humidity;

    // Wähle Sensor basierend auf Position
    switch (plant.position) {
      case 'bottom':
        temp = sensorData.temp_bottom || sensorData.temp || 24;
        humidity = sensorData.humidity_bottom || sensorData.humidity || 50;
        break;
      case 'middle':
        temp = sensorData.temp_middle || sensorData.temp || 24;
        humidity = sensorData.humidity_middle || sensorData.humidity || 50;
        break;
      case 'top':
        temp = sensorData.temp_top || sensorData.temp || 24;
        humidity = sensorData.humidity_top || sensorData.humidity || 50;
        break;
      default:
        temp = sensorData.temp || 24;
        humidity = sensorData.humidity || 50;
    }

    return {
      temp: temp > 0 ? temp : 24,
      humidity: humidity > 0 ? humidity : 50,
      soilTemp: sensorData.soil_temp || 22,
      light: sensorData.light_intensity || 0
    };
  };

  // Berechne Health Score UND Bodenfeuchte für jede Pflanze basierend auf echten Sensordaten
  useEffect(() => {
    if (!sensorData || plants.length === 0) return;

    const updatedPlants = plants.map(plant => {
      const plantData = getPlantSensorData(plant);

      // Hole ECHTE Bodenfeuchte aus sensorData.soilMoisture Array
      const soilMoistureArray = Array.isArray(sensorData.soilMoisture) ? sensorData.soilMoisture : [];
      const soilMoisture = soilMoistureArray[plant.slotIndex] || 0;

      let health = 100;
      const vpd = calculateVPD(plantData.temp, plantData.humidity);

      // Temperature penalties
      if (plantData.temp < 18) health -= 30;
      else if (plantData.temp < 20) health -= 15;
      else if (plantData.temp > 32) health -= 30;
      else if (plantData.temp > 28) health -= 10;

      // Humidity penalties
      if (plantData.humidity < 30) health -= 20;
      else if (plantData.humidity < 40) health -= 10;
      else if (plantData.humidity > 80) health -= 20;
      else if (plantData.humidity > 70) health -= 10;

      // VPD penalties
      if (vpd < 0.4 || vpd > 1.6) health -= 25;
      else if (vpd < 0.6 || vpd > 1.4) health -= 15;

      // Light penalties
      if (plantData.light < 20 && plant.growthStage !== 'seedling') health -= 15;

      // Soil moisture penalties
      if (soilMoisture < 20) health -= 30;
      else if (soilMoisture < 30) health -= 20;
      else if (soilMoisture > 85) health -= 15;

      return {
        ...plant,
        healthScore: Math.max(0, Math.min(100, health)),
        soilMoisture: soilMoisture // Echte Daten vom Sensor
      };
    });

    setPlants(updatedPlants);
  }, [sensorData]);

  const updatePlant = (id, updates) => {
    setPlants(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const toggleExpand = (id) => {
    setExpandedPlant(expandedPlant === id ? null : id);
  };

  const getHealthColor = (health) => {
    if (health >= 85) return '#10b981';
    if (health >= 70) return '#3b82f6';
    if (health >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getDaysGrowing = (plantedDate) => {
    const days = Math.floor((new Date() - new Date(plantedDate)) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="space-y-4">
      {/* Header mit Statistiken */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: currentTheme.bg.card,
            borderColor: currentTheme.border.default
          }}
        >
          <div className="text-sm" style={{ color: currentTheme.text.secondary }}>
            Gesamt Pflanzen
          </div>
          <div className="text-3xl font-bold mt-1" style={{ color: currentTheme.text.primary }}>
            {plants.length}
          </div>
        </div>

        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: currentTheme.bg.card,
            borderColor: currentTheme.border.default
          }}
        >
          <div className="text-sm" style={{ color: currentTheme.text.secondary }}>
            Gesunde Pflanzen
          </div>
          <div className="text-3xl font-bold mt-1" style={{ color: '#10b981' }}>
            {plants.filter(p => p.healthScore >= 85).length}
          </div>
        </div>

        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: currentTheme.bg.card,
            borderColor: currentTheme.border.default
          }}
        >
          <div className="text-sm" style={{ color: currentTheme.text.secondary }}>
            Ø Health Score
          </div>
          <div className="text-3xl font-bold mt-1" style={{ color: currentTheme.accent.color }}>
            {plants.length > 0
              ? Math.round(plants.reduce((sum, p) => sum + p.healthScore, 0) / plants.length)
              : 0}%
          </div>
        </div>

        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: currentTheme.bg.card,
            borderColor: currentTheme.border.default
          }}
        >
          <div className="text-sm" style={{ color: currentTheme.text.secondary }}>
            Kritisch
          </div>
          <div className="text-3xl font-bold mt-1" style={{ color: '#ef4444' }}>
            {plants.filter(p => p.healthScore < 50).length}
          </div>
        </div>
      </div>

      {/* 2 Spalten Grid für bessere Sichtbarkeit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {plants.map((plant) => (
          <div
            key={plant.id}
            className="rounded-xl border overflow-hidden transition-all hover:shadow-xl"
            style={{
              backgroundColor: currentTheme.bg.card,
              borderColor: expandedPlant === plant.id
                ? currentTheme.accent.color
                : currentTheme.border.default,
              borderWidth: expandedPlant === plant.id ? '2px' : '1px'
            }}
          >
            {/* Header */}
            <div
              className="px-5 py-4 border-b flex items-center justify-between cursor-pointer"
              style={{ borderColor: currentTheme.border.default }}
              onClick={() => toggleExpand(plant.id)}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: getHealthColor(plant.healthScore) }}
                />
                <div>
                  <div className="font-semibold text-base" style={{ color: currentTheme.text.primary }}>
                    {plant.name}
                  </div>
                  <div className="text-sm" style={{ color: currentTheme.text.secondary }}>
                    {plant.strain} • Tag {getDaysGrowing(plant.plantedDate)}
                  </div>
                </div>
              </div>
              <button>
                {expandedPlant === plant.id ? (
                  <ChevronUp size={20} style={{ color: currentTheme.text.secondary }} />
                ) : (
                  <ChevronDown size={20} style={{ color: currentTheme.text.secondary }} />
                )}
              </button>
            </div>

            {/* Digital Twin - Kompakt */}
            <div className="relative overflow-hidden rounded-lg" style={{ height: '550px' }}>
              <DigitalTwin
                growthStage={plant.growthStage}
                healthScore={plant.healthScore}
                soilMoisture={plant.soilMoisture || 60}
              />
            </div>

            {/* Quick Stats */}
            <div
              className="px-5 py-4 border-t grid grid-cols-2 gap-3"
              style={{ borderColor: currentTheme.border.default }}
            >
              <div>
                <div className="text-sm font-medium" style={{ color: currentTheme.text.secondary }}>
                  Health
                </div>
                <div className="text-xl font-bold mt-1" style={{ color: getHealthColor(plant.healthScore) }}>
                  {plant.healthScore}%
                </div>
              </div>
              <div>
                <div className="text-sm font-medium" style={{ color: currentTheme.text.secondary }}>
                  Stadium
                </div>
                <div className="text-base font-bold mt-1" style={{ color: currentTheme.text.primary }}>
                  {plant.growthStage === 'seedling' && '🌱 Keimling'}
                  {plant.growthStage === 'vegetative' && '🌿 Vegetativ'}
                  {plant.growthStage === 'flowering' && '🌺 Blüte'}
                  {plant.growthStage === 'harvest' && '🌾 Ernte'}
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedPlant === plant.id && (
              <div
                className="px-4 py-4 border-t space-y-3"
                style={{
                  borderColor: currentTheme.border.default,
                  backgroundColor: currentTheme.bg.hover
                }}
              >
                {/* Sensordaten */}
                <div>
                  <div className="text-sm font-semibold mb-3" style={{ color: currentTheme.text.secondary }}>
                    SENSORDATEN ({plant.position.toUpperCase()})
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: currentTheme.bg.card }}>
                      <span className="font-medium" style={{ color: currentTheme.text.secondary }}>Temp:</span>
                      <span className="font-bold text-base" style={{ color: currentTheme.text.primary }}>
                        {getPlantSensorData(plant).temp.toFixed(1)}°C
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: currentTheme.bg.card }}>
                      <span className="font-medium" style={{ color: currentTheme.text.secondary }}>RH:</span>
                      <span className="font-bold text-base" style={{ color: currentTheme.text.primary }}>
                        {getPlantSensorData(plant).humidity.toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded col-span-2" style={{
                      backgroundColor: currentTheme.bg.card,
                      borderLeft: `4px solid ${plant.soilMoisture < 30 ? '#ef4444' : plant.soilMoisture < 40 ? '#f59e0b' : '#10b981'}`
                    }}>
                      <span className="font-medium flex items-center gap-2" style={{ color: currentTheme.text.secondary }}>
                        💧 Bodenfeuchte:
                      </span>
                      <span className="font-bold text-lg" style={{
                        color: plant.soilMoisture < 30 ? '#ef4444' : plant.soilMoisture < 40 ? '#f59e0b' : currentTheme.text.primary
                      }}>
                        {plant.soilMoisture}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Wachstumsstadium Selector */}
                <div>
                  <label className="text-xs font-semibold mb-2 block" style={{ color: currentTheme.text.secondary }}>
                    WACHSTUMSSTADIUM
                  </label>
                  <select
                    value={plant.growthStage}
                    onChange={(e) => updatePlant(plant.id, { growthStage: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{
                      backgroundColor: currentTheme.bg.card,
                      borderColor: currentTheme.border.default,
                      color: currentTheme.text.primary
                    }}
                  >
                    <option value="seedling">🌱 Keimling</option>
                    <option value="vegetative">🌿 Vegetativ</option>
                    <option value="flowering">🌺 Blüte</option>
                    <option value="harvest">🌾 Erntereif</option>
                  </select>
                </div>

                {/* Name bearbeiten */}
                <div>
                  <label className="text-xs font-semibold mb-2 block" style={{ color: currentTheme.text.secondary }}>
                    NAME / SORTE
                  </label>
                  <input
                    type="text"
                    value={plant.strain}
                    onChange={(e) => updatePlant(plant.id, { strain: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{
                      backgroundColor: currentTheme.bg.card,
                      borderColor: currentTheme.border.default,
                      color: currentTheme.text.primary
                    }}
                  />
                </div>

                {/* Notizen */}
                <div>
                  <label className="text-xs font-semibold mb-2 block" style={{ color: currentTheme.text.secondary }}>
                    NOTIZEN
                  </label>
                  <textarea
                    value={plant.notes}
                    onChange={(e) => updatePlant(plant.id, { notes: e.target.value })}
                    rows="2"
                    className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                    style={{
                      backgroundColor: currentTheme.bg.card,
                      borderColor: currentTheme.border.default,
                      color: currentTheme.text.primary
                    }}
                    placeholder="Notizen zur Pflanze..."
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default PlantGrid;
