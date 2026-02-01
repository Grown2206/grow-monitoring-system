import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { SocketProvider, useSocket } from './context/SocketContext';
import { AlertProvider, useAlert } from './context/AlertContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './theme';
import ThemeSwitcher from './components/ThemeSwitcher';
import Dashboard from './components/Dashboard';
import Plants from './components/Plants';
import PlantManagement from './components/Plants/PlantManagement';
import Controls from './components/Controls';
import Analytics from './components/Analytics/AnalyticsV2';
import CalendarPage from './components/Calendar';
import Hardware from './components/Hardware';
import AIConsultant from './components/AIConsultant';
import Settings from './components/Settings';
import Login from './components/Auth/Login';
import NutrientPage from './components/Nutrients';
import VPDDashboard from './components/VPD/VPDDashboard';
import UnifiedCalibrationDashboard from './components/Sensors/UnifiedCalibrationDashboard';
import MaintenanceDashboard from './components/Maintenance/MaintenanceDashboard';
import ESP32CameraView from './components/Camera/ESP32CameraView';
import CameraStudio from './components/Camera/CameraStudio';
import AutomationDashboard from './components/Automation/AutomationDashboard';
import SmartGrowControl from './components/SmartGrow/SmartGrowControl';
import TimelapseDashboard from './components/Timelapse/TimelapseDashboard';
import {
  LayoutDashboard, Sprout, Settings as SettingsIcon, BarChart3,
  Calendar, Cpu, Bot, Sliders, Bell, Menu, X, Leaf, LogOut, Loader,
  Beaker, Droplet, Zap as ZapIcon, Film, Wrench, Camera, ChevronDown, ChevronRight,
  TreePine, Activity, Cog, Sparkles, Gauge
} from 'lucide-react';

// Erweiterte Status-Badge Komponente
const StatusBadge = () => {
  const { isConnected } = useSocket();
  return (
    <div className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border shadow-sm transition-all duration-300 ${
      isConnected 
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10' 
        : 'bg-red-500/10 text-red-400 border-red-500/20 shadow-red-500/10'
    }`}>
      <span className={`relative flex h-2.5 w-2.5`}>
        {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
      </span>
      {isConnected ? 'SYSTEM ONLINE' : 'VERBINDUNG GETRENNT'}
    </div>
  );
};

// Haupt-Navigation Button
const NavBtn = ({ id, active, set, icon, label, mobile = false, isSubItem = false, theme }) => (
  <button
    onClick={() => set(id)}
    className={`group flex items-center gap-3 rounded-xl transition-all duration-200 w-full ${
      isSubItem ? 'px-4 py-2 ml-2' : 'px-4 py-3'
    } ${
      active === id
        ? 'text-emerald-400 border-l-4 border-emerald-500'
        : 'hover:text-slate-200'
    }`}
    style={{
      backgroundColor: active === id ? `rgba(${theme?.accent?.rgb || '16, 185, 129'}, 0.1)` : 'transparent',
      color: active === id ? (theme?.accent?.color || '#10b981') : (theme?.text?.secondary || '#94a3b8')
    }}
  >
    <div className={`${active === id ? '' : 'group-hover:text-slate-300'}`}>
      {icon}
    </div>
    <span className={`font-medium ${mobile ? 'block' : 'hidden md:inline'} text-sm`}>{label}</span>
    {active === id && !isSubItem && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 hidden md:block shadow-[0_0_8px_rgba(52,211,153,0.8)]" />}
  </button>
);

// Navigation Category (Collapsible)
const NavCategory = ({ category, expanded, toggle, activeTab, setActiveTab, setSidebarOpen, theme }) => {
  const isAnyChildActive = category.items.some(item => item.id === activeTab);

  return (
    <div className="mb-2">
      <button
        onClick={() => toggle(category.id)}
        className="group flex items-center justify-between w-full px-4 py-2 rounded-xl transition-all duration-200 hover:bg-slate-800/50"
        style={{ color: theme.text.secondary }}
      >
        <div className="flex items-center gap-3">
          <div className={`${isAnyChildActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
            {category.icon}
          </div>
          <span className="font-semibold text-xs uppercase tracking-wider">{category.label}</span>
        </div>
        <div className="text-slate-500">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </button>
      {expanded && (
        <div className="mt-1 space-y-1">
          {category.items.map(item => (
            <NavBtn
              key={item.id}
              {...item}
              active={activeTab}
              set={(id) => {
                setActiveTab(id);
                setSidebarOpen(false);
              }}
              isSubItem={true}
              theme={theme}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Header mit Benachrichtigungen
const TopBar = ({ title, toggleSidebar }) => {
  const { currentTheme } = useTheme();

  return (
    <header
      className="backdrop-blur-md border-b p-4 flex justify-between items-center sticky top-0 z-40"
      style={{
        backgroundColor: currentTheme.bg.card + 'CC', // 80% opacity
        borderColor: currentTheme.border.default
      }}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="md:hidden transition-colors"
          style={{ color: currentTheme.text.secondary }}
        >
          <Menu size={24} />
        </button>
        <h1
          className="text-xl font-bold tracking-tight"
          style={{ color: currentTheme.text.primary }}
        >
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge />
        <ThemeSwitcher />
        <button
          className="relative p-2 transition-colors rounded-lg"
          style={{
            color: currentTheme.text.secondary,
            backgroundColor: currentTheme.bg.hover
          }}
        >
          <Bell size={20} />
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border"
            style={{
              backgroundColor: '#ef4444',
              borderColor: currentTheme.bg.card
            }}
          />
        </button>
      </div>
    </header>
  );
};

// Haupt-App mit Auth-Check
function AppContent() {
  const { isAuthenticated, user, logout, loading } = useAuth();
  const { currentTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({
    grow: true,
    environment: true,
    automation: true,
    media: true,
    system: false
  });

  // Loading State während Token-Validierung
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Lade Sitzung...</p>
        </div>
      </div>
    );
  }

  // Login ist jetzt OPTIONAL - App funktioniert auch ohne Login
  // Kommentiert aus damit App OHNE Login funktioniert
  // if (!isAuthenticated) {
  //   return <Login onSuccess={() => setActiveTab('dashboard')} />;
  // }

  const getPageTitle = () => {
    switch(activeTab) {
      case 'dashboard': return 'System Übersicht';
      case 'smartcontrol': return 'Smart Grow Control Center';
      case 'plants': return 'Pflanzen Management';
      case 'calendar': return 'Grow Kalender';
      case 'analytics': return 'Daten & Analyse';
      case 'controls': return 'Manuelle Steuerung';
      case 'nutrients': return 'Nährstoff-Management';
      case 'calibration': return 'Sensor Kalibrierung';
      case 'vpd': return 'VPD Control';
      case 'maintenance': return 'Wartungsplan';
      case 'camerastudio': return 'Camera Studio';
      case 'cameras': return 'ESP32-CAM Live View';
      case 'automation': return 'Automation Engine';
      case 'timelapse': return 'Timelapse';
      case 'settings': return 'Einstellungen';
      case 'hardware': return 'System Status';
      case 'ai': return 'AI Consultant';
      default: return 'GrowMonitor';
    }
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const navStructure = {
    main: [
      { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
      { id: 'smartcontrol', icon: <Sparkles size={20} />, label: 'Smart Control', highlight: true }
    ],
    categories: [
      {
        id: 'grow',
        label: 'Grow Management',
        icon: <TreePine size={20} />,
        items: [
          { id: 'plants', icon: <Sprout size={18} />, label: 'Pflanzen' },
          { id: 'calendar', icon: <Calendar size={18} />, label: 'Kalender' }
        ]
      },
      {
        id: 'environment',
        label: 'Environment',
        icon: <Activity size={20} />,
        items: [
          { id: 'vpd', icon: <Droplet size={18} />, label: 'VPD Control' },
          { id: 'calibration', icon: <Gauge size={18} />, label: 'Sensor Kalibrierung' },
          { id: 'analytics', icon: <BarChart3 size={18} />, label: 'Daten Analyse' }
        ]
      },
      {
        id: 'automation',
        label: 'Automation',
        icon: <Cog size={20} />,
        items: [
          { id: 'automation', icon: <ZapIcon size={18} />, label: 'Automation Rules' },
          { id: 'nutrients', icon: <Beaker size={18} />, label: 'BioBizz Nährstoffe' },
          { id: 'controls', icon: <Sliders size={18} />, label: 'Manuelle Steuerung' }
        ]
      },
      {
        id: 'media',
        label: 'Media',
        icon: <Camera size={20} />,
        items: [
          { id: 'camerastudio', icon: <Camera size={18} />, label: 'Camera Studio' },
          { id: 'cameras', icon: <Camera size={18} />, label: 'ESP32-CAM (Legacy)' },
          { id: 'timelapse', icon: <Film size={18} />, label: 'Timelapse' }
        ]
      },
      {
        id: 'system',
        label: 'System',
        icon: <Cpu size={20} />,
        items: [
          { id: 'maintenance', icon: <Wrench size={18} />, label: 'Wartungsplan' },
          { id: 'hardware', icon: <Cpu size={18} />, label: 'Hardware Status' },
          { id: 'ai', icon: <Bot size={18} />, label: 'AI Assistant' },
          { id: 'settings', icon: <SettingsIcon size={18} />, label: 'Einstellungen' }
        ]
      }
    ]
  };

  // Eingeloggt -> Normale App
  return (
    <SocketProvider>
        <div
          className="min-h-screen font-sans flex overflow-hidden"
          style={{
            backgroundColor: currentTheme.bg.main,
            color: currentTheme.text.primary
          }}
        >

          {/* Mobile Overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <aside
            className={`
              fixed md:static inset-y-0 left-0 z-50 w-64 border-r overflow-hidden
              transform transition-transform duration-300 ease-in-out flex flex-col
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}
            style={{
              backgroundColor: currentTheme.bg.card,
              borderColor: currentTheme.border.default
            }}
          >
            <div className="p-6 flex items-center justify-between border-b border-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-2 rounded-lg shadow-lg shadow-emerald-900/20">
                  <Leaf className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="font-bold text-lg text-white leading-none">GrowMonitor</h2>
                  <span className="text-xs text-emerald-500 font-medium tracking-wider">PRO SYSTEM</span>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-500">
                <X size={24} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-1">
              {/* Main Dashboard */}
              {navStructure.main.map(item => (
                <NavBtn
                  key={item.id}
                  {...item}
                  active={activeTab}
                  set={(id) => {
                    setActiveTab(id);
                    setSidebarOpen(false);
                  }}
                  theme={currentTheme}
                />
              ))}

              <div className="my-4 border-t" style={{ borderColor: currentTheme.border.default }} />

              {/* Collapsible Categories */}
              {navStructure.categories.map(category => (
                <NavCategory
                  key={category.id}
                  category={category}
                  expanded={expandedCategories[category.id]}
                  toggle={toggleCategory}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  setSidebarOpen={setSidebarOpen}
                  theme={currentTheme}
                />
              ))}
            </nav>

            <div className="p-4 border-t border-slate-800 bg-slate-900/50 space-y-2">
              <div className="bg-slate-800/50 rounded-xl p-3 flex items-center gap-3 border border-slate-700/50">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-xs text-white uppercase">
                  {user?.username?.substring(0, 2) || 'GM'}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="text-sm font-medium text-slate-200 truncate">{user?.username || 'User'}</div>
                  <div className="text-xs text-slate-500 truncate">v2.1.0 Stable</div>
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors text-sm font-medium border border-red-500/20"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-96 bg-emerald-900/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2"></div>
            
            <TopBar title={getPageTitle()} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

            <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
              <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === 'dashboard' && <Dashboard changeTab={setActiveTab} />}
                {activeTab === 'smartcontrol' && <SmartGrowControl />}
                {activeTab === 'plants' && <PlantManagement />}
                {activeTab === 'calendar' && <CalendarPage />}
                {activeTab === 'ai' && <AIConsultant />}
                {activeTab === 'analytics' && <Analytics />}
                {activeTab === 'hardware' && <Hardware />}
                {activeTab === 'controls' && <Controls />}
                {activeTab === 'nutrients' && <NutrientPage />}
                {activeTab === 'calibration' && <UnifiedCalibrationDashboard />}
                {activeTab === 'vpd' && <VPDDashboard />}
                {activeTab === 'maintenance' && <MaintenanceDashboard />}
                {activeTab === 'camerastudio' && <CameraStudio />}
                {activeTab === 'cameras' && <ESP32CameraView />}
                {activeTab === 'automation' && <AutomationDashboard />}
                {activeTab === 'timelapse' && <TimelapseDashboard />}
                {activeTab === 'settings' && <Settings />}
              </div>
            </main>
          </div>
        </div>
    </SocketProvider>
  );
}

// Wrapper mit Providern
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AlertProvider>
          <AppContent />
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1e293b',
                color: '#f1f5f9',
                borderRadius: '12px',
                border: '1px solid #334155',
                padding: '12px 16px',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#f1f5f9',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#f1f5f9',
                },
              },
            }}
          />
        </AlertProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}