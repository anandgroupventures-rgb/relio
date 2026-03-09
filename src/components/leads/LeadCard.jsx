"use client";
import { useRouter } from "next/navigation";
import { memo } from "react";
import { getTempStyle, getStatusColor, getStatusLabel } from "@/lib/utils/leadHelpers";
import { formatFollowUp, isOverdue, isToday } from "@/lib/utils/dateHelpers";
import styles from "./LeadCard.module.css";

// Status icons map
const STATUS_ICONS = {
  new:              "🆕",
  contacted:        "📱",
  interested:       "✅",
  details_shared:   "📄",
  visit_scheduled:  "🗓",
  visit_done:       "🏠",
  negotiating:      "🤝",
  converted:        "🎉",
  call_back:        "📞",
  not_answering:    "🔕",
  busy:             "⏳",
  switched_off:     "📵",
  not_interested:   "❌",
  lost:             "💔",
  invalid_number:   "🚫",
};

// Wrapped in memo so re-renders only happen when lead data actually changes
const LeadCard = memo(function LeadCard({ lead, onCall, onWhatsApp, selected, onLongPress, onSelect, selectionMode }) {
  const router    = useRouter();
  const tempStyle = getTempStyle(lead.temperature || "warm");
  const fuStr     = formatFollowUp(lead.followUpDate);
  const overdue   = isOverdue(lead.followUpDate);
  const dueToday  = isToday(lead.followUpDate);
  const initials  = lead.name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  const statusIcon = STATUS_ICONS[lead.status] || "•";

  // Long press detection
  let pressTimer;
  function handleTouchStart() {
    pressTimer = setTimeout(() => {
      onLongPress?.(lead.id);
    }, 500);
  }
  function handleTouchEnd() {
    clearTimeout(pressTimer);
  }

  function handleClick() {
    if (selectionMode) {
      onSelect?.(lead.id);
    } else {
      router.push(`/leads/${lead.id}`);
    }
  }

  return (
    <div
      className={`${styles.card} ${selected ? styles.selected : ""}`}
      style={{ borderLeftColor: tempStyle.border }}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
    >
      {/* Selection checkbox (shown in selection mode) */}
      {selectionMode && (
        <div className={`${styles.checkbox} ${selected ? styles.checkboxChecked : ""}`}>
          {selected ? "✓" : ""}
        </div>
      )}

      {/* Top: Avatar + Name + Project */}
      <div className={styles.top}>
        <div className={styles.avatar} style={{ background: tempStyle.bg, color: tempStyle.border }}>
          {initials}
        </div>
        <div className={styles.info}>
          <span className={styles.name}>{lead.name}</span>
          {(lead.projectInterest || lead.bhk) && (
            <div className={styles.project}>
              {lead.bhk && <span>{lead.bhk}</span>}
              {lead.bhk && lead.projectInterest && <span className={styles.sep}>·</span>}
              {lead.projectInterest && <span>{lead.projectInterest}</span>}
            </div>
          )}
        </div>

        {/* Action buttons — always visible, top-right */}
        {!selectionMode && (
          <div className={styles.actions} onClick={e => e.stopPropagation()}>
            <button className={styles.actionBtn} onClick={() => onCall?.(lead)} aria-label="Call">📞</button>
            <button className={styles.actionBtn} onClick={() => onWhatsApp?.(lead)} aria-label="WhatsApp">💬</button>
          </div>
        )}
      </div>

      {/* Tags row: Type · Status · Source · Follow-up · Temperature */}
      <div className={styles.tagsRow}>

        {/* Type chip */}
        {lead.type && (
          <span className={styles.typeChip} data-type={lead.type}>
            {lead.type}
          </span>
        )}

        {/* Status chip */}
        <span className={styles.statusChip} style={{ color: getStatusColor(lead.status), borderColor: getStatusColor(lead.status) + "40", background: getStatusColor(lead.status) + "12" }}>
          {statusIcon} {getStatusLabel(lead.status) || "New"}
        </span>

        {/* Source */}
        {lead.source && (
          <span className={styles.sourceTag}>{lead.source}</span>
        )}

        {/* Follow-up date */}
        {fuStr && (
          <span className={styles.followUpTag} style={{
            color:      overdue ? "var(--relio-danger)" : dueToday ? "var(--relio-gold)" : "var(--relio-text-muted)",
            fontWeight: (overdue || dueToday) ? 700 : 500,
            background: overdue ? "var(--relio-danger-bg)" : dueToday ? "var(--relio-gold-light)" : "transparent",
          }}>
            {overdue ? "⚠" : "📅"} {fuStr}
          </span>
        )}

        {/* Temperature badge */}
        <span className={styles.tempBadge} style={{ background: tempStyle.bg, color: tempStyle.border }}>
          {tempStyle.label === "Hot" ? "🔥" : tempStyle.label === "Warm" ? "✦" : tempStyle.label === "Cold" ? "❄" : "💤"} {tempStyle.label}
        </span>
      </div>

      {/* Bottom row: Budget + Referred by (only if data exists) */}
      {(lead.budget || lead.referredBy) && (
        <div className={styles.bottomRow}>
          {lead.budget && (
            <span className={styles.budget}>💰 {lead.budget}</span>
          )}
          {lead.referredBy && (
            <span className={styles.referral}>via {lead.referredBy}</span>
          )}
        </div>
      )}
    </div>
  );
});

export default LeadCard;
