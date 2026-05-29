"use client";
import { useState, useEffect, useRef } from "react";
import { addInventory, updateInventory } from "@/lib/firebase/inventory";
import { useAuth } from "@/lib/hooks/useAuth";
import { INVENTORY_TYPES, BHK_OPTIONS, AVAILABILITY } from "@/lib/utils/constants";
import styles from "./InvForm.module.css";

const FURNISHING = ["Furnished", "Semi-Furnished", "Unfurnished"];
const PARKING = ["1 Covered", "2 Covered", "Open", "No Parking"];
const FACING = ["North", "South", "East", "West", "North-East", "North-West", "South-East", "South-West"];
const PROPERTY_AGE = ["New Construction", "0-2 Years", "2-5 Years", "5-10 Years", "10+ Years"];

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
    floorNumber:  item?.floorNumber  || "",
    totalFloors:  item?.totalFloors  || "",
    ownerName:    item?.ownerName    || "",
    ownerMobile:  item?.ownerMobile  || "",
    price:        item?.price        || "",
    pricePerSqft: item?.pricePerSqft || "",
    maintenance:  item?.maintenance  || "",
    availability: item?.availability || "available",
    builderName:  item?.builderName  || "",
    reraNumber:   item?.reraNumber   || "",
    furnishing:   item?.furnishing   || "",
    parking:      item?.parking      || "",
    facing:       item?.facing       || "",
    possessionDate: item?.possessionDate || "",
    propertyAge:  item?.propertyAge  || "",
    remarks:      item?.remarks      || "",
  });
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState("");

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

      <Row label="Builder / Developer">
        <input className="relio-input" placeholder="DLF, Smartworld, etc."
          value={form.builderName} onChange={set("builderName")} />
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

      <div className={styles.twoCol}>
        <Row label="Floor Number">
          <input className="relio-input" placeholder="12"
            value={form.floorNumber} onChange={set("floorNumber")} />
        </Row>
        <Row label="Total Floors">
          <input className="relio-input" placeholder="25"
            value={form.totalFloors} onChange={set("totalFloors")} />
        </Row>
      </div>

      <Row label="Area / Location">
        <input className="relio-input" placeholder="Sector 65, Gurgaon"
          value={form.area} onChange={set("area")} />
      </Row>

      <div className={styles.twoCol}>
        <Row label="Price">
          <input className="relio-input" placeholder="₹2.2Cr"
            value={form.price} onChange={set("price")} />
        </Row>
        <Row label="Price per sqft">
          <input className="relio-input" placeholder="₹8,500"
            value={form.pricePerSqft} onChange={set("pricePerSqft")} />
        </Row>
      </div>

      <Row label="Monthly Maintenance">
        <input className="relio-input" placeholder="₹3,500/month"
          value={form.maintenance} onChange={set("maintenance")} />
      </Row>

      <div className={styles.twoCol}>
        <Row label="Owner Name *">
          <input className="relio-input" placeholder="Surender Singh"
            value={form.ownerName} onChange={set("ownerName")} />
        </Row>
        <Row label="Owner Mobile *">
          <input className="relio-input" placeholder="98xxxxxxxx" type="tel"
            value={form.ownerMobile} onChange={set("ownerMobile")} />
        </Row>
      </div>

      <Row label="RERA Number">
        <input className="relio-input" placeholder="HRERA-2024-1234"
          value={form.reraNumber} onChange={set("reraNumber")} />
      </Row>

      <Row label="Furnishing">
        <div className={styles.chips}>
          {FURNISHING.map(f => (
            <button key={f} type="button"
              className={`${styles.chip} ${form.furnishing === f ? styles.chipActive : ""}`}
              onClick={() => setVal("furnishing", form.furnishing === f ? "" : f)}>{f}</button>
          ))}
        </div>
      </Row>

      <Row label="Parking">
        <div className={styles.chips}>
          {PARKING.map(p => (
            <button key={p} type="button"
              className={`${styles.chip} ${form.parking === p ? styles.chipActive : ""}`}
              onClick={() => setVal("parking", form.parking === p ? "" : p)}>{p}</button>
          ))}
        </div>
      </Row>

      <Row label="Facing">
        <div className={styles.chips}>
          {FACING.map(f => (
            <button key={f} type="button"
              className={`${styles.chip} ${form.facing === f ? styles.chipActive : ""}`}
              onClick={() => setVal("facing", form.facing === f ? "" : f)}>{f}</button>
          ))}
        </div>
      </Row>

      <Row label="Property Age">
        <select className="relio-input" value={form.propertyAge} onChange={set("propertyAge")}>
          <option value="">Select age…</option>
          {PROPERTY_AGE.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </Row>

      <Row label="Possession Date">
        <input className="relio-input" type="date"
          value={form.possessionDate} onChange={set("possessionDate")} />
      </Row>

      <Row label="Availability">
        <select className="relio-input" value={form.availability} onChange={set("availability")}>
          {AVAILABILITY.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
      </Row>

      <Row label="Remarks">
        <textarea className={`relio-input ${styles.textarea}`} rows={3}
          placeholder="Owner flexible on price, prefers calls after 6pm, ready to move…"
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
