"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { addLead } from "@/lib/firebase/leads";
import { LEAD_STATUSES, LEAD_SOURCES, BHK_OPTIONS } from "@/lib/utils/constants";
import { ArrowLeft, Save, User, Home, UserCheck } from "lucide-react";
import styles from "./new.module.css";

const LEAD_TYPES = ["Buyer", "Seller", "Tenant", "Landlord"];

const PRIORITIES = [
  { value: "hot", label: "Hot", color: "var(--r-error)" },
  { value: "warm", label: "Warm", color: "var(--r-secondary-container)" },
  { value: "cold", label: "Cold", color: "var(--r-outline)" },
];

const TIMELINES = ["Immediate", "Within 3 months", "3 - 6 months", "6 - 12 months", "Ready to Wait"];

function getBudgetLabel(type) {
  switch (type) {
    case "Buyer":    return "Budget (in Crores)";
    case "Seller":   return "Asking Price (in Crores)";
    case "Tenant":   return "Monthly Budget (in Thousands)";
    case "Landlord": return "Expected Rent (in Thousands)";
    default:         return "Budget";
  }
}

function getBudgetPlaceholder(type) {
  switch (type) {
    case "Buyer":    return "e.g. 1.5 Cr";
    case "Seller":   return "e.g. 2.5 Cr";
    case "Tenant":   return "e.g. ₹40k/month";
    case "Landlord": return "e.g. ₹35k/month";
    default:         return "Budget";
  }
}

export default function NewLeadPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [form, setForm] = useState({
    name: "", mobile: "", email: "", locality: "",
    leadType: "Buyer", bhk: "", budget: "", timeline: "Immediate",
    source: "Referral", assignedTo: "Self", priority: "warm",
    projectInterest: "", remarks: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setVal = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required"); return; }
    if (!form.mobile.trim()) { setError("Mobile is required"); return; }
    if (!user?.uid) { setError("Not signed in"); return; }
    setError(""); setBusy(true);
    try {
      await addLead(user.uid, {
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        email: form.email,
        type: form.leadType,
        bhk: form.bhk,
        budget: form.budget,
        source: form.source,
        status: "new",
        priority: form.priority,
        projectInterest: form.projectInterest || form.locality,
        remarks: form.remarks,
        followUpDate: "",
      });
      router.push("/leads");
    } catch (err) {
      setError(err?.message || "Failed to save");
      setBusy(false);
    }
  }

  const budgetLabel = getBudgetLabel(form.leadType);
  const budgetPlaceholder = getBudgetPlaceholder(form.leadType);

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push("/leads")}>
          <ArrowLeft size={22} color="var(--r-primary)" />
        </button>
        <h1 className="text-headline-md" style={{ color: "var(--r-primary)" }}>Add New Lead</h1>
      </header>

      <main className={styles.main}>
        <form id="add-lead-form" onSubmit={handleSubmit}>
          {/* Lead Classification */}
          <section className={styles.section}>
            <h2 className="text-label-md" style={{ color: "var(--r-outline)", marginBottom: 12 }}>Lead Classification</h2>
            <div className={styles.segmentGroup}>
              {LEAD_TYPES.map(t => (
                <label key={t} className={styles.segmentLabel}>
                  <input type="radio" name="leadType" value={t} checked={form.leadType === t} onChange={set("leadType")} className={styles.segmentInput} />
                  <div className={`${styles.segmentPill} ${form.leadType === t ? styles.segmentActive : ""}`}>{t}</div>
                </label>
              ))}
            </div>
          </section>

          {/* Personal Details */}
          <section className={`r-card ${styles.formCard}`}>
            <div className={styles.cardTitle}>
              <User size={20} color="var(--r-primary)" />
              <h2 className="text-headline-md">Personal Details</h2>
            </div>
            <div className={styles.grid2}>
              <div className={styles.field}>
                <label className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>Full Name</label>
                <input className="r-input" placeholder="e.g. Rahul Sharma" value={form.name} onChange={set("name")} required />
              </div>
              <div className={styles.field}>
                <label className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>Phone Number</label>
                <div className={styles.phoneWrap}>
                  <span className={styles.phonePrefix}>+91</span>
                  <input className="r-input" placeholder="98765 43210" type="tel" value={form.mobile} onChange={set("mobile")} required />
                </div>
              </div>
              <div className={styles.field}>
                <label className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>Email Address</label>
                <input className="r-input" placeholder="rahul.s@example.com" type="email" value={form.email} onChange={set("email")} />
              </div>
              <div className={styles.field}>
                <label className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>City & Locality</label>
                <div className={styles.searchWrap}>
                  <input className="r-input" placeholder="Search locality..." value={form.locality} onChange={set("locality")} />
                </div>
              </div>
            </div>
          </section>

          {/* Requirement Details */}
          <section className={`r-card ${styles.formCard}`}>
            <div className={styles.cardTitle}>
              <Home size={20} color="var(--r-primary)" />
              <h2 className="text-headline-md">Requirement Details</h2>
            </div>

            <div className={styles.field}>
              <label className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>Property Type</label>
              <div className={styles.chipsWrap}>
                {BHK_OPTIONS.map(b => (
                  <button key={b} type="button" className={`r-chip ${form.bhk === b ? "r-chip-active" : ""}`} onClick={() => setVal("bhk", form.bhk === b ? "" : b)}>
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field} style={{ marginTop: 16 }}>
              <label className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>{budgetLabel}</label>
              <input
                className="r-input"
                placeholder={budgetPlaceholder}
                value={form.budget}
                onChange={set("budget")}
              />
            </div>

            <div className={styles.field} style={{ marginTop: 16 }}>
              <label className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>Possession Timeline</label>
              <select className="r-input" value={form.timeline} onChange={set("timeline")}>
                {TIMELINES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className={styles.field} style={{ marginTop: 16 }}>
              <label className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>Project / Area Interest</label>
              <input className="r-input" placeholder="Smartworld Gems, Dwarka..." value={form.projectInterest} onChange={set("projectInterest")} />
            </div>
          </section>

          {/* Lead Assignment */}
          <section className={`r-card ${styles.formCard}`}>
            <div className={styles.cardTitle}>
              <UserCheck size={20} color="var(--r-primary)" />
              <h2 className="text-headline-md">Lead Assignment</h2>
            </div>
            <div className={styles.grid2}>
              <div className={styles.field}>
                <label className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>Lead Source</label>
                <select className="r-input" value={form.source} onChange={set("source")}>
                  {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>Assigned To</label>
                <div className={styles.assignWrap}>
                  <div className={styles.assignAvatar}>AS</div>
                  <select className={`r-input ${styles.assignSelect}`} value={form.assignedTo} onChange={set("assignedTo")}>
                    <option>Self</option>
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.field} style={{ marginTop: 16 }}>
              <label className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>Priority Status</label>
              <div className={styles.priorityGroup}>
                {PRIORITIES.map(p => (
                  <label key={p.value} className={styles.priorityLabel}>
                    <input type="radio" name="priority" value={p.value} checked={form.priority === p.value} onChange={set("priority")} className={styles.priorityInput} />
                    <div className={`${styles.priorityPill} ${form.priority === p.value ? styles.priorityActive : ""}`} style={form.priority === p.value ? { background: p.color, color: "#fff" } : {}}>
                      {p.label}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </section>

          {error && <p className={styles.error}>{error}</p>}
        </form>
      </main>

      {/* Fixed Footer — positioned above bottom nav */}
      <footer className={styles.footer}>
        <button className={`r-btn r-btn-primary ${styles.saveBtn}`} form="add-lead-form" type="submit" disabled={busy}>
          <Save size={18} />
          {busy ? "Saving..." : "Save Lead"}
        </button>
      </footer>
    </div>
  );
}
