"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { addInventory } from "@/lib/firebase/inventory";
import { INVENTORY_TYPES, BHK_OPTIONS, AVAILABILITY } from "@/lib/utils/constants";
import { ArrowLeft, Save, Building2, Home, Contact, Banknote, FileText } from "lucide-react";
import styles from "./new.module.css";

const FURNISHING = ["Furnished", "Semi-Furnished", "Unfurnished"];
const PARKING = ["1 Covered", "2 Covered", "Open", "No Parking"];
const FACING = ["North", "South", "East", "West", "North-East", "North-West", "South-East", "South-West"];
const PROPERTY_AGE = ["New Construction", "0-2 Years", "2-5 Years", "5-10 Years", "10+ Years"];

export default function NewInventoryPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [form, setForm] = useState({
    projectName: "", type: "Sale", bhk: "", size: "", area: "", unit: "",
    floorNumber: "", totalFloors: "", ownerName: "", ownerMobile: "",
    price: "", pricePerSqft: "", maintenance: "", availability: "available",
    builderName: "", reraNumber: "", furnishing: "", parking: "", facing: "",
    possessionDate: "", propertyAge: "", remarks: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setVal = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.projectName.trim()) { setError("Project name is required"); return; }
    if (!form.ownerName.trim())   { setError("Owner name is required");   return; }
    if (!form.ownerMobile.trim()) { setError("Owner mobile is required"); return; }
    if (!user?.uid) { setError("Not signed in"); return; }
    setError(""); setBusy(true);
    try {
      await addInventory(user.uid, form);
      router.push("/inventory");
    } catch (err) {
      setError(err?.message || "Failed to save");
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push("/inventory")}>
          <ArrowLeft size={22} color="var(--r-primary)" />
        </button>
        <h1 className="text-headline-md" style={{ color: "var(--r-primary)" }}>Add Property</h1>
      </header>

      <main className={styles.main}>
        <form id="add-inventory-form" onSubmit={handleSubmit}>
          {/* Project Info */}
          <section className={`r-card ${styles.formCard}`}>
            <div className={styles.cardTitle}>
              <Building2 size={20} color="var(--r-primary)" />
              <h2 className="text-headline-md">Project Info</h2>
            </div>
            <div className={styles.grid2}>
              <div className={styles.field}>
                <label className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>Project Name *</label>
                <input className="r-input" placeholder="e.g. Smartworld Gems" value={form.projectName} onChange={set("projectName")} required />
              </div>
              <div className={styles.field}>
                <label className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>Builder / Developer</label>
                <input className="r-input" placeholder="e.g. DLF" value={form.builderName} onChange={set("builderName")} />
              </div>
              <div className={styles.field}>
                <label className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>Type</label>
                <div className={styles.segmentGroup}>
                  {INVENTORY_TYPES.map(t => (
                    <label key={t} className={styles.segmentLabel}>
                      <input type="radio" name="type" value={t} checked={form.type === t} onChange={set("type")} className={styles.segmentInput} />
                      <div className={`${styles.segmentPill} ${form.type === t ? styles.segmentActive : ""}`}>{t}</div>
                    </label>
                  ))}
                </div>
              </div>
              <div className={styles.field}>
                <label className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>RERA Number</label>
                <input className="r-input" placeholder="HRERA-2024-1234" value={form.reraNumber} onChange={set("reraNumber")} />
              </div>
            </div>
          </section>

          {/* Property Details */}
          <section className={`r-card ${styles.formCard}`}>
            <div className={styles.cardTitle}>
              <Home size={20} color="var(--r-primary)" />
              <h2 className="text-headline-md">Property Details</h2>
            </div>
            <div className={styles.field}>
              <label className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>Configuration</label>
              <div className={styles.chipsWrap}>
                {BHK_OPTIONS.map(b => (
                  <button key={b} type="button" className={`r-chip ${form.bhk === b ? "r-chip-active" : ""}`} onClick={() => setVal("bhk", form.bhk === b ? "" : b)}>
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.grid2} style={{ marginTop: 16 }}>
              <div className={styles.field}>
                <label className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>Size (sqft)</label>
                <input className="r-input" placeholder="1200" type="number" value={form.size} onChange={set("size")} />
              </div>
              <div className={styles.field}>
                <label className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>Unit / Floor</label>
                <input className="r-input" placeholder="A-1204" value={form.unit} onChange={set("unit")} />
              </div>
              <div className={styles.field}>
                <label className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>Floor Number</label>
                <input className="r-input" placeholder="12" value={form.floorNumber} onChange={set("floorNumber")} />
              </div>
              <div className={styles.field}>
                <label className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>Total Floors</label>
                <input className="r-input" placeholder="25" value={form.totalFloors} onChange={set("totalFloors")} />
              </div>
            </div>

            <div className={styles.field} style={{ marginTop: 16 }}>
              <label className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>Area / Location</label>
              <input className="r-input" placeholder="Sector 65, Gurgaon" value={form.area} onChange={set("area")} />
            </div>

            <div className={styles.grid3} style={{ marginTop: 16 }}>
              <div className={styles.field}>
                <label className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>Furnishing</label>
                <select className="r-input" value={form.furnishing} onChange={set("furnishing")}>
                  <option value="">Select…</option>
                  {FURNISHING.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>Parking</label>
                <select className="r-input" value={form.parking} onChange={set("parking")}>
                  <option value="">Select…</option>
                  {PARKING.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>Facing</label>
                <select className="r-input" value={form.facing} onChange={set("facing")}>
                  <option value="">Select…</option>
                  {FACING.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>

            <div className={styles.grid2} style={{ marginTop: 16 }}>
              <div className={styles.field}>
                <label className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>Property Age</label>
                <select className="r-input" value={form.propertyAge} onChange={set("propertyAge")}>
                  <option value="">Select…</option>
                  {PROPERTY_AGE.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>Possession Date</label>
                <input className="r-input" type="date" value={form.possessionDate} onChange={set("possessionDate")} />
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section className={`r-card ${styles.formCard}`}>
            <div className={styles.cardTitle}>
              <Banknote size={20} color="var(--r-primary)" />
              <h2 className="text-headline-md">Pricing</h2>
            </div>
            <div className={styles.grid2}>
              <div className={styles.field}>
                <label className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>Price</label>
                <input className="r-input" placeholder="₹2.2Cr / ₹45k/month" value={form.price} onChange={set("price")} />
              </div>
              <div className={styles.field}>
                <label className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>Price per sqft</label>
                <input className="r-input" placeholder="₹8,500" value={form.pricePerSqft} onChange={set("pricePerSqft")} />
              </div>
              <div className={styles.field}>
                <label className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>Monthly Maintenance</label>
                <input className="r-input" placeholder="₹3,500/month" value={form.maintenance} onChange={set("maintenance")} />
              </div>
              <div className={styles.field}>
                <label className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>Availability</label>
                <select className="r-input" value={form.availability} onChange={set("availability")}>
                  {AVAILABILITY.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Owner Contact */}
          <section className={`r-card ${styles.formCard}`}>
            <div className={styles.cardTitle}>
              <Contact size={20} color="var(--r-primary)" />
              <h2 className="text-headline-md">Owner Contact</h2>
            </div>
            <div className={styles.grid2}>
              <div className={styles.field}>
                <label className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>Owner Name *</label>
                <input className="r-input" placeholder="Surender Singh" value={form.ownerName} onChange={set("ownerName")} required />
              </div>
              <div className={styles.field}>
                <label className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>Owner Mobile *</label>
                <div className={styles.phoneWrap}>
                  <span className={styles.phonePrefix}>+91</span>
                  <input className="r-input" placeholder="98765 43210" type="tel" value={form.ownerMobile} onChange={set("ownerMobile")} required />
                </div>
              </div>
            </div>
          </section>

          {/* Remarks */}
          <section className={`r-card ${styles.formCard}`}>
            <div className={styles.cardTitle}>
              <FileText size={20} color="var(--r-primary)" />
              <h2 className="text-headline-md">Remarks</h2>
            </div>
            <textarea className="r-input" rows={3} placeholder="Owner flexible on price, prefers calls after 6pm, ready to move…"
              value={form.remarks} onChange={set("remarks")} />
          </section>

          {error && <p className={styles.error}>{error}</p>}
        </form>
      </main>

      {/* Fixed Footer */}
      <footer className={styles.footer}>
        <button className={`r-btn r-btn-primary ${styles.saveBtn}`} form="add-inventory-form" type="submit" disabled={busy}>
          <Save size={18} />
          {busy ? "Saving..." : "Save Property"}
        </button>
      </footer>
    </div>
  );
}
