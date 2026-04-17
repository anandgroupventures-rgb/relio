"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { collection, query, orderBy, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "./useAuth";
import { calcTemperature } from "@/lib/utils/leadHelpers";
import { 
  localLeads, 
  syncFromFirebase, 
  initOfflineDatabase,
  getNetworkStatus,
  syncPendingChanges
} from "@/lib/firebase/offlineDB";

export function useLeads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncStatus, setSyncStatus] = useState({
    isOnline: getNetworkStatus(),
    pendingChanges: 0,
    isSyncing: false,
    lastSyncTime: null
  });
  
  const firebaseUnsubRef = useRef(null);

  // Load leads from local DB first (fast, works offline)
  const loadLocalLeads = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const localData = await localLeads.getAll(user.uid);
      
      // Calculate temperature for each lead
      const processedLeads = localData.map(lead => ({
        ...lead,
        temperature: calcTemperature(lead)
      }));
      
      setLeads(processedLeads);
      
      // If we have local data, we're ready to show something
      if (localData.length > 0) {
        setLoading(false);
      }
      
      return localData.length;
    } catch (err) {
      console.error("Failed to load local leads:", err);
      return 0;
    }
  }, [user?.uid]);

  // Sync from Firebase to local
  const syncFromServer = useCallback(async () => {
    if (!user?.uid || !getNetworkStatus()) return;
    
    setSyncStatus(prev => ({ ...prev, isSyncing: true }));
    
    try {
      // Get latest from Firebase
      const q = query(
        collection(db, "users", user.uid, "leads"),
        orderBy("updatedAt", "desc")
      );
      
      const snap = await getDocs(q);
      const firebaseLeads = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      
      // Sync to local DB
      await syncFromFirebase(user.uid, firebaseLeads);
      
      // Reload from local (now with synced data)
      await loadLocalLeads();
      
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: new Date()
      }));
    } catch (err) {
      console.error("Sync from server failed:", err);
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
      setError("Failed to sync with server. Working offline.");
    }
  }, [user?.uid, loadLocalLeads]);

  // Setup real-time listener (when online)
  const setupRealtimeListener = useCallback(() => {
    if (!user?.uid || !getNetworkStatus()) return null;
    
    const q = query(
      collection(db, "users", user.uid, "leads"),
      orderBy("updatedAt", "desc")
    );
    
    const unsub = onSnapshot(q, async (snap) => {
      const firebaseLeads = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      
      // Update local DB with server data
      await syncFromFirebase(user.uid, firebaseLeads);
      
      // Reload from local
      await loadLocalLeads();
      
      setSyncStatus(prev => ({
        ...prev,
        lastSyncTime: new Date()
      }));
    }, (err) => {
      console.error("Realtime sync error:", err);
      // Don't show error to user - they have local data
    });
    
    return unsub;
  }, [user?.uid, loadLocalLeads]);

  // Initialize offline DB and load data
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    
    const init = async () => {
      try {
        // Initialize offline database
        await initOfflineDatabase(user.uid);
        
        if (!isMounted) return;
        
        // Load from local first (fast, works offline)
        const localCount = await loadLocalLeads();
        
        if (!isMounted) return;
        
        // If online, sync from server and setup listener
        if (getNetworkStatus()) {
          if (localCount === 0) {
            // No local data - need to load from server
            await syncFromServer();
          }
          
          if (!isMounted) return;
          
          // Setup real-time listener
          firebaseUnsubRef.current = setupRealtimeListener();
        }
      } catch (err) {
        console.error("Initialization error:", err);
        if (isMounted) {
          setError("Failed to load leads");
          setLoading(false);
        }
      }
    };

    init();
    
    // Handle coming back online
    const handleOnline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: true }));
      syncFromServer();
      
      // Setup listener if not already
      if (!firebaseUnsubRef.current) {
        firebaseUnsubRef.current = setupRealtimeListener();
      }
    };
    
    const handleOffline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: false }));
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (firebaseUnsubRef.current) {
        firebaseUnsubRef.current();
      }
    };
  }, [user?.uid, loadLocalLeads, syncFromServer, setupRealtimeListener]);

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    if (!getNetworkStatus()) {
      return { success: false, error: "You are offline" };
    }
    
    setSyncStatus(prev => ({ ...prev, isSyncing: true }));
    
    try {
      await syncPendingChanges();
      await syncFromServer();
      
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: new Date()
      }));
      
      return { success: true };
    } catch (err) {
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
      return { success: false, error: err.message };
    }
  }, [syncFromServer]);

  return { 
    leads, 
    loading, 
    error,
    syncStatus,
    triggerSync,
    isOffline: !syncStatus.isOnline
  };
}

// Hook for single lead with offline support
export function useLead(leadId) {
  const { user } = useAuth();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.uid || !leadId) {
      setLoading(false);
      return;
    }

    const loadLead = async () => {
      try {
        // Try local first
        const localLead = await localLeads.getById(leadId);
        
        if (localLead) {
          setLead({
            ...localLead,
            temperature: calcTemperature(localLead)
          });
          setLoading(false);
        } else if (getNetworkStatus()) {
          // If not in local and online, it might be a shared/new lead
          // Firebase listener will pick it up
          setLoading(false);
        } else {
          setError("Lead not found (offline mode)");
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load lead:", err);
        setError("Failed to load lead");
        setLoading(false);
      }
    };

    loadLead();
  }, [user?.uid, leadId]);

  return { lead, loading, error };
}
