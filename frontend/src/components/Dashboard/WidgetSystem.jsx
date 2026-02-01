import React, { useState, useEffect, useCallback } from 'react';
import {
  GripVertical, X, Plus, Settings, Maximize2, Minimize2,
  Thermometer, Droplets, Sun, Wind, Camera, Activity,
  Leaf, Timer, Bell, BarChart3, Cpu, Gauge, RefreshCcw,
  ChevronDown, Check, Sparkles
} from 'lucide-react';
import { api } from '../../utils/api';

/**
 * WidgetSystem - Anpassbares Widget-System für das Dashboard
 * Drag & Drop, Resize, Add/Remove Widgets
 */

// Verfügbare Widget-Typen
const WIDGET_TYPES = {
  temperature: {
    id: 'temperature',
    title: 'Temperatur',
    icon: Thermometer,
    color: '#f59e0b',
    minWidth: 1,
    minHeight: 1,
    defaultWidth: 1,
    defaultHeight: 1,
    category: 'sensors'
  },
  humidity: {
    id: 'humidity',
    title: 'Luftfeuchte',
    icon: Droplets,
    color: '#3b82f6',
    minWidth: 1,
    minHeight: 1,
    defaultWidth: 1,
    defaultHeight: 1,
    category: 'sensors'
  },
  light: {
    id: 'light',
    title: 'Licht',
    icon: Sun,
    color: '#eab308',
    minWidth: 1,
    minHeight: 1,
    defaultWidth: 1,
    defaultHeight: 1,
    category: 'sensors'
  },
  vpd: {
    id: 'vpd',
    title: 'VPD',
    icon: Wind,
    color: '#10b981',
    minWidth: 1,
    minHeight: 1,
    defaultWidth: 1,
    defaultHeight: 1,
    category: 'sensors'
  },
  camera: {
    id: 'camera',
    title: 'Kamera',
    icon: Camera,
    color: '#8b5cf6',
    minWidth: 2,
    minHeight: 2,
    defaultWidth: 2,
    defaultHeight: 2,
    category: 'media'
  },
  chart: {
    id: 'chart',
    title: 'Live Chart',
    icon: Activity,
    color: '#06b6d4',
    minWidth: 2,
    minHeight: 1,
    defaultWidth: 2,
    defaultHeight: 1,
    category: 'analytics'
  },
  plants: {
    id: 'plants',
    title: 'Pflanzen Status',
    icon: Leaf,
    color: '#22c55e',
    minWidth: 1,
    minHeight: 1,
    defaultWidth: 1,
    defaultHeight: 1,
    category: 'grow'
  },
  countdown: {
    id: 'countdown',
    title: 'Ernte Countdown',
    icon: Timer,
    color: '#ec4899',
    minWidth: 1,
    minHeight: 1,
    defaultWidth: 1,
    defaultHeight: 1,
    category: 'grow'
  },
  alerts: {
    id: 'alerts',
    title: 'Alerts',
    icon: Bell,
    color: '#ef4444',
    minWidth: 1,
    minHeight: 1,
    defaultWidth: 1,
    defaultHeight: 1,
    category: 'system'
  },
  automation: {
    id: 'automation',
    title: 'Automation',
    icon: Cpu,
    color: '#a855f7',
    minWidth: 1,
    minHeight: 1,
    defaultWidth: 1,
    defaultHeight: 1,
    category: 'system'
  },
  growScore: {
    id: 'growScore',
    title: 'Grow Score',
    icon: Gauge,
    color: '#14b8a6',
    minWidth: 1,
    minHeight: 1,
    defaultWidth: 1,
    defaultHeight: 1,
    category: 'analytics'
  }
};

const CATEGORIES = {
  sensors: { label: 'Sensoren', icon: Thermometer },
  media: { label: 'Medien', icon: Camera },
  analytics: { label: 'Analytics', icon: BarChart3 },
  grow: { label: 'Grow', icon: Leaf },
  system: { label: 'System', icon: Settings }
};

// Standard-Layout
const DEFAULT_LAYOUT = [
  { id: 'temp-1', type: 'temperature', x: 0, y: 0, w: 1, h: 1 },
  { id: 'hum-1', type: 'humidity', x: 1, y: 0, w: 1, h: 1 },
  { id: 'light-1', type: 'light', x: 2, y: 0, w: 1, h: 1 },
  { id: 'vpd-1', type: 'vpd', x: 3, y: 0, w: 1, h: 1 },
  { id: 'chart-1', type: 'chart', x: 0, y: 1, w: 2, h: 1 },
  { id: 'camera-1', type: 'camera', x: 2, y: 1, w: 2, h: 2 }
];

// Widget Renderer für jeden Typ
const WidgetContent = ({ type, theme, sensorData, expanded }) => {
  const widgetDef = WIDGET_TYPES[type];
  const Icon = widgetDef?.icon || Activity;

  // Sensor-Wert basierend auf Typ
  const getValue = () => {
    switch (type) {
      case 'temperature':
        return { value: sensorData?.temp?.toFixed(1) || '--', unit: '°C' };
      case 'humidity':
        return { value: sensorData?.humidity?.toFixed(0) || '--', unit: '%' };
      case 'light':
        return { value: sensorData?.lux?.toFixed(0) || '--', unit: 'lx' };
      case 'vpd':
        if (sensorData?.temp && sensorData?.humidity) {
          const svp = 0.61078 * Math.exp((17.27 * sensorData.temp) / (sensorData.temp + 237.3));
          const vpd = svp * (1 - sensorData.humidity / 100);
          return { value: vpd.toFixed(2), unit: 'kPa' };
        }
        return { value: '--', unit: 'kPa' };
      case 'growScore':
        return { value: '87', unit: '/100' };
      default:
        return { value: '--', unit: '' };
    }
  };

  const data = getValue();

  // Mini Widget (1x1)
  if (!expanded && ['temperature', 'humidity', 'light', 'vpd', 'growScore', 'plants', 'countdown', 'alerts', 'automation'].includes(type)) {
    return (
      <div className="h-full flex flex-col justify-between p-4">
        <div className="flex items-center justify-between">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${widgetDef.color}20` }}
          >
            <Icon size={18} style={{ color: widgetDef.color }} />
          </div>
          <span
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: theme.text.muted }}
          >
            {widgetDef.title}
          </span>
        </div>
        <div className="text-right">
          <span
            className="text-3xl font-black"
            style={{ color: theme.text.primary }}
          >
            {data.value}
          </span>
          <span
            className="text-sm ml-1"
            style={{ color: theme.text.secondary }}
          >
            {data.unit}
          </span>
        </div>
      </div>
    );
  }

  // Placeholder für größere Widgets
  return (
    <div className="h-full flex items-center justify-center p-4">
      <div className="text-center">
        <Icon size={32} style={{ color: widgetDef?.color || theme.text.muted }} />
        <p
          className="mt-2 text-sm font-medium"
          style={{ color: theme.text.secondary }}
        >
          {widgetDef?.title || type}
        </p>
      </div>
    </div>
  );
};

// Einzelnes Widget
const Widget = ({
  widget,
  theme,
  sensorData,
  onRemove,
  onResize,
  isEditMode,
  isDragging
}) => {
  const [expanded, setExpanded] = useState(false);
  const widgetDef = WIDGET_TYPES[widget.type];

  return (
    <div
      className={`
        relative rounded-2xl border overflow-hidden transition-all duration-300
        ${isDragging ? 'opacity-50 scale-95' : ''}
        ${isEditMode ? 'cursor-move' : ''}
      `}
      style={{
        backgroundColor: theme.bg.card,
        borderColor: isEditMode ? theme.accent.color : theme.border.default,
        boxShadow: isEditMode
          ? `0 0 0 2px ${theme.accent.color}40`
          : '0 4px 16px rgba(0,0,0,0.08)',
        gridColumn: `span ${widget.w}`,
        gridRow: `span ${widget.h}`,
        minHeight: widget.h === 1 ? '140px' : `${widget.h * 160}px`
      }}
    >
      {/* Edit Mode Overlay */}
      {isEditMode && (
        <div className="absolute inset-0 z-10">
          {/* Drag Handle */}
          <div
            className="absolute top-2 left-2 p-1.5 rounded-lg cursor-grab active:cursor-grabbing"
            style={{ backgroundColor: `${theme.accent.color}20` }}
          >
            <GripVertical size={16} style={{ color: theme.accent.color }} />
          </div>

          {/* Remove Button */}
          <button
            onClick={() => onRemove(widget.id)}
            className="absolute top-2 right-2 p-1.5 rounded-lg transition-colors hover:bg-red-500/20"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
          >
            <X size={16} className="text-red-400" />
          </button>

          {/* Resize Toggle */}
          <button
            onClick={() => onResize(widget.id)}
            className="absolute bottom-2 right-2 p-1.5 rounded-lg transition-colors"
            style={{ backgroundColor: `${theme.accent.color}20` }}
          >
            {expanded ? (
              <Minimize2 size={14} style={{ color: theme.accent.color }} />
            ) : (
              <Maximize2 size={14} style={{ color: theme.accent.color }} />
            )}
          </button>
        </div>
      )}

      {/* Widget Content */}
      <WidgetContent
        type={widget.type}
        theme={theme}
        sensorData={sensorData}
        expanded={expanded || widget.w > 1 || widget.h > 1}
      />

      {/* Color Indicator Bar */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{ backgroundColor: widgetDef?.color || theme.accent.color }}
      />
    </div>
  );
};

// Widget hinzufügen Dialog
const AddWidgetDialog = ({ theme, onAdd, onClose, currentWidgets }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const availableWidgets = Object.values(WIDGET_TYPES).filter(w => {
    // Kategorie-Filter
    if (selectedCategory !== 'all' && w.category !== selectedCategory) {
      return false;
    }
    return true;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-lg rounded-2xl border overflow-hidden"
        style={{
          backgroundColor: theme.bg.card,
          borderColor: theme.border.default
        }}
      >
        {/* Header */}
        <div
          className="p-5 border-b flex items-center justify-between"
          style={{ borderColor: theme.border.default }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-xl"
              style={{ backgroundColor: `${theme.accent.color}15` }}
            >
              <Plus size={20} style={{ color: theme.accent.color }} />
            </div>
            <div>
              <h3
                className="font-bold"
                style={{ color: theme.text.primary }}
              >
                Widget hinzufügen
              </h3>
              <p
                className="text-xs"
                style={{ color: theme.text.muted }}
              >
                Wähle ein Widget für dein Dashboard
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:bg-black/10"
          >
            <X size={20} style={{ color: theme.text.muted }} />
          </button>
        </div>

        {/* Category Filter */}
        <div
          className="px-5 py-3 border-b flex gap-2 flex-wrap"
          style={{ borderColor: theme.border.default }}
        >
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedCategory === 'all' ? 'scale-105' : ''
            }`}
            style={{
              backgroundColor: selectedCategory === 'all'
                ? `${theme.accent.color}20`
                : theme.bg.hover,
              color: selectedCategory === 'all'
                ? theme.accent.color
                : theme.text.secondary
            }}
          >
            Alle
          </button>
          {Object.entries(CATEGORIES).map(([key, cat]) => {
            const CatIcon = cat.icon;
            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedCategory === key ? 'scale-105' : ''
                }`}
                style={{
                  backgroundColor: selectedCategory === key
                    ? `${theme.accent.color}20`
                    : theme.bg.hover,
                  color: selectedCategory === key
                    ? theme.accent.color
                    : theme.text.secondary
                }}
              >
                <CatIcon size={12} />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Widget List */}
        <div className="p-5 max-h-[400px] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            {availableWidgets.map(widget => {
              const Icon = widget.icon;
              const alreadyAdded = currentWidgets.some(w => w.type === widget.id);

              return (
                <button
                  key={widget.id}
                  onClick={() => !alreadyAdded && onAdd(widget.id)}
                  disabled={alreadyAdded}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    alreadyAdded ? 'opacity-50 cursor-not-allowed' : 'hover:scale-102'
                  }`}
                  style={{
                    backgroundColor: alreadyAdded ? theme.bg.hover : theme.bg.main,
                    borderColor: theme.border.default
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${widget.color}20` }}
                    >
                      <Icon size={18} style={{ color: widget.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-semibold text-sm"
                          style={{ color: theme.text.primary }}
                        >
                          {widget.title}
                        </span>
                        {alreadyAdded && (
                          <Check size={14} className="text-green-400" />
                        )}
                      </div>
                      <span
                        className="text-xs"
                        style={{ color: theme.text.muted }}
                      >
                        {widget.minWidth}x{widget.minHeight} min
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// Haupt-Komponente
const WidgetSystem = ({ theme, sensorData }) => {
  const [layout, setLayout] = useState(() => {
    const saved = localStorage.getItem('dashboard-widgets');
    return saved ? JSON.parse(saved) : DEFAULT_LAYOUT;
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState(null);

  // Layout speichern
  useEffect(() => {
    localStorage.setItem('dashboard-widgets', JSON.stringify(layout));
  }, [layout]);

  const handleAddWidget = (type) => {
    const widgetDef = WIDGET_TYPES[type];
    const newWidget = {
      id: `${type}-${Date.now()}`,
      type,
      x: 0,
      y: Math.max(...layout.map(w => w.y + w.h), 0),
      w: widgetDef.defaultWidth,
      h: widgetDef.defaultHeight
    };
    setLayout([...layout, newWidget]);
    setShowAddDialog(false);
  };

  const handleRemoveWidget = (id) => {
    setLayout(layout.filter(w => w.id !== id));
  };

  const handleResizeWidget = (id) => {
    setLayout(layout.map(w => {
      if (w.id === id) {
        const widgetDef = WIDGET_TYPES[w.type];
        // Toggle zwischen min und 2x Größe
        const isExpanded = w.w > widgetDef.minWidth || w.h > widgetDef.minHeight;
        return {
          ...w,
          w: isExpanded ? widgetDef.minWidth : Math.min(widgetDef.minWidth * 2, 4),
          h: isExpanded ? widgetDef.minHeight : Math.min(widgetDef.minHeight * 2, 2)
        };
      }
      return w;
    }));
  };

  const resetLayout = () => {
    setLayout(DEFAULT_LAYOUT);
    localStorage.removeItem('dashboard-widgets');
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="p-2 rounded-xl"
            style={{ backgroundColor: `${theme.accent.color}15` }}
          >
            <Sparkles size={18} style={{ color: theme.accent.color }} />
          </div>
          <span
            className="text-sm font-semibold"
            style={{ color: theme.text.primary }}
          >
            Meine Widgets
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isEditMode && (
            <>
              <button
                onClick={() => setShowAddDialog(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                style={{
                  backgroundColor: `${theme.accent.color}20`,
                  color: theme.accent.color
                }}
              >
                <Plus size={14} />
                Widget
              </button>
              <button
                onClick={resetLayout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  backgroundColor: theme.bg.hover,
                  color: theme.text.secondary
                }}
              >
                <RefreshCcw size={14} />
                Reset
              </button>
            </>
          )}
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
              isEditMode ? 'scale-105' : ''
            }`}
            style={{
              backgroundColor: isEditMode
                ? theme.accent.color
                : theme.bg.hover,
              color: isEditMode ? '#fff' : theme.text.secondary
            }}
          >
            <Settings size={16} />
            {isEditMode ? 'Fertig' : 'Anpassen'}
          </button>
        </div>
      </div>

      {/* Widget Grid */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-4 transition-all duration-300"
        style={{
          padding: isEditMode ? '12px' : '0',
          borderRadius: '20px',
          border: isEditMode ? `2px dashed ${theme.border.default}` : 'none'
        }}
      >
        {layout.map(widget => (
          <Widget
            key={widget.id}
            widget={widget}
            theme={theme}
            sensorData={sensorData}
            onRemove={handleRemoveWidget}
            onResize={handleResizeWidget}
            isEditMode={isEditMode}
            isDragging={draggedWidget === widget.id}
          />
        ))}
      </div>

      {/* Edit Mode Hint */}
      {isEditMode && (
        <div
          className="text-center py-2 text-xs"
          style={{ color: theme.text.muted }}
        >
          Klicke auf Widgets um sie zu entfernen oder zu vergrößern
        </div>
      )}

      {/* Add Widget Dialog */}
      {showAddDialog && (
        <AddWidgetDialog
          theme={theme}
          onAdd={handleAddWidget}
          onClose={() => setShowAddDialog(false)}
          currentWidgets={layout}
        />
      )}
    </div>
  );
};

export default WidgetSystem;
