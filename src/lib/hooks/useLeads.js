"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  collection, query, orderBy, limit, startAfter,
  onSnapshot, getDocs
} from "firebase/firestore";
import { getDbInstance } from "@/lib/firebase/config";
import { useAuth } from "./useAuth";
import { calcTemperature, calcLeadScore } from "@/lib/utils/leadHelpers";
import { localLeads, syncFromFirebase, initOfflineDatabase } from "@/lib/firebase/offlineDB";

const PAGE_SIZE = 50;

export function useLeads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const initialLoadDone = useRef(false);

  // Offline-first: load from IndexedDB immediately
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function loadLocal() {
      try {
        await initOfflineDatabase(user.uid);
        const local = await localLeads.getAll(user.uid);
        if (!cancelled && local.length > 0) {
          const enriched = local.map(l => ({
            ...l,
            temperature: calcTemperature(l),
            aiScore: l.aiScore || 0,
            aiTemp: l.aiTemp || "warm"
          }));
          setLeads(enriched);
          setLoading(false);
        }
      } catch (e) {
        console.error("[useLeads] IndexedDB load failed:", e);
      }
    }

    loadLocal();
    return () => { cancelled = true; };
  }, [user]);

  // Firestore subscription: sync from server and merge
  useEffect(() => {
    if (!user) return;
    const db = getDbInstance();
    if (!db) { setLoading(false); return; }

    const q = query(
      collection(db, "users", user.uid, "leads"),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );

    const unsub = onSnapshot(q, async (snap) => {
      const serverLeads = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Sync server data to IndexedDB
      try {
        await syncFromFirebase(user.uid, serverLeads);
      } catch (e) {
        console.error("[useLeads] syncFromFirebase failed:", e);
      }

      // Re-read merged data from IndexedDB (includes local pending changes)
      let merged = serverLeads;
      try {
        const local = await localLeads.getAll(user.uid);
        // Build a map of local leads by ID
        const localMap = new Map(local.map(l => [l.id, l]));
        // For each server lead, prefer local version if it has pending changes
        merged = serverLeads.map(s => {
          const local = localMap.get(s.id);
          if (local && local.syncStatus === "pending") {
            // Local has pending changes — prefer local data but keep server metadata
            return { ...local, _serverVersion: s };
          }
          return s;
        });
        // Add any local-only leads (not yet synced)
        const serverIds = new Set(serverLeads.map(s => s.id));
        const localOnly = local.filter(l => !serverIds.has(l.id) && l.syncStatus === "pending");
        merged = [...localOnly, ...merged];
      } catch (e) {
        console.error("[useLeads] merge failed:", e);
      }

      const enriched = merged.map(l => {
        const temperature = calcTemperature(l);
        const { score, temp } = calcLeadScore(l, merged);
        return { ...l, temperature, aiScore: score, aiTemp: temp };
      });

      setLeads(enriched);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
      setIsOffline(false);
      setLoading(false);
      initialLoadDone.current = true;
    }, (err) => {
      console.error("[useLeads] Firestream error:", err);
      setIsOffline(true);
      // Keep IndexedDB data visible
      setLoading(false);
    });

    return unsub;
  }, [user]);

  // Load more (pagination)
  const loadMore = useCallback(async () => {
    if (!user || !hasMore || !lastDoc) return;
    const db = getDbInstance();
    if (!db) return;
    const q = query(
      collection(db, "users", user.uid, "leads"),
      orderBy("createdAt", "desc"),
      startAfter(lastDoc),
      limit(PAGE_SIZE)
    );
    const snap = await getDocs(q);
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setLeads(prev => {
      const combined = [...prev, ...data];
      const enriched = combined.map(l => {
        const temperature = calcTemperature(l);
        const { score, temp } = calcLeadScore(l, combined);
        return { ...l, temperature, aiScore: score, aiTemp: temp };
      });
      return enriched;
    });
    setLastDoc(snap.docs[snap.docs.length - 1] || null);
    setHasMore(snap.docs.length === PAGE_SIZE);
  }, [user, hasMore, lastDoc]);

  return { leads, loading, hasMore, loadMore, isOffline };
}
