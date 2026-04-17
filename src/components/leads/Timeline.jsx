"use client";
import { Phone, PhoneOff, MessageCircle, Home, FileText, RefreshCw, Calendar, StickyNote } from "lucide-react";
import { formatTimelineDate } from "@/lib/utils/dateHelpers";
import styles from "./Timeline.module.css";

const TYPE_META = {
  call_answered: { icon: Phone, label: "Call answered",    color: "#1A7842" },
  call_missed:   { icon: PhoneOff, label: "Missed call",      color: "#C43018" },
  whatsapp:      { icon: MessageCircle, label: "WhatsApp sent",    color: "#128C7E" },
  site_visit:    { icon: Home, label: "Site visit",       color: "#5C3A8C" },
  note:          { icon: StickyNote, label: "Note",             color: "#3A6EA8" },
  status_change: { icon: RefreshCw, label: "Status updated",   color: "#8A8070" },
  followup_set:  { icon: Calendar, label: "Follow-up set",    color: "#C49A2A" },
};

function outcomeLabel(outcome) {
  const map = {
    interested:      "Interested",
    details_shared:  "Details shared",
    visit_confirmed: "Visit confirmed",
    call_back:       "Will call back",
    not_interested:  "Not interested",
    negotiating:     "In negotiation",
    converted:       "Deal closed",
    not_answered:    "Did not answer",
    other:           "Other",
  };
  return map[outcome] || outcome || "";
}

export default function Timeline({ interactions = [], loading }) {
  if (loading) {
    return <p className={styles.empty}>Loading history…</p>;
  }
  if (!interactions.length) {
    return <p className={styles.empty}>No interactions yet. Log your first call.</p>;
  }

  return (
    <div className={styles.timeline}>
      {interactions.map((item, i) => {
        const meta = TYPE_META[item.type] || TYPE_META.note;
        const IconComponent = meta.icon;
        return (
          <div key={item.id || i} className={styles.item}>
            <div className={styles.iconWrap} style={{ background: meta.color + "20" }}>
              <IconComponent size={16} style={{ color: meta.color }} />
            </div>
            <div className={styles.body}>
              <div className={styles.topRow}>
                <span className={styles.typeLabel} style={{ color: meta.color }}>{meta.label}</span>
                <span className={styles.time}>{formatTimelineDate(item.createdAt)}</span>
              </div>
              {item.outcome && item.outcome !== "not_answered" && (
                <p className={styles.outcome}>{outcomeLabel(item.outcome)}</p>
              )}
              {item.notes && <p className={styles.notes}>{item.notes}</p>}
              {item.followUpSet && (
                <p className={styles.fuTag}>
                  <Calendar size={12} /> Follow-up set: {item.followUpSet}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
