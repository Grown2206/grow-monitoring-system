import { useState, useCallback } from 'react';

/**
 * useConfirm Hook
 * Provides a confirmation dialog hook
 *
 * @returns {Object} { isOpen, message, confirm, cancel, showConfirm }
 *
 * @example
 * const { isOpen, message, confirm, cancel, showConfirm } = useConfirm();
 *
 * const handleDelete = async () => {
 *   const confirmed = await showConfirm('Wirklich löschen?');
 *   if (confirmed) {
 *     // Proceed with deletion
 *   }
 * };
 */
export function useConfirm() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [resolvePromise, setResolvePromise] = useState(null);

  const showConfirm = useCallback((msg) => {
    setMessage(msg);
    setIsOpen(true);

    return new Promise((resolve) => {
      setResolvePromise(() => resolve);
    });
  }, []);

  const confirm = useCallback(() => {
    setIsOpen(false);
    if (resolvePromise) {
      resolvePromise(true);
    }
  }, [resolvePromise]);

  const cancel = useCallback(() => {
    setIsOpen(false);
    if (resolvePromise) {
      resolvePromise(false);
    }
  }, [resolvePromise]);

  return {
    isOpen,
    message,
    confirm,
    cancel,
    showConfirm
  };
}

/**
 * Simple confirm using native browser dialog
 * For components that don't need a custom dialog
 */
export function confirmAction(message) {
  return window.confirm(message);
}

export default useConfirm;
