"use client";
import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "./useAuth";

export function useInventory() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "inventory"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setInventory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error("useInventory error:", err);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  return { inventory, loading };
}
