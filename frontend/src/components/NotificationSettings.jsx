import { useState, useEffect } from 'react';
import { Bell, BellOff, Check, X, Smartphone, TestTube } from 'lucide-react';
import {
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isNotificationSupported,
  isRunningAsPWA,
  showLocalNotification
} from '../utils/notifications';
import { notificationsAPI } from '../utils/api';
import { useAlert } from '../context/AlertContext';
import { SettingsSection, StatCard, EmptyState } from './common/Settings';
import useAsyncAction from '../hooks/useAsyncAction';
import settingsService from '../services/settingsService';
import { useTheme } from '../theme';

export default function NotificationSettings() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [stats, setStats] = useState(null);
  const [isPWA, setIsPWA] = useState(false);
  const { showAlert } = useAlert();
  const { loading, execute } = useAsyncAction();
  const { currentTheme } = useTheme();

  useEffect(() => {
    checkNotificationStatus();
    fetchStats();
    setIsPWA(isRunningAsPWA());
  }, []);

  const checkNotificationStatus = async () => {
    if (!isNotificationSupported()) {
      return;
    }

    setPermission(Notification.permission);
    setNotificationsEnabled(Notification.permission === 'granted');

    // Prüfe ob bereits abonniert
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await settingsService.getNotificationStats();
      setStats(data.stats);
    } catch (error) {
      console.error('Fehler beim Laden der Stats:', error);
      // Fehler ignorieren, wenn Endpoint nicht existiert
    }
  };

  const handleEnableNotifications = async () => {
    await execute(async () => {
      const granted = await requestNotificationPermission();

      if (granted) {
        await subscribeToPushNotifications();
        setNotificationsEnabled(true);
        setIsSubscribed(true);
        setPermission('granted');

        // Zeige Bestätigungs-Notification
        showLocalNotification('✅ Benachrichtigungen aktiviert', {
          body: 'Sie erhalten nun Benachrichtigungen vom Grow System',
          tag: 'notifications-enabled'
        });

        await fetchStats();
      }
    }, 'Benachrichtigungen erfolgreich aktiviert');
  };

  const handleDisableNotifications = async () => {
    await execute(async () => {
      await unsubscribeFromPushNotifications();
      setNotificationsEnabled(false);
      setIsSubscribed(false);
      await fetchStats();
    }, 'Benachrichtigungen deaktiviert');
  };

  const handleTestNotification = async () => {
    await execute(async () => {
      // Lokale Test-Notification
      showLocalNotification('🧪 Test-Benachrichtigung', {
        body: 'Wenn Sie diese Nachricht sehen, funktionieren Benachrichtigungen!',
        tag: 'test',
        actions: [
          { action: 'view', title: 'Anzeigen' },
          { action: 'dismiss', title: 'OK' }
        ]
      });

      // Sende auch Push-Notification an alle Geräte
      await settingsService.sendTestNotification();
    }, 'Test-Benachrichtigung gesendet');
  };

  if (!isNotificationSupported()) {
    return (
      <EmptyState
        icon={BellOff}
        title="Benachrichtigungen nicht verfügbar"
        message="Ihr Browser unterstützt keine Push-Benachrichtigungen"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* PWA Status */}
      {isPWA && (
        <div
          className="rounded-lg p-4 border"
          style={{
            backgroundColor: `${currentTheme.colors.success}10`,
            borderColor: `${currentTheme.colors.success}30`
          }}
        >
          <div className="flex items-center gap-2" style={{ color: currentTheme.colors.success }}>
            <Smartphone className="w-5 h-5" />
            <span className="font-medium">App-Modus aktiv</span>
          </div>
          <p className="text-sm mt-1" style={{ color: currentTheme.text.secondary }}>
            Sie verwenden das Grow System als installierte App
          </p>
        </div>
      )}

      {/* Haupt-Einstellung */}
      <SettingsSection>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6" style={{ color: currentTheme.colors.primary }} />
            <div>
              <h3 className="font-semibold text-lg" style={{ color: currentTheme.text.primary }}>
                Push-Benachrichtigungen
              </h3>
              <p className="text-sm" style={{ color: currentTheme.text.secondary }}>
                Erhalten Sie Echtzeit-Benachrichtigungen bei wichtigen Ereignissen
              </p>
            </div>
          </div>

          {permission === 'granted' && isSubscribed ? (
            <button
              onClick={handleDisableNotifications}
              disabled={loading}
              className="px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              style={{
                backgroundColor: currentTheme.colors.error,
                color: '#ffffff'
              }}
            >
              <BellOff className="w-4 h-4" />
              Deaktivieren
            </button>
          ) : (
            <button
              onClick={handleEnableNotifications}
              disabled={loading || permission === 'denied'}
              className="px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              style={{
                backgroundColor: currentTheme.colors.primary,
                color: '#ffffff'
              }}
            >
              <Bell className="w-4 h-4" />
              {loading ? 'Aktiviere...' : 'Aktivieren'}
            </button>
          )}
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 text-sm">
          {permission === 'granted' ? (
            <>
              <Check className="w-4 h-4" style={{ color: currentTheme.colors.success }} />
              <span style={{ color: currentTheme.colors.success }}>Berechtigung erteilt</span>
            </>
          ) : permission === 'denied' ? (
            <>
              <X className="w-4 h-4" style={{ color: currentTheme.colors.error }} />
              <span style={{ color: currentTheme.colors.error }}>
                Berechtigung verweigert - Bitte in Browser-Einstellungen ändern
              </span>
            </>
          ) : (
            <span style={{ color: currentTheme.text.secondary }}>Berechtigung noch nicht erteilt</span>
          )}
        </div>

        {isSubscribed && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: currentTheme.border.default }}>
            <button
              onClick={handleTestNotification}
              className="w-full sm:w-auto px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              style={{
                backgroundColor: currentTheme.bg.secondary,
                color: currentTheme.text.primary,
                border: `1px solid ${currentTheme.border.default}`
              }}
            >
              <TestTube className="w-4 h-4" />
              Test-Benachrichtigung senden
            </button>
          </div>
        )}
      </SettingsSection>

      {/* Benachrichtigungs-Typen */}
      <SettingsSection title="Benachrichtigungs-Typen">
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: currentTheme.colors.success }} />
            <div>
              <div className="font-medium" style={{ color: currentTheme.text.primary }}>Kritische Alarme</div>
              <div style={{ color: currentTheme.text.secondary }}>
                Temperatur zu hoch/niedrig, Gas-Warnung, System-Ausfälle
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: currentTheme.colors.success }} />
            <div>
              <div className="font-medium" style={{ color: currentTheme.text.primary }}>Bewässerungs-Hinweise</div>
              <div style={{ color: currentTheme.text.secondary }}>
                Niedrige Bodenfeuchtigkeit, leerer Wassertank
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: currentTheme.colors.success }} />
            <div>
              <div className="font-medium" style={{ color: currentTheme.text.primary }}>Klima-Warnungen</div>
              <div style={{ color: currentTheme.text.secondary }}>
                Luftfeuchtigkeit außerhalb des Zielbereichs, VPD-Probleme
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: currentTheme.colors.success }} />
            <div>
              <div className="font-medium" style={{ color: currentTheme.text.primary }}>Kalender-Erinnerungen</div>
              <div style={{ color: currentTheme.text.secondary }}>
                Anstehende Aufgaben, Dünge-Zeitpläne, Ernte-Termine
              </div>
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Statistiken */}
      {stats && (
        <SettingsSection title="Statistiken">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              value={stats.total}
              label="Gesamt"
              color={currentTheme.colors.primary}
            />
            <StatCard
              value={stats.active}
              label="Aktiv"
              color={currentTheme.colors.success}
            />
            <StatCard
              value={stats.inactive}
              label="Inaktiv"
              color={currentTheme.text.secondary}
            />
            <StatCard
              value={Object.keys(stats.platforms || {}).length}
              label="Plattformen"
              color={currentTheme.colors.info}
            />
          </div>

          {stats.platforms && Object.keys(stats.platforms).length > 0 && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: currentTheme.border.default }}>
              <div className="text-sm font-medium mb-2" style={{ color: currentTheme.text.primary }}>
                Geräte nach Plattform
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.platforms).map(([platform, count]) => (
                  <div
                    key={platform}
                    className="px-3 py-1 rounded-full text-xs"
                    style={{
                      backgroundColor: currentTheme.bg.secondary,
                      color: currentTheme.text.primary
                    }}
                  >
                    {platform}: {count}
                  </div>
                ))}
              </div>
            </div>
          )}
        </SettingsSection>
      )}

      {/* Hinweis */}
      <div
        className="rounded-lg p-4 border"
        style={{
          backgroundColor: `${currentTheme.colors.info}10`,
          borderColor: `${currentTheme.colors.info}30`
        }}
      >
        <p className="text-sm" style={{ color: currentTheme.text.primary }}>
          💡 <strong>Tipp:</strong> Für die beste Erfahrung installieren Sie das Grow System als App
          auf Ihrem Smartphone. So verpassen Sie keine wichtigen Benachrichtigungen!
        </p>
      </div>
    </div>
  );
}
