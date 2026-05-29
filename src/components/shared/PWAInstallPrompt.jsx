"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import styles from "./PWAInstallPrompt.module.css";

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if already installed (display-mode: standalone)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Don't show immediately; wait a bit or show after user engagement
      setTimeout(() => setShow(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Detect if app is installed via appinstalled event
    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setShow(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
    }
    setDeferredPrompt(null);
    setShow(false);
  }

  function handleDismiss() {
    setShow(false);
    // Remember dismissal for 7 days
    try {
      localStorage.setItem("relio_pwa_dismissed", Date.now().toString());
    } catch {}
  }

  // Respect previous dismissal
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const dismissed = localStorage.getItem("relio_pwa_dismissed");
      if (dismissed && Date.now() - parseInt(dismissed, 10) < 7 * 24 * 60 * 60 * 1000) {
        setShow(false);
      }
    } catch {}
  }, []);

  if (!show || installed) return null;

  return (
    <div className={styles.banner}>
      <div className={styles.content}>
        <Download size={20} color="var(--r-primary)" />
        <div className={styles.text}>
          <p className="text-body-md" style={{ fontWeight: 600, color: "var(--r-primary)" }}>
            Add Relio to Home Screen
          </p>
          <p className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>
            Quick access like a native app
          </p>
        </div>
      </div>
      <div className={styles.actions}>
        <button className={styles.installBtn} onClick={handleInstall}>
          Install
        </button>
        <button className={styles.dismissBtn} onClick={handleDismiss} aria-label="Dismiss">
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
