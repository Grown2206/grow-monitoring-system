import React, { useState } from 'react';
import { useTheme } from '../theme';
import { Sun, Moon, Droplet, Leaf, Sparkles, Palette } from 'lucide-react';

const ThemeSwitcher = () => {
  const { currentTheme, themeId, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const themes = [
    { id: 'light', name: 'Light Mode', icon: Sun, color: '#059669', preview: '#f8fafc' },
    { id: 'dark', name: 'Dark Mode', icon: Moon, color: '#10b981', preview: '#020617' },
    { id: 'forest', name: 'Forest Green', icon: Leaf, color: '#84cc16', preview: '#022c22' },
    { id: 'ocean', name: 'Deep Ocean', icon: Droplet, color: '#06b6d4', preview: '#082f49' },
    { id: 'midnight', name: 'Midnight Purple', icon: Sparkles, color: '#a855f7', preview: '#3b0764' }
  ];

  const currentThemeData = themes.find(t => t.id === themeId) || themes[1];
  const Icon = currentThemeData.icon;

  return (
    <div className="relative">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg transition-all duration-200 hover:scale-110"
        style={{
          backgroundColor: currentTheme.bg.hover,
          color: currentTheme.accent.color
        }}
        title="Theme wechseln"
      >
        <Icon size={20} />

        {/* Glow Effect */}
        <div
          className="absolute inset-0 rounded-lg blur-md opacity-30 -z-10"
          style={{
            backgroundColor: currentTheme.accent.color
          }}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div
            className="absolute right-0 mt-2 w-64 rounded-xl shadow-2xl border z-50 overflow-hidden"
            style={{
              backgroundColor: currentTheme.bg.card,
              borderColor: currentTheme.border.default
            }}
          >
            {/* Header */}
            <div className="p-4 border-b" style={{ borderColor: currentTheme.border.default }}>
              <div className="flex items-center gap-2">
                <Palette size={18} style={{ color: currentTheme.accent.color }} />
                <span className="font-semibold" style={{ color: currentTheme.text.primary }}>
                  Theme auswählen
                </span>
              </div>
            </div>

            {/* Theme Options */}
            <div className="p-2">
              {themes.map((theme) => {
                const ThemeIcon = theme.icon;
                const isActive = theme.id === themeId;

                return (
                  <button
                    key={theme.id}
                    onClick={() => {
                      setTheme(theme.id);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 group"
                    style={{
                      backgroundColor: isActive ? currentTheme.bg.hover : 'transparent',
                      border: isActive ? `2px solid ${currentTheme.accent.color}` : '2px solid transparent'
                    }}
                  >
                    {/* Preview Circle */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                      style={{
                        backgroundColor: theme.preview,
                        border: `2px solid ${theme.color}`
                      }}
                    >
                      <ThemeIcon size={18} style={{ color: theme.color }} />
                    </div>

                    {/* Theme Info */}
                    <div className="flex-1 text-left">
                      <div
                        className="font-medium"
                        style={{ color: isActive ? currentTheme.accent.color : currentTheme.text.primary }}
                      >
                        {theme.name}
                      </div>
                      {isActive && (
                        <div className="text-xs" style={{ color: currentTheme.text.muted }}>
                          Aktiv
                        </div>
                      )}
                    </div>

                    {/* Active Indicator */}
                    {isActive && (
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: currentTheme.accent.color }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer Tip */}
            <div
              className="p-3 text-xs text-center border-t"
              style={{
                color: currentTheme.text.muted,
                borderColor: currentTheme.border.default
              }}
            >
              Theme wird automatisch gespeichert
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ThemeSwitcher;
