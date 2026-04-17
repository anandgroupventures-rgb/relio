"use client";

import { useState, useEffect, useCallback } from "react";
import { subscribeToNetworkChanges, getNetworkStatus, syncPendingChanges } from "@/lib/firebase/offlineDB";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(getNetworkStatus());
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleNetworkChange = (online) => {
      setIsOnline(online);
      
      if (online && wasOffline) {
        // Just came back online - trigger sync
        syncPendingChanges();
      }
      
      if (!online) {
        setWasOffline(true);
      }
    };

    const unsubscribe = subscribeToNetworkChanges(handleNetworkChange);
    
    // Also check periodically (some browsers don't fire events reliably)
    const interval = setInterval(() => {
      const currentStatus = getNetworkStatus();
      if (currentStatus !== isOnline) {
        setIsOnline(currentStatus);
        if (currentStatus && wasOffline) {
          syncPendingChanges();
        }
      }
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [isOnline, wasOffline]);

  return { 
    isOnline, 
    wasOffline: !isOnline && wasOffline,
    sync: syncPendingChanges
  };
}

export function useSyncStatus(uid) {
  const [syncStatus, setSyncStatus] = useState({
    pendingChanges: 0,
    isSyncing: false,
    lastSync: null
  });

  const checkSyncStatus = useCallback(async () => {
    if (!uid) return;
    
    try {
      const { getSyncStatus } = await import("@/lib/firebase/offlineDB");
      const status = await getSyncStatus(uid);
      setSyncStatus(prev => ({
        ...prev,
        pendingChanges: status.pendingChanges + status.pendingLeads,
        lastSync: new Date()
      }));
    } catch (error) {
      console.error("Failed to get sync status:", error);
    }
  }, [uid]);

  useEffect(() => {
    if (!uid) return;

    checkSyncStatus();
    
    // Check sync status every 10 seconds
    const interval = setInterval(checkSyncStatus, 10000);
    
    return () => clearInterval(interval);
  }, [uid, checkSyncStatus]);

  const triggerSync = useCallback(async () => {
    setSyncStatus(prev => ({ ...prev, isSyncing: true }));
    
    try {
      await syncPendingChanges();
      await checkSyncStatus();
    } finally {
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  }, [checkSyncStatus]);

  return { ...syncStatus, triggerSync, checkSyncStatus };
}
