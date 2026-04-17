"use client";

import { useEffect, useState } from "react";

export function useServiceWorker() {
  const [isSupported, setIsSupported] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Check if service worker is supported
    if (!("serviceWorker" in navigator)) {
      setError("Service workers not supported in this browser");
      return;
    }
    
    setIsSupported(true);

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New update available
              console.log("[SW] New update available");
            }
          });
        });

        // Check if already registered and active
        if (registration.active) {
          setIsRegistered(true);
        }

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener("message", (event) => {
          if (event.data && event.data.type === "SYNC_REQUIRED") {
            // Trigger sync when service worker asks
            const { syncPendingChanges } = require("@/lib/firebase/offlineDB");
            syncPendingChanges();
          }
        });

      } catch (err) {
        console.error("Service Worker registration failed:", err);
        setError("Failed to enable offline mode");
      }
    };

    registerSW();

    // Cleanup
    return () => {
      // Service workers persist, no cleanup needed
    };
  }, []);

  const requestSync = async () => {
    if (!isSupported || !navigator.serviceWorker?.controller) {
      return false;
    }

    try {
      // Register background sync if available
      if ("sync" in navigator.serviceWorker.registration) {
        await navigator.serviceWorker.registration.sync.register("sync-leads");
      }
      
      // Also send message to trigger immediate sync
      navigator.serviceWorker.controller.postMessage({
        type: "REGISTER_SYNC"
      });
      
      return true;
    } catch (err) {
      console.error("Sync registration failed:", err);
      return false;
    }
  };

  return { isSupported, isRegistered, error, requestSync };
}

// Hook to check if app can be installed as PWA
export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Store the event for later use
      setInstallPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setCanInstall(false);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const promptInstall = async () => {
    if (!installPrompt) return false;

    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === "accepted") {
      setCanInstall(false);
      setInstallPrompt(null);
      return true;
    }
    
    return false;
  };

  return { canInstall, promptInstall };
}
