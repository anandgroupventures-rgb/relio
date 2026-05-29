"use client";
import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { getDbInstance } from "@/lib/firebase/config";
import { useAuth } from "./useAuth";
import Dexie from "dexie";

// Dexie-based inventory cache (lightweight, no schema versioning needed)
const invDB = new Dexie("RelioInventoryCache");
invDB.version(1).stores({
  items: "id, uid, updatedAt"
});

async function loadLocalInventory(uid) {
  try {
    const all = await invDB.items.where("uid").equals(uid).toArray();
    return all;
  } catch (e) {
    console.error("[useInventory] Local load failed:", e);
    return [];
  }
}

async function saveLocalInventory(uid, items) {
  try {
    await invDB.items.where("uid").equals(uid).delete();
    await invDB.items.bulkPut(items.map(i => ({ ...i, uid })));
  } catch (e) {
    console.error("[useInventory] Local save failed:", e);
  }
}

export function useInventory() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // Offline-first: load from IndexedDB immediately
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function loadLocal() {
      const local = await loadLocalInventory(user.uid);
      if (!cancelled && local.length > 0) {
        setInventory(local);
        setLoading(false);
      }
    }

    loadLocal();
    return () => { cancelled = true; };
  }, [user]);

  // Firestore subscription
  useEffect(() => {
    if (!user) return;
    const db = getDbInstance();
    if (!db) { setLoading(false); return; }
    const q = query(
      collection(db, "users", user.uid, "inventory"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, async (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      await saveLocalInventory(user.uid, data);
      setInventory(data);
      setIsOffline(false);
      setLoading(false);
    }, (err) => {
      console.error("[useInventory] Firestore error:", err);
      setIsOffline(true);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  return { inventory, loading, isOffline };
}
