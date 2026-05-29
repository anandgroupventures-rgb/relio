"use client";
import { useState, useEffect } from "react";
import { getSyncStatus } from "@/lib/firebase/offlineDB";
import { useAuth } from "./useAuth";

export function useSyncStatus() {
  const { user } = useAuth();
  const [status, setStatus] = useState({
    pendingChanges: 0,
    pendingLeads: 0,
    conflictLeads: 0,
    isOnline: true,
  });

  useEffect(() => {
    if (!user) return;

    async function check() {
      try {
        const s = await getSyncStatus(user.uid);
        setStatus(s);
      } catch (e) {
        // IndexedDB may not be ready yet
      }
    }

    check();
    const interval = setInterval(check, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, [user]);

  return status;
}
