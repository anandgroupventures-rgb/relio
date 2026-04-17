"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { initOfflineDatabase } from "@/lib/firebase/offlineDB";

export function OfflineInit({ children }) {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.uid) {
      // Initialize offline database when user is authenticated
      initOfflineDatabase(user.uid).catch(err => {
        console.error("Failed to initialize offline database:", err);
      });
    }
  }, [user?.uid]);

  return children;
}
