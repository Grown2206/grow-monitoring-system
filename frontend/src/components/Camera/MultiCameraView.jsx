import React, { useState, useEffect } from 'react';
import { useTheme } from '../../theme';
import {
  Camera, Grid3x3, Maximize2, Minimize2, Settings, RotateCw,
  Zap, Video, Image, Clock, ChevronLeft, ChevronRight,
  Eye, EyeOff, Play, Pause, Circle
} from 'lucide-react';

const MultiCameraView = () => {
  const { currentTheme } = useTheme();
  const [cameras, setCameras] = useState([]);
  const [activeCamera, setActiveCamera] = useState(null);
  const [pipEnabled, setPipEnabled] = useState(false);
  const [pipCamera, setPipCamera] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [settings, setSettings] = useState({});

  // Get icon component by name
  const getIconComponent = (iconName, size = 20) => {
    const icons = {
      'grid': Grid3x3,
      'eye': Eye,
      'camera': Camera,
      'zap': Zap
    };
    const IconComponent = icons[iconName] || Camera;
    return <IconComponent size={size} />;
  };

  // Initialize cameras
  useEffect(() => {
    const defaultCameras = [
      {
        id: 'cam1',
        name: 'Overview',
        position: 'overview',
        url: 'http://localhost:8000/stream/overview',
        enabled: true,
        resolution: { width: 1920, height: 1080 },
        fps: 30,
        zoom: 1.0,
        rotation: 0,
        flipH: false,
        flipV: false,
        status: 'offline', // online, offline, error
        lastFrame: null,
        iconName: 'grid'
      },
      {
        id: 'cam2',
        name: 'Side View',
        position: 'side',
        url: 'http://localhost:8000/stream/side',
        enabled: true,
        resolution: { width: 1280, height: 720 },
        fps: 30,
        zoom: 1.0,
        rotation: 0,
        flipH: false,
        flipV: false,
        status: 'offline',
        lastFrame: null,
        iconName: 'eye'
      },
      {
        id: 'cam3',
        name: 'Top View',
        position: 'top',
        url: 'http://localhost:8000/stream/top',
        enabled: true,
        resolution: { width: 1280, height: 720 },
        fps: 30,
        zoom: 1.0,
        rotation: 0,
        flipH: false,
        flipV: false,
        status: 'offline',
        lastFrame: null,
        iconName: 'camera'
      },
      {
        id: 'cam4',
        name: 'Macro',
        position: 'macro',
        url: 'http://localhost:8000/stream/macro',
        enabled: true,
        resolution: { width: 1920, height: 1080 },
        fps: 60,
        zoom: 2.5,
        rotation: 0,
        flipH: false,
        flipV: false,
        status: 'offline',
        lastFrame: null,
        iconName: 'zap'
      }
    ];

    // Load from localStorage or use defaults
    const saved = localStorage.getItem('multi-camera-config');
    if (saved) {
      setCameras(JSON.parse(saved));
    } else {
      setCameras(defaultCameras);
    }

    // Set first enabled camera as active
    const firstEnabled = defaultCameras.find(c => c.enabled);
    if (firstEnabled) {
      setActiveCamera(firstEnabled.id);
    }
  }, []);

  // Save cameras to localStorage
  useEffect(() => {
    if (cameras.length > 0) {
      localStorage.setItem('multi-camera-config', JSON.stringify(cameras));
    }
  }, [cameras]);

  const updateCamera = (cameraId, updates) => {
    setCameras(cameras.map(cam =>
      cam.id === cameraId ? { ...cam, ...updates } : cam
    ));
  };

  const toggleCameraEnabled = (cameraId) => {
    setCameras(cameras.map(cam =>
      cam.id === cameraId ? { ...cam, enabled: !cam.enabled } : cam
    ));
  };

  const cycleThroughCameras = (direction = 'next') => {
    const enabledCameras = cameras.filter(c => c.enabled);
    if (enabledCameras.length === 0) return;

    const currentIndex = enabledCameras.findIndex(c => c.id === activeCamera);
    let nextIndex;

    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % enabledCameras.length;
    } else {
      nextIndex = (currentIndex - 1 + enabledCameras.length) % enabledCameras.length;
    }

    setActiveCamera(enabledCameras[nextIndex].id);
  };

  const togglePiP = () => {
    if (!pipEnabled && cameras.length > 1) {
      // Enable PiP with second camera
      const otherCameras = cameras.filter(c => c.id !== activeCamera && c.enabled);
      if (otherCameras.length > 0) {
        setPipCamera(otherCameras[0].id);
        setPipEnabled(true);
      }
    } else {
      setPipEnabled(false);
      setPipCamera(null);
    }
  };

  const captureSnapshot = async (cameraId) => {
    const camera = cameras.find(c => c.id === cameraId);
    if (!camera) return;

    try {
      const response = await fetch('/api/camera/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cameraId, name: camera.name })
      });

      if (response.ok) {
        console.log(`Snapshot captured from ${camera.name}`);
      }
    } catch (error) {
      console.error('Snapshot error:', error);
    }
  };

  const startTimelapseAll = async () => {
    try {
      const response = await fetch('/api/camera/timelapse/start-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cameras: cameras.filter(c => c.enabled) })
      });

      if (response.ok) {
        console.log('Timelapse started on all cameras');
      }
    } catch (error) {
      console.error('Timelapse error:', error);
    }
  };

  const activeCam = cameras.find(c => c.id === activeCamera);
  const pipCam = cameras.find(c => c.id === pipCamera);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-2xl font-bold mb-1"
            style={{ color: currentTheme.text.primary }}
          >
            Multi-Camera System
          </h2>
          <p
            className="text-sm"
            style={{ color: currentTheme.text.secondary }}
          >
            {cameras.filter(c => c.enabled).length} von {cameras.length} Kameras aktiv
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={togglePiP}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${
              pipEnabled ? 'brightness-110' : ''
            }`}
            style={{
              backgroundColor: pipEnabled ? currentTheme.accent.color : currentTheme.bg.hover,
              color: pipEnabled ? 'white' : currentTheme.text.secondary,
              borderWidth: 1,
              borderColor: currentTheme.border.default
            }}
          >
            {pipEnabled ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            PiP
          </button>
          <button
            onClick={startTimelapseAll}
            className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all hover:brightness-110"
            style={{
              backgroundColor: isRecording ? '#ef4444' : currentTheme.accent.color,
              color: 'white'
            }}
          >
            {isRecording ? <Circle size={20} className="animate-pulse" /> : <Video size={20} />}
            {isRecording ? 'Recording' : 'Timelapse All'}
          </button>
        </div>
      </div>

      {/* Main Camera View */}
      <div className="relative">
        {activeCam && (
          <div
            className="rounded-xl border overflow-hidden relative"
            style={{
              backgroundColor: currentTheme.bg.card,
              borderColor: currentTheme.border.default,
              aspectRatio: '16/9'
            }}
          >
            {/* Camera Stream Placeholder */}
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ backgroundColor: currentTheme.bg.main }}
            >
              <div className="text-center">
                <div
                  className="mb-4 p-4 rounded-full inline-block"
                  style={{
                    backgroundColor: currentTheme.accent.color + '20',
                    color: currentTheme.accent.color
                  }}
                >
                  {getIconComponent(activeCam.iconName)}
                </div>
                <div
                  className="text-xl font-bold mb-2"
                  style={{ color: currentTheme.text.primary }}
                >
                  {activeCam.name}
                </div>
                <div
                  className="text-sm mb-4"
                  style={{ color: currentTheme.text.secondary }}
                >
                  {activeCam.resolution.width} × {activeCam.resolution.height} @ {activeCam.fps}fps
                </div>
                <div
                  className={`inline-block px-3 py-1 rounded text-xs font-medium ${
                    activeCam.status === 'online' ? '' : 'opacity-50'
                  }`}
                  style={{
                    backgroundColor: activeCam.status === 'online' ? '#10b981' : '#ef4444',
                    color: 'white'
                  }}
                >
                  {activeCam.status === 'online' ? 'Online' : 'Offline'}
                </div>
              </div>
            </div>

            {/* Camera Controls Overlay */}
            <div
              className="absolute top-4 left-4 right-4 flex items-center justify-between"
            >
              <div
                className="px-3 py-1.5 rounded-lg backdrop-blur-md flex items-center gap-2"
                style={{
                  backgroundColor: currentTheme.bg.card + 'CC',
                  borderWidth: 1,
                  borderColor: currentTheme.border.default
                }}
              >
                <span
                  className="font-medium"
                  style={{ color: currentTheme.text.primary }}
                >
                  {activeCam.name}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => captureSnapshot(activeCam.id)}
                  className="p-2 rounded-lg backdrop-blur-md transition-all hover:brightness-110"
                  style={{
                    backgroundColor: currentTheme.bg.card + 'CC',
                    borderWidth: 1,
                    borderColor: currentTheme.border.default,
                    color: currentTheme.accent.color
                  }}
                >
                  <Image size={20} />
                </button>
              </div>
            </div>

            {/* Camera Navigation */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
              <button
                onClick={() => cycleThroughCameras('prev')}
                className="p-2 rounded-lg backdrop-blur-md transition-all hover:brightness-110"
                style={{
                  backgroundColor: currentTheme.bg.card + 'CC',
                  borderWidth: 1,
                  borderColor: currentTheme.border.default,
                  color: currentTheme.text.primary
                }}
              >
                <ChevronLeft size={20} />
              </button>

              {cameras.filter(c => c.enabled).map((cam) => (
                <button
                  key={cam.id}
                  onClick={() => setActiveCamera(cam.id)}
                  className={`p-2 rounded-lg backdrop-blur-md transition-all ${
                    cam.id === activeCamera ? 'brightness-125' : 'hover:brightness-110'
                  }`}
                  style={{
                    backgroundColor: cam.id === activeCamera
                      ? currentTheme.accent.color
                      : currentTheme.bg.card + 'CC',
                    borderWidth: 1,
                    borderColor: cam.id === activeCamera
                      ? currentTheme.accent.color
                      : currentTheme.border.default,
                    color: cam.id === activeCamera ? 'white' : currentTheme.text.secondary
                  }}
                >
                  {getIconComponent(cam.iconName)}
                </button>
              ))}

              <button
                onClick={() => cycleThroughCameras('next')}
                className="p-2 rounded-lg backdrop-blur-md transition-all hover:brightness-110"
                style={{
                  backgroundColor: currentTheme.bg.card + 'CC',
                  borderWidth: 1,
                  borderColor: currentTheme.border.default,
                  color: currentTheme.text.primary
                }}
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Picture-in-Picture */}
            {pipEnabled && pipCam && (
              <div
                className="absolute bottom-20 right-4 w-64 rounded-lg border overflow-hidden shadow-2xl"
                style={{
                  backgroundColor: currentTheme.bg.card,
                  borderColor: currentTheme.border.default,
                  aspectRatio: '16/9'
                }}
              >
                <div
                  className="w-full h-full flex items-center justify-center text-center p-4"
                  style={{ backgroundColor: currentTheme.bg.main }}
                >
                  <div>
                    <div
                      className="mb-2 p-2 rounded-full inline-block"
                      style={{
                        backgroundColor: currentTheme.accent.color + '20',
                        color: currentTheme.accent.color
                      }}
                    >
                      {getIconComponent(pipCam.iconName)}
                    </div>
                    <div
                      className="text-sm font-medium"
                      style={{ color: currentTheme.text.primary }}
                    >
                      {pipCam.name}
                    </div>
                  </div>
                </div>
                <div className="absolute top-2 left-2 right-2 flex justify-between">
                  <span
                    className="text-xs px-2 py-0.5 rounded backdrop-blur-md"
                    style={{
                      backgroundColor: currentTheme.bg.card + 'CC',
                      color: currentTheme.text.secondary
                    }}
                  >
                    PiP
                  </span>
                  <button
                    onClick={() => {
                      // Swap cameras
                      const temp = activeCamera;
                      setActiveCamera(pipCamera);
                      setPipCamera(temp);
                    }}
                    className="text-xs px-2 py-0.5 rounded backdrop-blur-md hover:brightness-110"
                    style={{
                      backgroundColor: currentTheme.bg.card + 'CC',
                      color: currentTheme.accent.color
                    }}
                  >
                    Swap
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Camera Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cameras.map((camera) => (
          <CameraCard
            key={camera.id}
            camera={camera}
            isActive={camera.id === activeCamera}
            onSelect={() => setActiveCamera(camera.id)}
            onToggle={() => toggleCameraEnabled(camera.id)}
            onUpdate={(updates) => updateCamera(camera.id, updates)}
            onSnapshot={() => captureSnapshot(camera.id)}
            getIcon={getIconComponent}
            theme={currentTheme}
          />
        ))}
      </div>

      {/* Camera Settings Panel */}
      {activeCam && (
        <CameraSettingsPanel
          camera={activeCam}
          onUpdate={(updates) => updateCamera(activeCam.id, updates)}
          theme={currentTheme}
        />
      )}
    </div>
  );
};

// Camera Card Component
const CameraCard = ({ camera, isActive, onSelect, onToggle, onUpdate, onSnapshot, getIcon, theme }) => {
  return (
    <div
      className={`rounded-xl border p-4 cursor-pointer transition-all ${
        isActive ? 'ring-2' : ''
      }`}
      style={{
        backgroundColor: theme.bg.card,
        borderColor: isActive ? theme.accent.color : theme.border.default,
        ringColor: theme.accent.color
      }}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div style={{ color: theme.accent.color }}>
            {getIcon(camera.iconName)}
          </div>
          <div
            className="font-medium"
            style={{ color: theme.text.primary }}
          >
            {camera.name}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          style={{ color: camera.enabled ? theme.accent.color : theme.text.muted }}
        >
          {camera.enabled ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
      </div>

      <div
        className="aspect-video rounded-lg mb-3 flex items-center justify-center"
        style={{
          backgroundColor: theme.bg.main,
          borderWidth: 1,
          borderColor: theme.border.light
        }}
      >
        <div
          className={`w-2 h-2 rounded-full ${camera.status === 'online' ? 'animate-pulse' : ''}`}
          style={{
            backgroundColor: camera.status === 'online' ? '#10b981' : '#ef4444'
          }}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: theme.text.secondary }}>Resolution</span>
          <span
            className="font-medium"
            style={{ color: theme.text.primary }}
          >
            {camera.resolution.width} × {camera.resolution.height}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: theme.text.secondary }}>FPS</span>
          <span
            className="font-medium"
            style={{ color: theme.text.primary }}
          >
            {camera.fps}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: theme.text.secondary }}>Zoom</span>
          <span
            className="font-medium"
            style={{ color: theme.text.primary }}
          >
            {camera.zoom}×
          </span>
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onSnapshot();
        }}
        className="w-full mt-3 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all hover:brightness-110"
        style={{
          backgroundColor: theme.accent.color + '20',
          color: theme.accent.color
        }}
      >
        <Image size={16} />
        Snapshot
      </button>
    </div>
  );
};

// Camera Settings Panel
const CameraSettingsPanel = ({ camera, onUpdate, theme }) => {
  return (
    <div
      className="rounded-xl border p-6"
      style={{
        backgroundColor: theme.bg.card,
        borderColor: theme.border.default
      }}
    >
      <div className="flex items-center gap-2 mb-6">
        <Settings size={20} style={{ color: theme.accent.color }} />
        <h3
          className="text-lg font-bold"
          style={{ color: theme.text.primary }}
        >
          {camera.name} - Einstellungen
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Resolution */}
        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: theme.text.secondary }}
          >
            Auflösung
          </label>
          <select
            value={`${camera.resolution.width}x${camera.resolution.height}`}
            onChange={(e) => {
              const [width, height] = e.target.value.split('x').map(Number);
              onUpdate({ resolution: { width, height } });
            }}
            className="w-full px-3 py-2 rounded-lg border"
            style={{
              backgroundColor: theme.bg.hover,
              borderColor: theme.border.default,
              color: theme.text.primary
            }}
          >
            <option value="640x480">640 × 480 (VGA)</option>
            <option value="1280x720">1280 × 720 (HD)</option>
            <option value="1920x1080">1920 × 1080 (Full HD)</option>
            <option value="2560x1440">2560 × 1440 (2K)</option>
            <option value="3840x2160">3840 × 2160 (4K)</option>
          </select>
        </div>

        {/* FPS */}
        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: theme.text.secondary }}
          >
            FPS
          </label>
          <select
            value={camera.fps}
            onChange={(e) => onUpdate({ fps: parseInt(e.target.value) })}
            className="w-full px-3 py-2 rounded-lg border"
            style={{
              backgroundColor: theme.bg.hover,
              borderColor: theme.border.default,
              color: theme.text.primary
            }}
          >
            <option value="15">15 fps</option>
            <option value="24">24 fps</option>
            <option value="30">30 fps</option>
            <option value="60">60 fps</option>
          </select>
        </div>

        {/* Zoom */}
        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: theme.text.secondary }}
          >
            Zoom: {camera.zoom}×
          </label>
          <input
            type="range"
            min="1"
            max="5"
            step="0.1"
            value={camera.zoom}
            onChange={(e) => onUpdate({ zoom: parseFloat(e.target.value) })}
            className="w-full"
          />
        </div>

        {/* Rotation */}
        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: theme.text.secondary }}
          >
            Rotation
          </label>
          <select
            value={camera.rotation}
            onChange={(e) => onUpdate({ rotation: parseInt(e.target.value) })}
            className="w-full px-3 py-2 rounded-lg border"
            style={{
              backgroundColor: theme.bg.hover,
              borderColor: theme.border.default,
              color: theme.text.primary
            }}
          >
            <option value="0">0°</option>
            <option value="90">90°</option>
            <option value="180">180°</option>
            <option value="270">270°</option>
          </select>
        </div>

        {/* Flip Horizontal */}
        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: theme.text.secondary }}
          >
            Horizontal spiegeln
          </label>
          <button
            onClick={() => onUpdate({ flipH: !camera.flipH })}
            className="w-full px-3 py-2 rounded-lg border font-medium transition-all"
            style={{
              backgroundColor: camera.flipH ? theme.accent.color + '20' : theme.bg.hover,
              borderColor: camera.flipH ? theme.accent.color : theme.border.default,
              color: camera.flipH ? theme.accent.color : theme.text.primary
            }}
          >
            {camera.flipH ? 'Aktiviert' : 'Deaktiviert'}
          </button>
        </div>

        {/* Flip Vertical */}
        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: theme.text.secondary }}
          >
            Vertikal spiegeln
          </label>
          <button
            onClick={() => onUpdate({ flipV: !camera.flipV })}
            className="w-full px-3 py-2 rounded-lg border font-medium transition-all"
            style={{
              backgroundColor: camera.flipV ? theme.accent.color + '20' : theme.bg.hover,
              borderColor: camera.flipV ? theme.accent.color : theme.border.default,
              color: camera.flipV ? theme.accent.color : theme.text.primary
            }}
          >
            {camera.flipV ? 'Aktiviert' : 'Deaktiviert'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MultiCameraView;
