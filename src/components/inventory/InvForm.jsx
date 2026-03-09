"use client";
import { useState, useEffect, useRef } from "react";
import { addInventory, updateInventory } from "@/lib/firebase/inventory";
import { useAuth } from "@/lib/hooks/useAuth";
import { INVENTORY_TYPES, BHK_OPTIONS, AVAILABILITY } from "@/lib/utils/constants";
import styles from "./InvForm.module.css";

// ─── CRITICAL FIX: Row is defined OUTSIDE the component ──────────────────────
// When Row was defined inside InvForm, React saw it as a NEW component on every
// re-render (new function reference). This caused React to unmount + remount the
// input fields on every keystroke, making focus jump back to the first field
// after typing just one character in any other field.
function Row({ label, children }) {
  return (
    <div className={styles.row}>
      <label className={styles.label}>{label}</label>
      {children}
    </div>
  );
}

export default function InvForm({ item, onDone, onCancel }) {
  const { user } = useAuth();
  const isEdit   = !!item;
  const firstRef = useRef(null);

  const [form, setForm] = useState({
    projectName:  item?.projectName  || "",
    type:         item?.type         || "Sale",
    bhk:          item?.bhk          || "",
    size:         item?.size         || "",
    area:         item?.area         || "",
    unit:         item?.unit         || "",
    ownerName:    item?.ownerName    || "",
    ownerMobile:  item?.ownerMobile  || "",
    price:        item?.price        || "",
    pricePerSqft: item?.pricePerSqft || "",
    availability: item?.availability || "available",
    remarks:      item?.remarks      || "",
  });
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState("");

  // Focus first field ONCE on mount only
  useEffect(() => {
    const t = setTimeout(() => firstRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line

  const set    = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setVal = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.projectName.trim()) { setError("Project name is required"); return; }
    if (!form.ownerName.trim())   { setError("Owner name is required");   return; }
    if (!form.ownerMobile.trim()) { setError("Owner mobile is required"); return; }
    if (!user?.uid)               { setError("Not signed in — please refresh and sign in again."); return; }
    setError(""); setBusy(true);
    try {
      const data = { ...form, projectName: form.projectName.trim() };
      if (isEdit) await updateInventory(user.uid, item.id, data);
      else        await addInventory(user.uid, data);
      onDone?.();
    } catch (err) {
      console.error("InvForm save error:", err);
      const code = err?.code || "";
      if (code === "permission-denied")    setError("Firebase permission denied — check Firestore rules are deployed.");
      else if (code === "unavailable")     setError("No internet connection. Please try again.");
      else if (code === "unauthenticated") setError("Session expired — please sign out and sign back in.");
      else setError(err?.message || "Failed to save. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.form}>

      <Row label="Project Name *">
        <input ref={firstRef} className="relio-input" placeholder="Smartworld Gems"
          value={form.projectName} onChange={set("projectName")} />
      </Row>

      <Row label="Type">
        <div className={styles.chips}>
          {INVENTORY_TYPES.map(t => (
            <button key={t} type="button"
              className={`${styles.chip} ${form.type === t ? styles.chipActive : ""}`}
              onClick={() => setVal("type", t)}>{t}</button>
          ))}
        </div>
      </Row>

      {/* FIX #7: Show ALL BHK options including Plot/Land & Commercial
          Previously .slice(0,6) cut off the last 4 options */}
      <Row label="Configuration">
        <div className={styles.chips}>
          {BHK_OPTIONS.map(b => (
            <button key={b} type="button"
              className={`${styles.chip} ${form.bhk === b ? styles.chipActive : ""}`}
              onClick={() => setVal("bhk", form.bhk === b ? "" : b)}>{b}</button>
          ))}
        </div>
      </Row>

      <div className={styles.twoCol}>
        <Row label="Size (sqft)">
          <input className="relio-input" placeholder="1200" type="number"
            value={form.size} onChange={set("size")} />
        </Row>
        <Row label="Unit / Floor">
          <input className="relio-input" placeholder="A-1204"
            value={form.unit} onChange={set("unit")} />
        </Row>
      </div>

      <Row label="Area / Location">
        <input className="relio-input" placeholder="Sector 65, Gurgaon"
          value={form.area} onChange={set("area")} />
      </Row>

      <Row label="Price">
        <input className="relio-input" placeholder="₹2.2Cr / ₹45,000/month"
          value={form.price} onChange={set("price")} />
      </Row>

      <Row label="Price per sqft (optional)">
        <input className="relio-input" placeholder="₹8,500"
          value={form.pricePerSqft} onChange={set("pricePerSqft")} />
      </Row>

      <Row label="Owner Name *">
        <input className="relio-input" placeholder="Surender Singh"
          value={form.ownerName} onChange={set("ownerName")} />
      </Row>

      <Row label="Owner Mobile *">
        <input className="relio-input" placeholder="98xxxxxxxx" type="tel"
          value={form.ownerMobile} onChange={set("ownerMobile")} />
      </Row>

      <Row label="Availability">
        <select className="relio-input" value={form.availability} onChange={set("availability")}>
          {AVAILABILITY.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
      </Row>

      <Row label="Remarks">
        <textarea className={`relio-input ${styles.textarea}`} rows={3}
          placeholder="Owner flexible on price, prefers calls after 6pm…"
          value={form.remarks} onChange={set("remarks")} />
      </Row>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.buttons}>
        {onCancel && (
          <button type="button" className="relio-btn relio-btn-ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
        <button type="button" className="relio-btn relio-btn-primary" onClick={handleSave}
          disabled={busy} style={{ flex: 1 }}>
          {busy ? "Saving…" : isEdit ? "Save Changes" : "Add Property"}
        </button>
      </div>
    </div>
  );
}
