'use client';

import { useState, useCallback } from 'react';
import Toast from '@/components/Toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import AlertDialog from '@/components/AlertDialog';

type ToastType = 'success' | 'error' | 'warning' | 'info';
type AlertType = 'success' | 'error' | 'warning' | 'info';
type ConfirmType = 'danger' | 'warning' | 'info' | 'success';

interface ToastState {
  show: boolean;
  message: string;
  type: ToastType;
}

interface AlertState {
  show: boolean;
  title: string;
  message: string;
  type: AlertType;
  buttonText?: string;
}

interface ConfirmState {
  show: boolean;
  title: string;
  message: string;
  type: ConfirmType;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
}

export function useNotification() {
  const [toastState, setToastState] = useState<ToastState>({
    show: false,
    message: '',
    type: 'info',
  });

  const [alertState, setAlertState] = useState<AlertState>({
    show: false,
    title: '',
    message: '',
    type: 'info',
  });

  const [confirmState, setConfirmState] = useState<ConfirmState>({
    show: false,
    title: '',
    message: '',
    type: 'warning',
    onConfirm: () => {},
  });

  // Toast notifications
  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToastState({ show: true, message, type });
  }, []);

  const success = useCallback((message: string) => {
    showToast(message, 'success');
  }, [showToast]);

  const error = useCallback((message: string) => {
    showToast(message, 'error');
  }, [showToast]);

  const warning = useCallback((message: string) => {
    showToast(message, 'warning');
  }, [showToast]);

  const info = useCallback((message: string) => {
    showToast(message, 'info');
  }, [showToast]);

  const closeToast = useCallback(() => {
    setToastState((prev) => ({ ...prev, show: false }));
  }, []);

  // Alert dialog
  const showAlert = useCallback(
    (
      title: string,
      message: string,
      type: AlertType = 'info',
      buttonText: string = 'Mengerti'
    ) => {
      setAlertState({ show: true, title, message, type, buttonText });
    },
    []
  );

  const closeAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, show: false }));
  }, []);

  // Confirm dialog
  const showConfirm = useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => void,
      type: ConfirmType = 'warning',
      confirmText: string = 'Ya, Lanjutkan',
      cancelText: string = 'Batal'
    ) => {
      setConfirmState({
        show: true,
        title,
        message,
        type,
        confirmText,
        cancelText,
        onConfirm,
      });
    },
    []
  );

  const closeConfirm = useCallback(() => {
    setConfirmState((prev) => ({ ...prev, show: false }));
  }, []);

  // Render components
  const NotificationComponents = (
    <>
      {toastState.show && (
        <Toast
          message={toastState.message}
          type={toastState.type}
          onClose={closeToast}
        />
      )}
      {alertState.show && (
        <AlertDialog
          title={alertState.title}
          message={alertState.message}
          type={alertState.type}
          buttonText={alertState.buttonText}
          onClose={closeAlert}
        />
      )}
      {confirmState.show && (
        <ConfirmDialog
          title={confirmState.title}
          message={confirmState.message}
          type={confirmState.type}
          confirmText={confirmState.confirmText}
          cancelText={confirmState.cancelText}
          onConfirm={confirmState.onConfirm}
          onCancel={closeConfirm}
        />
      )}
    </>
  );

  return {
    // Toast methods
    showToast,
    success,
    error,
    warning,
    info,
    
    // Alert method
    showAlert,
    
    // Confirm method
    showConfirm,
    
    // Components to render
    NotificationComponents,
  };
}

// Example usage in component:
/*
function MyComponent() {
  const notify = useNotification();

  const handleSave = () => {
    notify.success('Data berhasil disimpan!');
  };

  const handleDelete = () => {
    notify.showConfirm(
      'Hapus Data?',
      'Data yang sudah dihapus tidak dapat dikembalikan.',
      () => {
        // Delete logic here
        notify.success('Data berhasil dihapus');
      },
      'danger',
      'Ya, Hapus',
      'Batal'
    );
  };

  const handleInfo = () => {
    notify.showAlert(
      'Informasi',
      'Ini adalah pesan informasi penting untuk Anda.',
      'info'
    );
  };

  return (
    <>
      {notify.NotificationComponents}
      <button onClick={handleSave}>Save</button>
      <button onClick={handleDelete}>Delete</button>
      <button onClick={handleInfo}>Info</button>
    </>
  );
}
*/
