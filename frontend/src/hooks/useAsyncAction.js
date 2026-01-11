import { useState, useCallback } from 'react';
import { useAlert } from '../context/AlertContext';

/**
 * useAsyncAction Hook
 * Unified loading/error/success state management for async operations
 *
 * @returns {Object} { loading, error, execute, reset }
 *
 * @example
 * const { loading, error, execute } = useAsyncAction();
 *
 * const handleSave = async () => {
 *   await execute(
 *     async () => {
 *       return await api.post('/data', payload);
 *     },
 *     'Erfolgreich gespeichert!'
 *   );
 * };
 */
export default function useAsyncAction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { showAlert } = useAlert();

  const execute = useCallback(async (asyncFn, successMessage) => {
    setLoading(true);
    setError(null);
    try {
      const result = await asyncFn();
      if (successMessage) {
        showAlert(successMessage, 'success');
      }
      return result;
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Ein Fehler ist aufgetreten';
      setError(errorMsg);
      showAlert(errorMsg, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  return { loading, error, execute, reset };
}

// Named export also available
export { useAsyncAction };
