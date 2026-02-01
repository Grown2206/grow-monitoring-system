import toast from 'react-hot-toast';

/**
 * Unified Toast Notifications
 * Provides consistent feedback across the application
 */

// Success toast with optional title
export const showSuccess = (message, title) => {
  if (title) {
    toast.success(`${title}: ${message}`);
  } else {
    toast.success(message);
  }
};

// Error toast with optional title
export const showError = (message, title) => {
  if (title) {
    toast.error(`${title}: ${message}`);
  } else {
    toast.error(message);
  }
};

// Info toast
export const showInfo = (message) => {
  toast(message, {
    icon: 'ℹ️',
  });
};

// Warning toast
export const showWarning = (message) => {
  toast(message, {
    icon: '⚠️',
    style: {
      background: '#1e293b',
      color: '#fbbf24',
      border: '1px solid #f59e0b',
    },
  });
};

// Loading toast - returns ID for dismissal
export const showLoading = (message = 'Laden...') => {
  return toast.loading(message);
};

// Dismiss specific toast
export const dismissToast = (toastId) => {
  toast.dismiss(toastId);
};

// Promise-based toast (auto-updates on resolve/reject)
export const showPromise = (promise, messages) => {
  return toast.promise(promise, {
    loading: messages.loading || 'Laden...',
    success: messages.success || 'Erfolgreich!',
    error: messages.error || 'Fehler aufgetreten',
  });
};

// Device action toast
export const showDeviceAction = (device, action, success = true) => {
  const message = `${device} ${action}`;
  if (success) {
    toast.success(message, {
      icon: '⚡',
    });
  } else {
    toast.error(message);
  }
};

// Rule execution toast
export const showRuleExecution = (ruleName, success = true) => {
  if (success) {
    toast.success(`Rule "${ruleName}" ausgeführt`, {
      icon: '🤖',
    });
  } else {
    toast.error(`Rule "${ruleName}" fehlgeschlagen`);
  }
};

// Custom toast with icon
export const showCustom = (message, icon, options = {}) => {
  toast(message, {
    icon,
    ...options,
  });
};

export default {
  success: showSuccess,
  error: showError,
  info: showInfo,
  warning: showWarning,
  loading: showLoading,
  dismiss: dismissToast,
  promise: showPromise,
  device: showDeviceAction,
  rule: showRuleExecution,
  custom: showCustom,
};
