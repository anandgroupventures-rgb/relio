"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs,
  doc,
  getDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "./useAuth";
import { 
  localLeads, 
  syncFromFirebase, 
  initOfflineDatabase,
  getNetworkStatus,
  syncPendingChanges
} from "@/lib/firebase/offlineDB";

const PAGE_SIZE = 20;

export function usePaginatedLeads() {
  const { user } = useAuth();
  
  // State
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [syncStatus, setSyncStatus] = useState({
    isOnline: getNetworkStatus(),
    pendingChanges: 0,
    isSyncing: false,
    lastSyncTime: null
  });

  // Refs
  const lastDocRef = useRef(null);
  const isMountedRef = useRef(true);
  const loadedPagesRef = useRef(new Set());

  // Reset state when user changes
  useEffect(() => {
    if (!user?.uid) {
      setLeads([]);
      setLoading(false);
      setHasMore(true);
      lastDocRef.current = null;
      loadedPagesRef.current.clear();
      return;
    }

    // Initialize and load first page
    const init = async () => {
      setLoading(true);
      try {
        await initOfflineDatabase(user.uid);
        
        // Load first page from local DB
        const localData = await localLeads.getActive(user.uid);
        
        if (localData.length > 0) {
          // Sort by updatedAt desc
          const sorted = localData.sort((a, b) => 
            new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
          );
          
          setLeads(sorted.slice(0, PAGE_SIZE));
          
          if (sorted.length <= PAGE_SIZE) {
            setHasMore(false);
          }
        }
        
        setLoading(false);
        
        // Background sync if online
        if (getNetworkStatus()) {
          syncFromServer();
        }
      } catch (err) {
        console.error("Init error:", err);
        setError("Failed to load leads");
        setLoading(false);
      }
    };

    init();
    
    return () => {
      isMountedRef.current = false;
    };
  }, [user?.uid]);

  // Load more leads (pagination)
  const loadMore = useCallback(async () => {
    if (!user?.uid || loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    
    try {
      const currentLength = leads.length;
      const nextPageKey = Math.floor(currentLength / PAGE_SIZE);
      
      // Avoid duplicate requests
      if (loadedPagesRef.current.has(nextPageKey)) {
        setLoadingMore(false);
        return;
      }
      
      // Try to load from local first
      const localData = await localLeads.getActive(user.uid);
      const sorted = localData.sort((a, b) => 
        new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
      );
      
      const nextBatch = sorted.slice(currentLength, currentLength + PAGE_SIZE);
      
      if (nextBatch.length > 0) {
        setLeads(prev => [...prev, ...nextBatch]);
        loadedPagesRef.current.add(nextPageKey);
        
        if (sorted.length <= currentLength + PAGE_SIZE) {
          setHasMore(false);
        }
      } else {
        // Try loading from Firebase if online
        if (getNetworkStatus() && lastDocRef.current) {
          const q = query(
            collection(db, "users", user.uid, "leads"),
            orderBy("updatedAt", "desc"),
            startAfter(lastDocRef.current),
            limit(PAGE_SIZE)
          );
          
          const snap = await getDocs(q);
          
          if (snap.empty) {
            setHasMore(false);
          } else {
            const newLeads = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            lastDocRef.current = snap.docs[snap.docs.length - 1];
            
            setLeads(prev => {
              // Avoid duplicates
              const existingIds = new Set(prev.map(l => l.id));
              const uniqueNew = newLeads.filter(l => !existingIds.has(l.id));
              return [...prev, ...uniqueNew];
            });
            
            if (newLeads.length < PAGE_SIZE) {
              setHasMore(false);
            }
            
            // Sync to local
            await syncFromFirebase(user.uid, newLeads);
          }
        } else {
          setHasMore(false);
        }
      }
    } catch (err) {
      console.error("Load more error:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [user?.uid, leads.length, loadingMore, hasMore]);

  // Initial load from Firebase (when online)
  const syncFromServer = useCallback(async () => {
    if (!user?.uid || !getNetworkStatus()) return;
    
    setSyncStatus(prev => ({ ...prev, isSyncing: true }));
    
    try {
      const q = query(
        collection(db, "users", user.uid, "leads"),
        orderBy("updatedAt", "desc"),
        limit(PAGE_SIZE)
      );
      
      const snap = await getDocs(q);
      const firebaseLeads = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      
      if (snap.docs.length > 0) {
        lastDocRef.current = snap.docs[snap.docs.length - 1];
      }
      
      // Sync to local
      await syncFromFirebase(user.uid, firebaseLeads);
      
      // Only update if we have fewer leads locally (to avoid overriding user scroll position)
      setLeads(prev => {
        if (prev.length === 0) {
          return firebaseLeads;
        }
        // Merge and deduplicate
        const existingIds = new Set(prev.map(l => l.id));
        const uniqueNew = firebaseLeads.filter(l => !existingIds.has(l.id));
        return [...firebaseLeads, ...prev.filter(l => !firebaseLeads.find(fl => fl.id === l.id))]
          .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
          .slice(0, Math.max(prev.length, PAGE_SIZE));
      });
      
      if (firebaseLeads.length < PAGE_SIZE) {
        setHasMore(false);
      }
      
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: new Date()
      }));
    } catch (err) {
      console.error("Server sync error:", err);
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  }, [user?.uid]);

  // Refresh all data
  const refresh = useCallback(async () => {
    if (!user?.uid) return;
    
    setLoading(true);
    setLeads([]);
    setHasMore(true);
    lastDocRef.current = null;
    loadedPagesRef.current.clear();
    
    try {
      await syncFromServer();
    } finally {
      setLoading(false);
    }
  }, [user?.uid, syncFromServer]);

  // Archive a lead
  const archiveLeadLocal = useCallback(async (leadId, archiveData) => {
    if (!user?.uid) return;
    
    try {
      await localLeads.archive(user.uid, leadId, archiveData.reason, archiveData.notes);
      
      // Remove from list
      setLeads(prev => prev.filter(l => l.id !== leadId));
    } catch (err) {
      console.error("Archive error:", err);
      throw err;
    }
  }, [user?.uid]);

  return {
    leads,
    loading,
    loadingMore,
    error,
    hasMore,
    syncStatus,
    loadMore,
    refresh,
    archiveLead: archiveLeadLocal,
    isOffline: !syncStatus.isOnline
  };
}

// Hook for single lead (optimized)
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

    let isMounted = true;

    const loadLead = async () => {
      try {
        // Try local first
        const localLead = await localLeads.getById(leadId);
        
        if (localLead && isMounted) {
          setLead(localLead);
          setLoading(false);
        } else if (getNetworkStatus()) {
          // Try Firebase
          const snap = await getDoc(doc(db, "users", user.uid, "leads", leadId));
          if (snap.exists() && isMounted) {
            const leadData = { id: snap.id, ...snap.data() };
            setLead(leadData);
            setLoading(false);
          } else if (isMounted) {
            setError("Lead not found");
            setLoading(false);
          }
        } else if (isMounted) {
          setError("Lead not found (offline)");
          setLoading(false);
        }
      } catch (err) {
        console.error("Load lead error:", err);
        if (isMounted) {
          setError("Failed to load lead");
          setLoading(false);
        }
      }
    };

    loadLead();
    
    return () => {
      isMounted = false;
    };
  }, [user?.uid, leadId]);

  return { lead, loading, error };
}

// Hook for lead search with debouncing
export function useLeadSearch() {
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const searchTimeoutRef = useRef(null);

  const search = useCallback((query) => {
    if (!user?.uid) return;
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    // Debounce search
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const localData = await localLeads.search(user.uid, query);
        setResults(localData.slice(0, 50)); // Limit to 50 results
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [user?.uid]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return { results, loading, search };
}
