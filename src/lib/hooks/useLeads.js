"use client";
import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "./useAuth";
import { calcTemperature } from "@/lib/utils/leadHelpers";

export function useLeads() {
  const { user } = useAuth();
  const [leads,   setLeads]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "leads"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => {
        const lead = { id: d.id, ...d.data() };
        // Always compute temperature fresh
        lead.temperature = calcTemperature(lead);
        return lead;
      });
      setLeads(data);
      setLoading(false);
    }, (err) => {
      console.error("useLeads error:", err);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  return { leads, loading };
}
