import { useState, useEffect } from 'react';
import { useTheme } from '../../theme';
import { useSensorAverages } from '../../hooks/useSensorAverages';
import { calculateVPD } from '../../utils/growMath';
import {
  Droplets, Thermometer, Sun, Wind, Activity, TrendingUp,
  Zap, AlertTriangle, CheckCircle, Info, Leaf
} from 'lucide-react';

function DigitalTwin({ growthStage = 'vegetative', healthScore = 85, soilMoisture = 60, realHeight = null }) {
  const { currentTheme } = useTheme();
  const theme = currentTheme;
  const { temp, humidity, soilTemp, light } = useSensorAverages();
  const [plantHeight, setPlantHeight] = useState(50);
  const [leafColor, setLeafColor] = useState('#10b981');
  const [animationClass, setAnimationClass] = useState('');

  // Nutze Hook-Daten mit Fallbacks
  const currentData = {
    temp: temp || 24,
    humidity: humidity || 50,
    soilTemp: soilTemp || 22,
    light: light || 0
  };
  const vpd = calculateVPD(currentData.temp, currentData.humidity);

  // Update Pflanzengröße - echte Höhendaten priorisieren (VL53L0X)
  useEffect(() => {
    if (realHeight && realHeight > 0) {
      // Echte Höhe: cm → SVG-Einheit (max ~90)
      const svgHeight = Math.min(95, Math.max(15, (realHeight / 80) * 90));
      setPlantHeight(svgHeight);
    } else {
      // Fallback: basierend auf Wachstumsstadium und Health Score
      const stageHeights = {
        seedling: 30,
        vegetative: 60,
        flowering: 80,
        harvest: 90
      };

      const baseHeight = stageHeights[growthStage] || 50;
      const healthModifier = (healthScore / 100) * 0.3; // max ±30%
      setPlantHeight(baseHeight * (1 + healthModifier - 0.15));
    }
  }, [growthStage, healthScore, realHeight]);

  // Update Blattfarbe basierend auf Health und Umgebung
  useEffect(() => {
    if (healthScore < 40) {
      setLeafColor('#92400e'); // Braun - krank
    } else if (healthScore < 60) {
      setLeafColor('#ca8a04'); // Gelb-braun - gestresst
    } else if (currentData.light > 80 && healthScore < 80) {
      setLeafColor('#eab308'); // Gelb - zu viel Licht
    } else if (healthScore >= 85) {
      setLeafColor('#10b981'); // Gesundes Grün
    } else {
      setLeafColor('#22c55e'); // Normal Grün
    }

    // Animation bei niedrigem VPD (schlappe Blätter)
    if (vpd < 0.4 || currentData.humidity > 80) {
      setAnimationClass('droopy');
    } else if (vpd > 1.5 || currentData.temp > 30) {
      setAnimationClass('stressed');
    } else {
      setAnimationClass('healthy');
    }
  }, [healthScore, currentData, vpd]);

  // Status Badge Farbe
  const getStatusColor = () => {
    if (healthScore >= 85) return currentTheme.status?.success || '#10b981';
    if (healthScore >= 70) return currentTheme.status?.info || '#3b82f6';
    if (healthScore >= 50) return currentTheme.status?.warning || '#f59e0b';
    return currentTheme.status?.error || '#ef4444';
  };

  // Sensor-Badge Komponente
  const SensorBadge = ({ icon: Icon, label, value, unit, status = 'normal', position }) => (
    <div
      className="absolute flex items-center gap-2 px-4 py-2.5 rounded-lg backdrop-blur-sm border shadow-lg transition-all hover:scale-105"
      style={{
        ...position,
        backgroundColor: currentTheme.bg.card + 'DD',
        borderColor: status === 'warning' ? '#f59e0b' : status === 'error' ? '#ef4444' : currentTheme.border.default
      }}
    >
      <Icon
        size={18}
        style={{
          color: status === 'warning' ? '#f59e0b' : status === 'error' ? '#ef4444' : currentTheme.accent.color
        }}
      />
      <div>
        <div className="text-sm font-medium" style={{ color: currentTheme.text.secondary }}>{label}</div>
        <div className="font-bold text-base" style={{ color: currentTheme.text.primary }}>
          {value}{unit}
        </div>
      </div>
    </div>
  );

  // Wachstumsstadium Badge
  const getStageName = (stage) => {
    const stages = {
      seedling: 'Keimling',
      vegetative: 'Vegetativ',
      flowering: 'Blüte',
      harvest: 'Erntereif'
    };
    return stages[stage] || stage;
  };

  const getStageIcon = (stage) => {
    if (stage === 'seedling') return '🌱';
    if (stage === 'vegetative') return '🌿';
    if (stage === 'flowering') return '🌺';
    if (stage === 'harvest') return '🌾';
    return '🌱';
  };

  return (
    <div className="relative w-full min-h-[600px] flex items-center justify-center p-4">
      {/* Background Umgebung */}
      <div
        className="absolute inset-0 rounded-xl overflow-hidden"
        style={{
          background: `linear-gradient(to bottom, ${
            currentData.light > 50 ? '#fef3c7' : currentTheme.bg.main
          } 0%, ${currentTheme.bg.card} 100%)`
        }}
      >
        {/* Licht-Strahlen Animation */}
        {currentData.light > 30 && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64">
            <svg width="100%" height="100%" className="opacity-30">
              <defs>
                <radialGradient id="lightGradient">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="50%" cy="0" r="120" fill="url(#lightGradient)" className="animate-pulse" />
            </svg>
            <Sun
              size={40}
              className="absolute top-4 left-1/2 -translate-x-1/2 animate-pulse"
              style={{ color: '#fbbf24' }}
            />
          </div>
        )}

        {/* Luftfeuchtigkeit Nebel-Effekt */}
        {currentData.humidity > 60 && (
          <div
            className="absolute bottom-0 left-0 right-0 h-32 opacity-20"
            style={{
              background: 'linear-gradient(to top, rgba(147, 197, 253, 0.5), transparent)',
              animation: 'float 4s ease-in-out infinite'
            }}
          />
        )}
      </div>

      {/* Pflanze Container */}
      <div className="relative z-10 flex flex-col items-center justify-end h-full pb-8">
        {/* Topf */}
        <svg width="200" height="600" className="drop-shadow-2xl">
          {/* Boden/Erde */}
          <rect
            x="50"
            y="520"
            width="100"
            height="60"
            rx="4"
            fill="#78350f"
            opacity="0.8"
          />
          <rect
            x="55"
            y="525"
            width="90"
            height="50"
            rx="2"
            fill="#92400e"
          />

          {/* Topf */}
          <path
            d="M 40 520 L 50 580 L 150 580 L 160 520 Z"
            fill="#7c2d12"
            stroke="#451a03"
            strokeWidth="2"
          />

          {/* Wurzeln (sichtbar durch Glas-Effekt) */}
          <g opacity="0.3">
            <path
              d="M 100 520 Q 80 540 75 560"
              stroke="#92400e"
              strokeWidth="2"
              fill="none"
              className="animate-pulse"
            />
            <path
              d="M 100 520 Q 120 540 125 560"
              stroke="#92400e"
              strokeWidth="2"
              fill="none"
              className="animate-pulse"
            />
          </g>

          {/* Bodenfeuchte Visualisierung - Wassertropfen */}
          {soilMoisture > 40 && (
            <g opacity={soilMoisture / 100}>
              <ellipse
                cx="70"
                cy="545"
                rx="3"
                ry="4"
                fill="#3b82f6"
                className="animate-pulse"
              />
              <ellipse
                cx="130"
                cy="550"
                rx="3"
                ry="4"
                fill="#3b82f6"
                className="animate-pulse"
              />
              {soilMoisture > 60 && (
                <>
                  <ellipse
                    cx="85"
                    cy="555"
                    rx="2.5"
                    ry="3.5"
                    fill="#60a5fa"
                    className="animate-pulse"
                  />
                  <ellipse
                    cx="115"
                    cy="547"
                    rx="2.5"
                    ry="3.5"
                    fill="#60a5fa"
                    className="animate-pulse"
                  />
                </>
              )}
            </g>
          )}

          {/* Warnung bei zu trockener Erde */}
          {soilMoisture < 30 && (
            <g>
              <rect
                x="55"
                y="535"
                width="90"
                height="40"
                rx="2"
                fill="#78350f"
                opacity="0.6"
              />
              <text
                x="100"
                y="557"
                textAnchor="middle"
                fontSize="10"
                fill="#fbbf24"
                fontWeight="bold"
              >
                ZU TROCKEN!
              </text>
            </g>
          )}

          {/* Stamm */}
          <rect
            x="95"
            y={520 - (plantHeight * 4)}
            width="10"
            height={plantHeight * 4}
            rx="2"
            fill="#166534"
            className={`transition-all duration-1000 ${animationClass === 'stressed' ? 'opacity-70' : ''}`}
          />

          {/* Blätter - Dynamisch basierend auf Wachstum */}
          {Array.from({ length: Math.floor(plantHeight / 15) }).map((_, i) => {
            const yPos = 520 - (plantHeight * 4) + (i * 40);
            const leafSize = 20 + (i * 2);
            const rotation = i % 2 === 0 ? -45 : 45;

            return (
              <g key={i} className={`transition-all duration-500 ${animationClass}`}>
                {/* Linkes Blatt */}
                <ellipse
                  cx={95 - leafSize}
                  cy={yPos}
                  rx={leafSize}
                  ry={leafSize * 0.6}
                  fill={leafColor}
                  transform={`rotate(${-rotation}, ${95 - leafSize}, ${yPos})`}
                  className="transition-all duration-500"
                  style={{
                    filter: healthScore > 80 ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none'
                  }}
                />
                {/* Rechtes Blatt */}
                <ellipse
                  cx={105 + leafSize}
                  cy={yPos}
                  rx={leafSize}
                  ry={leafSize * 0.6}
                  fill={leafColor}
                  transform={`rotate(${rotation}, ${105 + leafSize}, ${yPos})`}
                  className="transition-all duration-500"
                  style={{
                    filter: healthScore > 80 ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none'
                  }}
                />
              </g>
            );
          })}

          {/* Blüten bei Flowering Stage */}
          {growthStage === 'flowering' && Array.from({ length: 3 }).map((_, i) => {
            const yPos = 520 - (plantHeight * 4) + (i * 30) + 20;
            return (
              <g key={`flower-${i}`}>
                <circle cx="100" cy={yPos} r="8" fill="#dc2626" opacity="0.8" className="animate-pulse" />
                <circle cx="100" cy={yPos} r="4" fill="#fbbf24" opacity="0.9" />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Sensor Overlays */}
      <SensorBadge
        icon={Thermometer}
        label="Lufttemperatur"
        value={currentData.temp.toFixed(1)}
        unit="°C"
        status={currentData.temp > 28 || currentData.temp < 18 ? 'warning' : 'normal'}
        position={{ top: '10%', right: '5%' }}
      />

      <SensorBadge
        icon={Droplets}
        label="Luftfeuchtigkeit"
        value={currentData.humidity.toFixed(0)}
        unit="%"
        status={currentData.humidity < 40 || currentData.humidity > 70 ? 'warning' : 'normal'}
        position={{ top: '25%', right: '5%' }}
      />

      <SensorBadge
        icon={Sun}
        label="Lichtintensität"
        value={currentData.light >= 1000 ? (currentData.light / 1000).toFixed(1) : currentData.light.toFixed(0)}
        unit={currentData.light >= 1000 ? " klx" : " lux"}
        position={{ top: '40%', right: '5%' }}
      />

      <SensorBadge
        icon={Thermometer}
        label="Bodentemperatur"
        value={currentData.soilTemp.toFixed(1)}
        unit="°C"
        status={currentData.soilTemp < 18 || currentData.soilTemp > 26 ? 'warning' : 'normal'}
        position={{ bottom: '30%', left: '5%' }}
      />

      <SensorBadge
        icon={Droplets}
        label="Bodenfeuchte"
        value={soilMoisture.toFixed(0)}
        unit="%"
        status={soilMoisture < 30 ? 'error' : soilMoisture < 40 ? 'warning' : soilMoisture > 80 ? 'warning' : 'normal'}
        position={{ bottom: '15%', left: '5%' }}
      />

      <SensorBadge
        icon={Wind}
        label="VPD"
        value={vpd.toFixed(2)}
        unit=" kPa"
        status={vpd < 0.8 || vpd > 1.2 ? 'warning' : 'normal'}
        position={{ top: '10%', left: '5%' }}
      />

      {/* Health Score Badge */}
      <div
        className="absolute top-5 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full backdrop-blur-md border-2 shadow-2xl"
        style={{
          backgroundColor: currentTheme.bg.card + 'EE',
          borderColor: getStatusColor()
        }}
      >
        <div className="flex items-center gap-3">
          <Activity size={24} style={{ color: getStatusColor() }} />
          <div>
            <div className="text-xs font-medium" style={{ color: currentTheme.text.secondary }}>
              Pflanzen-Gesundheit
            </div>
            <div className="text-2xl font-bold" style={{ color: getStatusColor() }}>
              {healthScore}%
            </div>
          </div>
        </div>
      </div>

      {/* Wachstumsstadium Badge */}
      <div
        className="absolute bottom-5 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full backdrop-blur-md border shadow-xl"
        style={{
          backgroundColor: currentTheme.bg.card + 'EE',
          borderColor: currentTheme.border.default
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getStageIcon(growthStage)}</span>
          <div>
            <div className="text-xs" style={{ color: currentTheme.text.secondary }}>Wachstumsphase</div>
            <div className="font-bold" style={{ color: currentTheme.text.primary }}>
              {getStageName(growthStage)}
            </div>
          </div>
        </div>
      </div>

      {/* Warnungen */}
      {(currentData.temp > 30 || vpd > 1.5) && (
        <div
          className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg backdrop-blur-md border flex items-center gap-2 animate-pulse"
          style={{
            backgroundColor: '#7f1d1d' + 'DD',
            borderColor: '#ef4444'
          }}
        >
          <AlertTriangle size={16} style={{ color: '#ef4444' }} />
          <span className="text-sm font-medium" style={{ color: '#fef2f2' }}>
            {currentData.temp > 30 ? 'Hitzestress!' : 'VPD kritisch!'}
          </span>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        .healthy {
          animation: gentle-sway 3s ease-in-out infinite;
        }

        .droopy {
          animation: droop 2s ease-in-out infinite;
          transform-origin: center bottom;
        }

        .stressed {
          animation: shake 0.5s ease-in-out infinite;
        }

        @keyframes gentle-sway {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(2deg); }
        }

        @keyframes droop {
          0%, 100% { transform: rotate(0deg) translateY(0px); }
          50% { transform: rotate(-3deg) translateY(5px); }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }
      `}</style>
    </div>
  );
}

export default DigitalTwin;
