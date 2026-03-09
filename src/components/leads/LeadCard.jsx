"use client";
import { useRouter } from "next/navigation";
import { getTempStyle, getStatusColor, getStatusLabel } from "@/lib/utils/leadHelpers";
import { formatFollowUp, isOverdue, isToday } from "@/lib/utils/dateHelpers";
import styles from "./LeadCard.module.css";

export default function LeadCard({ lead, onCall, onWhatsApp }) {
  const router   = useRouter();
  const tempStyle = getTempStyle(lead.temperature || "cold");
  const fuStr     = formatFollowUp(lead.followUpDate);
  const overdue   = isOverdue(lead.followUpDate);
  const dueToday  = isToday(lead.followUpDate);
  const initials  = lead.name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2) || "?";

  return (
    <div
      className={styles.card}
      style={{ borderLeftColor: tempStyle.border }}
      onClick={() => router.push(`/leads/${lead.id}`)}
    >
      {/* Avatar + Info */}
      <div className={styles.top}>
        <div className={styles.avatar} style={{ background: tempStyle.bg, color: tempStyle.border }}>
          {initials}
        </div>
        <div className={styles.info}>
          <div className={styles.nameRow}>
            <span className={styles.name}>{lead.name}</span>
            <span className={styles.tempBadge} style={{ background: tempStyle.bg, color: tempStyle.border }}>
              {tempStyle.label}
            </span>
          </div>
          <div className={styles.mobile}>{lead.mobile}</div>
          {(lead.projectInterest || lead.budget) && (
            <div className={styles.meta}>
              {lead.projectInterest && <span>{lead.projectInterest}</span>}
              {lead.projectInterest && lead.budget && <span className={styles.dot}>·</span>}
              {lead.budget && <span>{lead.budget}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className={styles.bottom}>
        <div className={styles.bottomLeft}>
          {/* Status badge */}
          <span className={styles.statusBadge} style={{ color: getStatusColor(lead.status) }}>
            {getStatusLabel(lead.status) || "New"}
          </span>
          {/* Follow-up */}
          {fuStr && (
            <span
              className={styles.followUp}
              style={{
                color:      overdue ? "var(--relio-danger)" : dueToday ? "var(--relio-gold)" : "var(--relio-text-muted)",
                fontWeight: (overdue || dueToday) ? 700 : 400,
              }}
            >
              {overdue ? "⚠ " : dueToday ? "📅 " : "📅 "}{fuStr}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className={styles.actions} onClick={e => e.stopPropagation()}>
          <button
            className={styles.actionBtn}
            onClick={() => onCall?.(lead)}
            aria-label="Call"
            title="Call"
          >📞</button>
          <button
            className={styles.actionBtn}
            onClick={() => onWhatsApp?.(lead)}
            aria-label="WhatsApp"
            title="WhatsApp"
          >💬</button>
        </div>
      </div>
    </div>
  );
}
