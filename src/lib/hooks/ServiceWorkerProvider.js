"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ServiceWorkerContext = createContext({
  isSupported: false,
  isRegistered: false,
  error: null,
  requestSync: async () => false
});

export function ServiceWorkerProvider({ children }) {
  const [state, setState] = useState({
    isSupported: false,
    isRegistered: false,
    error: null
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Check if service worker is supported
    if (!("serviceWorker" in navigator)) {
      setState(prev => ({ ...prev, error: "Service workers not supported" }));
      return;
    }
    
    setState(prev => ({ ...prev, isSupported: true }));

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              console.log("[SW] New update available");
            }
          });
        });

        if (registration.active) {
          setState(prev => ({ ...prev, isRegistered: true }));
        }

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener("message", (event) => {
          if (event.data && event.data.type === "SYNC_REQUIRED") {
            // Dynamic import to avoid issues
            import("@/lib/firebase/offlineDB").then(({ syncPendingChanges }) => {
              syncPendingChanges();
            });
          }
        });

      } catch (err) {
        console.error("Service Worker registration failed:", err);
        setState(prev => ({ ...prev, error: "Failed to enable offline mode" }));
      }
    };

    registerSW();
  }, []);

  const requestSync = async () => {
    if (!state.isSupported || !navigator.serviceWorker?.controller) {
      return false;
    }

    try {
      // Register background sync if available
      if ("sync" in navigator.serviceWorker.registration) {
        await navigator.serviceWorker.registration.sync.register("sync-leads");
      }
      
      navigator.serviceWorker.controller.postMessage({
        type: "REGISTER_SYNC"
      });
      
      return true;
    } catch (err) {
      console.error("Sync registration failed:", err);
      return false;
    }
  };

  return (
    <ServiceWorkerContext.Provider value={{ ...state, requestSync }}>
      {children}
    </ServiceWorkerContext.Provider>
  );
}

export function useServiceWorkerContext() {
  return useContext(ServiceWorkerContext);
}
