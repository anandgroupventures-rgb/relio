"use client";
export const dynamic = 'force-dynamic';
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getLead, deleteLead, addInteraction, getInteractions } from "@/lib/firebase/leads";
import { useAuth } from "@/lib/hooks/useAuth";
import { useLeads } from "@/lib/hooks/useLeads";
import { getTempStyle, getStatusColor, getStatusLabel } from "@/lib/utils/leadHelpers";
import { formatFollowUp, isOverdue } from "@/lib/utils/dateHelpers";
import LeadForm from "@/components/leads/LeadForm";
import PostCallSheet from "@/components/leads/PostCallSheet";
import Timeline from "@/components/leads/Timeline";
import BottomSheet from "@/components/shared/BottomSheet";
import styles from "./detail.module.css";

export default function LeadDetailPage() {
  const { id }    = useParams();
  const router    = useRouter();
  const { user }  = useAuth();
  const { leads } = useLeads();

  const [lead,         setLead]         = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showEdit,     setShowEdit]     = useState(false);
  const [showPostCall, setShowPostCall] = useState(false);
  const [showDelete,   setShowDelete]   = useState(false);
  const [showAddNote,  setShowAddNote]  = useState(false);
  const [note,         setNote]         = useState("");
  const [activeTab,    setActiveTab]    = useState("details");

  async function fetchAll() {
    setLoading(true);
    try {
      const [l, ints] = await Promise.all([
        getLead(user.uid, id),
        getInteractions(user.uid, id),
      ]);
      setLead(l);
      setInteractions(ints);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { if (user && id) fetchAll(); }, [user, id]);

  async function handleDelete() {
    await deleteLead(user.uid, id);
    router.replace("/leads");
  }

  async function handleAddNote() {
    if (!note.trim()) return;
    await addInteraction(user.uid, id, { type: "note", notes: note.trim() });
    setNote(""); setShowAddNote(false);
    fetchAll();
  }

  function handleCall() {
    window.open(`tel:${lead.mobile}`, "_self");
    setShowPostCall(true);
  }
  function handleWA() {
    const msg = encodeURIComponent(`Hi ${lead.name}, `);
    window.open(`https://wa.me/91${lead.mobile?.replace(/\D/g,"")}?text=${msg}`, "_blank");
  }

  if (loading || !lead) {
    return (
      <div className={styles.loading}>
        <div className="spinner" />
      </div>
    );
  }

  const temp     = getTempStyle(lead.temperature || "cold");
  const fu       = formatFollowUp(lead.followUpDate);
  const overdue  = isOverdue(lead.followUpDate);

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.back()}>←</button>
        <div className={styles.headerInfo}>
          <h1 className={styles.headerName}>{lead.name}</h1>
          <span className={styles.headerSub}>{lead.mobile}</span>
        </div>
        <button className={styles.editBtn} onClick={() => setShowEdit(true)}>Edit</button>
      </header>

      {/* Temperature + status strip */}
      <div className={styles.strip} style={{ background: temp.bg, borderColor: temp.border }}>
        <span className={styles.tempLabel} style={{ color: temp.border }}>
          {temp.label}
        </span>
        <span className={styles.statusLabel} style={{ color: getStatusColor(lead.status) }}>
          {getStatusLabel(lead.status) || "New"}
        </span>
        {fu && (
          <span className={styles.fuLabel}
            style={{ color: overdue ? "var(--relio-danger)" : "var(--relio-gold)" }}>
            {overdue ? "⚠ OVERDUE" : "📅"} {fu}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className={styles.actions}>
        <button className={`${styles.actionBtn} ${styles.callBtn}`} onClick={handleCall}>
          📞 Call
        </button>
        <button className={`${styles.actionBtn} ${styles.waBtn}`} onClick={handleWA}>
          💬 WhatsApp
        </button>
        <button className={`${styles.actionBtn} ${styles.noteBtn}`} onClick={() => setShowAddNote(true)}>
          📝 Note
        </button>
        <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => setShowDelete(true)}>
          🗑
        </button>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {["details", "timeline"].map(t => (
          <button key={t}
            className={`${styles.tab} ${activeTab === t ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(t)}>
            {t === "details" ? "Details" : `Timeline (${interactions.length})`}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "details" && (
        <div className={styles.details}>
          <DetailRow label="Mobile"           value={lead.mobile} />
          {lead.email          && <DetailRow label="Email"            value={lead.email} />}
          {lead.type           && <DetailRow label="Looking to"       value={lead.type} />}
          {lead.bhk            && <DetailRow label="Configuration"    value={lead.bhk} />}
          {lead.projectInterest&& <DetailRow label="Project / Area"   value={lead.projectInterest} />}
          {lead.budget         && <DetailRow label="Budget"           value={lead.budget} />}
          {lead.source         && <DetailRow label="Lead Source"      value={lead.source} />}
          {lead.referredBy     && <DetailRow label="Referred By"      value={lead.referredBy} />}
          {lead.followUpDate   && <DetailRow label="Follow-up"        value={fu} highlight={overdue} />}
          {lead.remarks        && <DetailRow label="Remarks"          value={lead.remarks} multiLine />}
        </div>
      )}

      {activeTab === "timeline" && (
        <div className={styles.timelineWrap}>
          <Timeline interactions={interactions} />
        </div>
      )}

      {/* Edit sheet */}
      <BottomSheet open={showEdit} onClose={() => setShowEdit(false)} title="Edit Lead" tall>
        <LeadForm lead={lead} leads={leads}
          onDone={() => { setShowEdit(false); fetchAll(); }}
          onCancel={() => setShowEdit(false)} />
      </BottomSheet>

      {/* Post-call */}
      <PostCallSheet lead={lead} open={showPostCall}
        onClose={() => setShowPostCall(false)}
        onDone={() => { setShowPostCall(false); fetchAll(); }} />

      {/* Add note sheet */}
      <BottomSheet open={showAddNote} onClose={() => setShowAddNote(false)} title="Add Note">
        <div style={{ padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
          <textarea className="relio-input" rows={4} placeholder="What happened? Key info about this lead…"
            value={note} onChange={e => setNote(e.target.value)}
            style={{ resize: "none" }} autoFocus />
          <button className="relio-btn relio-btn-primary" onClick={handleAddNote}
            style={{ width: "100%" }}>Save Note</button>
        </div>
      </BottomSheet>

      {/* Delete confirm */}
      <BottomSheet open={showDelete} onClose={() => setShowDelete(false)} title="Delete Lead">
        <div style={{ padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 15, color: "var(--relio-text)" }}>
            Delete <strong>{lead.name}</strong> and all their interaction history? This cannot be undone.
          </p>
          <button className="relio-btn relio-btn-danger" onClick={handleDelete}
            style={{ width: "100%" }}>Delete Lead</button>
          <button className="relio-btn relio-btn-ghost" onClick={() => setShowDelete(false)}
            style={{ width: "100%" }}>Cancel</button>
        </div>
      </BottomSheet>
    </div>
  );
}

function DetailRow({ label, value, highlight, multiLine }) {
  return (
    <div style={{
      display: multiLine ? "block" : "flex",
      justifyContent: "space-between",
      alignItems: multiLine ? undefined : "flex-start",
      padding: "12px 20px",
      borderBottom: "1px solid var(--relio-border)",
      gap: 12,
    }}>
      <span style={{ fontSize: 13, color: "var(--relio-text-muted)", fontWeight: 600, flexShrink: 0 }}>
        {label}
      </span>
      <span style={{
        fontSize: 14, color: highlight ? "var(--relio-danger)" : "var(--relio-text)",
        fontWeight: highlight ? 700 : 400, textAlign: "right",
        marginTop: multiLine ? 4 : 0, lineHeight: 1.5,
      }}>
        {value}
      </span>
    </div>
  );
}
