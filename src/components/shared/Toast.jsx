"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import styles from "./Toast.module.css";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 4000) => {
    const id = Date.now() + Math.random();
    const toast = { id, message, type, duration };
    
    setToasts((prev) => [...prev, toast]);
    
    // Auto dismiss
    setTimeout(() => {
      removeToast(id);
    }, duration);
    
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message, type) => addToast(message, type), [addToast]);
  toast.success = (message) => addToast(message, "success");
  toast.error = (message) => addToast(message, "error");
  toast.info = (message) => addToast(message, "info");

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}
      <div className={styles.container}>
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ toast, onClose }) {
  const icons = {
    success: <CheckCircle className={styles.icon} size={18} />,
    error: <AlertCircle className={styles.icon} size={18} />,
    info: <Info className={styles.icon} size={18} />,
  };

  return (
    <div className={`${styles.toast} ${styles[toast.type]}`}>
      {icons[toast.type]}
      <span className={styles.message}>{toast.message}</span>
      <button className={styles.closeBtn} onClick={onClose} aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx.toast;
}
