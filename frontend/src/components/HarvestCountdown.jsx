import React, { useState, useEffect } from 'react';
import { useTheme } from '../theme';
import { Calendar, Sprout, Flower2, Droplets, Trophy, Zap, TrendingUp, Clock } from 'lucide-react';

const HarvestCountdown = ({ plant }) => {
  const { currentTheme } = useTheme();
  const [currentDay, setCurrentDay] = useState(0);

  // Grow Start Date from plant or default to now
  const startDate = plant?.growStartDate ? new Date(plant.growStartDate) : new Date();

  // Calculate days since start
  useEffect(() => {
    const calculateDays = () => {
      const now = new Date();
      const diffTime = Math.abs(now - startDate);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      setCurrentDay(diffDays);
    };

    calculateDays();
    const interval = setInterval(calculateDays, 1000 * 60 * 60); // Update every hour

    return () => clearInterval(interval);
  }, [startDate]);

  // Grow Phases Configuration
  const phases = [
    {
      name: 'Seedling',
      icon: Sprout,
      days: 14,
      color: '#84cc16',
      description: 'Keimling & frühe Entwicklung'
    },
    {
      name: 'Vegetative',
      icon: TrendingUp,
      days: 35, // 14 + 35 = 49 total
      color: '#10b981',
      description: 'Vegetatives Wachstum'
    },
    {
      name: 'Flowering',
      icon: Flower2,
      days: 56, // 49 + 56 = 105 total
      color: '#f59e0b',
      description: 'Blütephase'
    },
    {
      name: 'Flush',
      icon: Droplets,
      days: 14, // 105 + 14 = 119 total
      color: '#06b6d4',
      description: 'Spülen vor der Ernte'
    }
  ];

  // Calculate current phase and progress
  let cumulativeDays = 0;
  let currentPhaseIndex = 0;
  let daysInCurrentPhase = 0;
  let currentPhaseTotalDays = 0;

  for (let i = 0; i < phases.length; i++) {
    const phaseTotalDays = phases[i].days;
    if (currentDay < cumulativeDays + phaseTotalDays) {
      currentPhaseIndex = i;
      daysInCurrentPhase = currentDay - cumulativeDays;
      currentPhaseTotalDays = phaseTotalDays;
      break;
    }
    cumulativeDays += phaseTotalDays;
  }

  // If beyond all phases, it's harvest time!
  const totalGrowDays = phases.reduce((sum, phase) => sum + phase.days, 0);
  const isHarvestTime = currentDay >= totalGrowDays;

  if (isHarvestTime) {
    currentPhaseIndex = phases.length - 1;
    daysInCurrentPhase = phases[phases.length - 1].days;
    currentPhaseTotalDays = phases[phases.length - 1].days;
  }

  const currentPhase = phases[currentPhaseIndex];
  const phaseProgress = (daysInCurrentPhase / currentPhaseTotalDays) * 100;
  const totalProgress = (currentDay / totalGrowDays) * 100;
  const daysRemaining = totalGrowDays - currentDay;

  // Milestones
  const milestones = [
    { day: 7, message: '🌱 Erste Woche geschafft!', reached: currentDay >= 7 },
    { day: 14, message: '💚 2 Wochen - Wechsel zu Veg!', reached: currentDay >= 14 },
    { day: 30, message: '🚀 1 Monat - Stark im Wachstum!', reached: currentDay >= 30 },
    { day: 49, message: '🌸 Blütephase beginnt!', reached: currentDay >= 49 },
    { day: 70, message: '⚡ Über 70% geschafft!', reached: currentDay >= 70 },
    { day: 90, message: '🏁 Fast fertig!', reached: currentDay >= 90 },
    { day: 105, message: '💧 Zeit zum Spülen!', reached: currentDay >= 105 },
    { day: 119, message: '🎉 ERNTE ZEIT!', reached: currentDay >= 119 }
  ];

  const nextMilestone = milestones.find(m => !m.reached);

  const PhaseIcon = currentPhase.icon;

  return (
    <div
      className="rounded-xl border shadow-lg overflow-hidden"
      style={{
        backgroundColor: currentTheme.bg.card,
        borderColor: currentTheme.border.default
      }}
    >
      {/* Header */}
      <div
        className="p-6 border-b"
        style={{
          background: `linear-gradient(135deg, ${currentPhase.color}15, transparent)`,
          borderColor: currentTheme.border.default
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="p-3 rounded-xl"
              style={{
                backgroundColor: currentPhase.color + '20',
                color: currentPhase.color
              }}
            >
              <PhaseIcon size={24} />
            </div>
            <div>
              <h3
                className="text-lg font-bold"
                style={{ color: currentTheme.text.primary }}
              >
                {isHarvestTime ? '🎉 Harvest Time!' : currentPhase.name}
              </h3>
              <p
                className="text-sm"
                style={{ color: currentTheme.text.muted }}
              >
                {isHarvestTime ? 'Bereit zur Ernte!' : currentPhase.description}
              </p>
            </div>
          </div>

          {/* Days Counter */}
          <div className="text-right">
            <div
              className="text-3xl font-bold"
              style={{ color: currentPhase.color }}
            >
              {isHarvestTime ? '✓' : daysRemaining}
            </div>
            <div
              className="text-xs"
              style={{ color: currentTheme.text.muted }}
            >
              {isHarvestTime ? 'Fertig' : 'Tage bis Ernte'}
            </div>
          </div>
        </div>
      </div>

      {/* Current Day & Phase Progress */}
      <div className="p-6 space-y-4">
        {/* Total Progress Bar */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span
              className="text-sm font-medium"
              style={{ color: currentTheme.text.secondary }}
            >
              Gesamtfortschritt
            </span>
            <span
              className="text-sm font-bold"
              style={{ color: currentPhase.color }}
            >
              {Math.min(100, Math.round(totalProgress))}%
            </span>
          </div>
          <div
            className="h-3 rounded-full overflow-hidden"
            style={{ backgroundColor: currentTheme.bg.hover }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, totalProgress)}%`,
                background: `linear-gradient(90deg, ${currentPhase.color}, ${currentPhase.color}DD)`
              }}
            />
          </div>
          <div
            className="flex justify-between items-center mt-1 text-xs"
            style={{ color: currentTheme.text.muted }}
          >
            <span>Tag {currentDay}</span>
            <span>von {totalGrowDays} Tagen</span>
          </div>
        </div>

        {/* Phase Progress Bar */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span
              className="text-sm font-medium"
              style={{ color: currentTheme.text.secondary }}
            >
              {currentPhase.name} Phase
            </span>
            <span
              className="text-sm font-bold"
              style={{ color: currentPhase.color }}
            >
              {Math.round(phaseProgress)}%
            </span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: currentTheme.bg.hover }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${phaseProgress}%`,
                backgroundColor: currentPhase.color
              }}
            />
          </div>
          <div
            className="text-xs mt-1"
            style={{ color: currentTheme.text.muted }}
          >
            Tag {daysInCurrentPhase + 1} von {currentPhaseTotalDays}
          </div>
        </div>

        {/* Next Milestone */}
        {nextMilestone && !isHarvestTime && (
          <div
            className="p-3 rounded-lg border-l-4"
            style={{
              backgroundColor: currentTheme.bg.hover,
              borderColor: currentTheme.accent.color
            }}
          >
            <div className="flex items-center gap-2">
              <Zap size={16} style={{ color: currentTheme.accent.color }} />
              <span
                className="text-sm font-medium"
                style={{ color: currentTheme.text.secondary }}
              >
                Nächster Meilenstein:
              </span>
            </div>
            <div
              className="text-sm font-bold mt-1"
              style={{ color: currentTheme.text.primary }}
            >
              {nextMilestone.message}
            </div>
            <div
              className="text-xs mt-1"
              style={{ color: currentTheme.text.muted }}
            >
              In {nextMilestone.day - currentDay} Tagen (Tag {nextMilestone.day})
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="flex items-center gap-2 pt-2">
          {phases.map((phase, index) => {
            const PhIcon = phase.icon;
            const isActive = index === currentPhaseIndex;
            const isPast = index < currentPhaseIndex;

            return (
              <div key={phase.name} className="flex-1">
                <div
                  className="flex flex-col items-center gap-1"
                  title={phase.name}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isActive ? 'scale-110' : 'scale-90'
                    }`}
                    style={{
                      backgroundColor: isPast || isActive ? phase.color + '20' : currentTheme.bg.hover,
                      border: `2px solid ${isPast || isActive ? phase.color : currentTheme.border.default}`
                    }}
                  >
                    <PhIcon
                      size={18}
                      style={{
                        color: isPast || isActive ? phase.color : currentTheme.text.muted
                      }}
                    />
                  </div>
                  <div
                    className="text-xs font-medium text-center"
                    style={{
                      color: isActive ? phase.color : currentTheme.text.muted
                    }}
                  >
                    {phase.name}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Harvest Time Celebration */}
      {isHarvestTime && (
        <div
          className="p-6 text-center border-t"
          style={{
            background: `linear-gradient(135deg, ${currentPhase.color}10, transparent)`,
            borderColor: currentTheme.border.default
          }}
        >
          <Trophy size={48} style={{ color: currentPhase.color }} className="mx-auto mb-3" />
          <h3
            className="text-2xl font-bold mb-2"
            style={{ color: currentPhase.color }}
          >
            🎉 Erntezeit ist da!
          </h3>
          <p
            className="text-sm"
            style={{ color: currentTheme.text.secondary }}
          >
            Dein Grow ist bereit für die Ernte. Viel Erfolg! 🌿
          </p>
        </div>
      )}
    </div>
  );
};

export default HarvestCountdown;
