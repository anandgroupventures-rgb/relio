"use client";
import { useState, useEffect, useRef } from "react";
import { addLead, updateLead } from "@/lib/firebase/leads";
import { useAuth } from "@/lib/hooks/useAuth";
import { findDuplicate } from "@/lib/utils/leadHelpers";
import { todayStr } from "@/lib/utils/dateHelpers";
import { LEAD_STATUSES, LEAD_SOURCES, LEAD_TYPES, BHK_OPTIONS } from "@/lib/utils/constants";
import styles from "./LeadForm.module.css";

// ─── CRITICAL FIX: Row is defined OUTSIDE the component ──────────────────────
// When Row was defined inside LeadForm, React saw it as a NEW component on every
// re-render (because the function reference changed). This caused React to
// unmount + remount the inputs on every keystroke, making focus jump back to
// the first field after typing just one character in any other field.
function Row({ label, children }) {
  return (
    <div className={styles.row}>
      <label className={styles.label}>{label}</label>
      {children}
    </div>
  );
}

export default function LeadForm({ lead, leads = [], onDone, onCancel, quickMode = false }) {
  const { user } = useAuth();
  const isEdit   = !!lead;
  const firstRef = useRef(null);

  const [form, setForm] = useState({
    name:            lead?.name            || "",
    mobile:          lead?.mobile          || "",
    email:           lead?.email           || "",
    type:            lead?.type            || "Buy",
    projectInterest: lead?.projectInterest || "",
    budget:          lead?.budget          || "",
    source:          lead?.source          || "",
    status:          lead?.status          || "new",
    followUpDate:    lead?.followUpDate    || "",
    remarks:         lead?.remarks         || "",
    referredBy:      lead?.referredBy      || "",
    bhk:             lead?.bhk             || "",
  });
  const [busy,     setBusy]     = useState(false);
  const [error,    setError]    = useState("");
  const [dupLead,  setDupLead]  = useState(null);
  const [showFull, setShowFull] = useState(!quickMode);

  // Focus first field ONCE on mount only
  useEffect(() => {
    const t = setTimeout(() => firstRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line

  // Duplicate check — only runs when mobile changes
  useEffect(() => {
    const clean = form.mobile.replace(/\D/g, "");
    if (clean.length < 10) { setDupLead(null); return; }
    const dup = findDuplicate(leads, form.mobile, lead?.id);
    setDupLead(dup || null);
  }, [form.mobile]); // eslint-disable-line

  const set    = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setVal = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.name.trim())   { setError("Name is required");   return; }
    if (!form.mobile.trim()) { setError("Mobile is required"); return; }
    setError(""); setBusy(true);
    try {
      const data = { ...form, name: form.name.trim(), mobile: form.mobile.trim() };
      if (isEdit) await updateLead(user.uid, lead.id, data);
      else        await addLead(user.uid, data);
      onDone?.();
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.form}>

      <Row label="Name *">
        <input
          ref={firstRef}
          className="relio-input"
          placeholder="Vikrant Wadhwa"
          value={form.name}
          onChange={set("name")}
        />
      </Row>

      <Row label="Mobile *">
        <input
          className="relio-input"
          placeholder="98xxxxxxxx"
          type="tel"
          value={form.mobile}
          onChange={set("mobile")}
        />
        {dupLead && (
          <p className={styles.dupWarn}>
            ⚠ This number belongs to <strong>{dupLead.name}</strong> (already in your leads).
          </p>
        )}
      </Row>

      {quickMode && !showFull && (
        <button className={styles.expandBtn} type="button" onClick={() => setShowFull(true)}>
          + Add more details
        </button>
      )}

      {showFull && (
        <>
          <Row label="Looking to">
            <div className={styles.chips}>
              {LEAD_TYPES.map(t => (
                <button key={t} type="button"
                  className={`${styles.chip} ${form.type === t ? styles.chipActive : ""}`}
                  onClick={() => setVal("type", t)}>{t}</button>
              ))}
            </div>
          </Row>

          {/* FIX #7: Show ALL BHK options including Plot/Land & Commercial
              Previously used .slice(0,6) which cut off Plot/Land and Commercial */}
          <Row label="Configuration">
            <div className={styles.chips}>
              {BHK_OPTIONS.map(b => (
                <button key={b} type="button"
                  className={`${styles.chip} ${form.bhk === b ? styles.chipActive : ""}`}
                  onClick={() => setVal("bhk", form.bhk === b ? "" : b)}>{b}</button>
              ))}
            </div>
          </Row>

          <Row label="Project / Area Interest">
            <input className="relio-input" placeholder="Smartworld Gems, Dwarka Expressway…"
              value={form.projectInterest} onChange={set("projectInterest")} />
          </Row>

          <Row label="Budget">
            <input className="relio-input" placeholder="1.5–2cr / ₹40k/month"
              value={form.budget} onChange={set("budget")} />
          </Row>

          <Row label="Lead Source">
            <select className="relio-input" value={form.source} onChange={set("source")}>
              <option value="">Select source…</option>
              {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Row>

          <Row label="Status">
            <select className="relio-input" value={form.status} onChange={set("status")}>
              {LEAD_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Row>

          <Row label="Follow-up Date">
            <input className="relio-input" type="date" min={todayStr()}
              value={form.followUpDate} onChange={set("followUpDate")} />
          </Row>

          <Row label="Email (optional)">
            <input className="relio-input" type="email" placeholder="email@example.com"
              value={form.email} onChange={set("email")} />
          </Row>

          <Row label="Referred By (optional)">
            <input className="relio-input" placeholder="Rajesh Sharma"
              value={form.referredBy} onChange={set("referredBy")} />
          </Row>

          <Row label="Remarks">
            <textarea className={`relio-input ${styles.textarea}`}
              placeholder="Notes about this lead…"
              value={form.remarks} onChange={set("remarks")} rows={3} />
          </Row>
        </>
      )}

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.buttons}>
        {onCancel && (
          <button type="button" className="relio-btn relio-btn-ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
        <button type="button" className="relio-btn relio-btn-primary" onClick={handleSave}
          disabled={busy} style={{ flex: 1 }}>
          {busy ? "Saving…" : isEdit ? "Save Changes" : "Add Lead"}
        </button>
      </div>
    </div>
  );
}
