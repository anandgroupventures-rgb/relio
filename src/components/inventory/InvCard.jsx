"use client";
import { markOwnerContacted } from "@/lib/firebase/inventory";
import { useAuth } from "@/lib/hooks/useAuth";
import { stalenessLevel } from "@/lib/utils/dateHelpers";
import { AVAILABILITY } from "@/lib/utils/constants";
import styles from "./InvCard.module.css";

export default function InvCard({ item, onEdit, onCall, onWhatsApp, onShare }) {
  const { user } = useAuth();
  const stale    = stalenessLevel(item.lastOwnerContacted);
  const avail    = AVAILABILITY.find(a => a.value === item.availability) || AVAILABILITY[0];

  async function handleMarkContacted(e) {
    e.stopPropagation();
    await markOwnerContacted(user.uid, item.id);
  }

  return (
    <div className={styles.card} style={{ borderLeftColor: stale.color }} onClick={() => onEdit?.(item)}>

      {/* Top row */}
      <div className={styles.top}>
        <div className={styles.info}>
          <div className={styles.nameRow}>
            <span className={styles.project}>{item.projectName}</span>
            <span className={styles.availBadge} style={{ color: avail.color, background: avail.bg }}>
              {avail.label}
            </span>
          </div>
          <div className={styles.details}>
            {item.bhk     && <span>{item.bhk}</span>}
            {item.size    && <><span className={styles.dot}>·</span><span>{item.size} sqft</span></>}
            {item.price   && <><span className={styles.dot}>·</span><span className={styles.price}>{item.price}</span></>}
          </div>
          <div className={styles.owner}>
            <span>👤 {item.ownerName}</span>
            {item.area && <><span className={styles.dot}>·</span><span>📍 {item.area}</span></>}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className={styles.bottom}>
        <div className={styles.staleRow}>
          <span className={styles.staleBadge} style={{ color: stale.color, background: stale.color + "15" }}>
            {stale.level === "stale" ? "⚠ " : ""}Last contact: {stale.label}
          </span>
          <button
            className={styles.contactedBtn}
            onClick={handleMarkContacted}
            title="Mark contacted today"
          >✓ Contacted</button>
        </div>

        <div className={styles.actions} onClick={e => e.stopPropagation()}>
          <button className={styles.actionBtn} onClick={() => onShare?.(item)} title="Share">📤</button>
          <button className={styles.actionBtn} onClick={() => onCall?.(item)}  title="Call">📞</button>
          <button className={styles.actionBtn} onClick={() => onWhatsApp?.(item)} title="WhatsApp">💬</button>
        </div>
      </div>
    </div>
  );
}
