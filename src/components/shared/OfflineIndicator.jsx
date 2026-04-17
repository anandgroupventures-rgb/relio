"use client";

import { useNetworkStatus, useSyncStatus } from "@/lib/hooks/useNetwork";
import { Wifi, WifiOff, RefreshCw, Cloud, CloudOff } from "lucide-react";
import styles from "./OfflineIndicator.module.css";

export default function OfflineIndicator({ uid }) {
  const { isOnline, wasOffline } = useNetworkStatus();
  const { pendingChanges, isSyncing, triggerSync } = useSyncStatus(uid);

  // Show offline banner when offline
  if (!isOnline) {
    return (
      <div className={styles.offlineBanner}>
        <WifiOff size={16} />
        <span>You&apos;re offline. Changes saved locally.</span>
      </div>
    );
  }

  // Show sync indicator when coming back online or when there are pending changes
  if (wasOffline || pendingChanges > 0 || isSyncing) {
    return (
      <div className={`${styles.syncBanner} ${isSyncing ? styles.syncing : ""}`}>
        {isSyncing ? (
          <>
            <RefreshCw size={16} className={styles.spinning} />
            <span>Syncing {pendingChanges > 0 ? `(${pendingChanges} pending)` : "..."}</span>
          </>
        ) : pendingChanges > 0 ? (
          <>
            <CloudOff size={16} />
            <span>{pendingChanges} changes pending</span>
            <button onClick={triggerSync} className={styles.syncBtn}>
              Sync Now
            </button>
          </>
        ) : (
          <>
            <Cloud size={16} />
            <span>All changes synced</span>
          </>
        )}
      </div>
    );
  }

  // Minimal indicator when online and synced (optional)
  return null;
}

// Compact version for headers
export function CompactOfflineIndicator({ uid }) {
  const { isOnline } = useNetworkStatus();
  const { pendingChanges, isSyncing } = useSyncStatus(uid);

  if (!isOnline) {
    return (
      <div className={styles.compactOffline} title="Offline mode - changes saved locally">
        <WifiOff size={18} />
      </div>
    );
  }

  if (isSyncing || pendingChanges > 0) {
    return (
      <div 
        className={`${styles.compactSyncing} ${isSyncing ? styles.spinning : ""}`}
        title={pendingChanges > 0 ? `${pendingChanges} changes pending` : "Syncing..."}
      >
        <RefreshCw size={18} />
        {pendingChanges > 0 && <span className={styles.badge}>{pendingChanges}</span>}
      </div>
    );
  }

  return null;
}
