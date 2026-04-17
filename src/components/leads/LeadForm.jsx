"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { addLead, updateLead } from "@/lib/firebase/leads";
import { useAuth } from "@/lib/hooks/useAuth";
import { useToast } from "@/components/shared/Toast";
import { sanitizeLeadData, cleanMobile } from "@/lib/utils/security";
import { findDuplicate } from "@/lib/utils/leadHelpers";
import { calculateLeadScore, getTemperatureFromScore } from "@/lib/utils/leadScoring";
import { todayStr } from "@/lib/utils/dateHelpers";
import { 
  LEAD_STAGES, 
  LEAD_SOURCES, 
  LEAD_TYPES, 
  BHK_OPTIONS,
  LEAD_CATEGORIES,
  PROPERTY_TYPES,
  PURCHASE_TIMELINE,
  BUDGET_RANGES,
  FOLLOWUP_QUICK
} from "@/lib/utils/constants";
import { AlertTriangle, Thermometer, Star, Calendar, Home, DollarSign, Clock } from "lucide-react";
import styles from "./LeadForm.module.css";

// ─── Row Component ─────────────────────────────────────────────────────────────
function Row({ label, icon: Icon, children, optional = false }) {
  return (
    <div className={styles.row}>
      <label className={styles.label}>
        {Icon && <Icon size={14} />}
        {label}
        {optional && <span className={styles.optional}> (optional)</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Lead Score Display Component ───────────────────────────────────────────────
function LeadScoreDisplay({ score, temperature }) {
  const normalizedScore = Math.round((score + 100) / 2);
  
  return (
    <div className={styles.scoreDisplay}>
      <div className={styles.scoreHeader}>
        <Thermometer size={18} />
        <span>Lead Score</span>
        <span className={styles.scoreValue} style={{ color: temperature.color }}>
          {normalizedScore}/100
        </span>
      </div>
      <div className={styles.temperatureBadge} style={{ 
        background: temperature.color + '20',
        color: temperature.color,
        borderColor: temperature.color
      }}>
        {temperature.label} - {temperature.action}
      </div>
      <div className={styles.scoreBar}>
        <div 
          className={styles.scoreFill} 
          style={{ 
            width: `${normalizedScore}%`,
            background: temperature.color
          }}
        />
      </div>
    </div>
  );
}

export default function LeadForm({ lead, leads = [], onDone, onCancel, quickMode = false }) {
  const { user } = useAuth();
  const toast = useToast();
  const isEdit = !!lead;
  const firstRef = useRef(null);

  // Calculate lead score if editing
  const currentScore = useMemo(() => {
    if (!isEdit) return 10; // Default for new leads
    return calculateLeadScore(lead, lead.interactions || []);
  }, [lead, isEdit]);

  const currentTemperature = useMemo(() => {
    return getTemperatureFromScore(currentScore);
  }, [currentScore]);

  const [form, setForm] = useState({
    name: lead?.name || "",
    mobile: lead?.mobile || "",
    email: lead?.email || "",
    type: lead?.type || "Buy",
    propertyType: lead?.propertyType || "",
    projectInterest: lead?.projectInterest || "",
    areaInterest: lead?.areaInterest || "",
    budget: lead?.budget || "",
    budgetRange: lead?.budgetRange || "",
    source: lead?.source || "",
    category: lead?.category || "portal",
    stage: lead?.stage || lead?.status || "new",
    purchaseTimeline: lead?.purchaseTimeline || "",
    followUpDate: lead?.followUpDate || "",
    remarks: lead?.remarks || "",
    referredBy: lead?.referredBy || "",
    bhk: lead?.bhk || "",
    score: currentScore,
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dupLead, setDupLead] = useState(null);
  const [showFull, setShowFull] = useState(!quickMode);

  // Focus first field ONCE on mount
  useEffect(() => {
    const t = setTimeout(() => firstRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  // Duplicate check
  useEffect(() => {
    const clean = cleanMobile(form.mobile);
    if (clean.length < 10) { setDupLead(null); return; }
    const dup = findDuplicate(leads, form.mobile, lead?.id);
    setDupLead(dup || null);
  }, [form.mobile, leads, lead?.id]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setVal = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleQuickFollowup = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setVal("followUpDate", date.toISOString().split("T")[0]);
  };

  async function handleSave() {
    if (!form.name.trim()) { 
      toast.error("Name is required"); 
      setError("Name is required");
      return; 
    }
    if (!form.mobile.trim()) { 
      toast.error("Mobile is required");
      setError("Mobile is required"); 
      return; 
    }
    if (!user?.uid) { 
      toast.error("Not signed in — please refresh and sign in again.");
      setError("Not signed in"); 
      return; 
    }

    setError(""); 
    setBusy(true);

    try {
      // Calculate final score based on form data
      const scoreData = { ...form, score: currentScore };
      const finalScore = calculateLeadScore(scoreData);
      const temperature = getTemperatureFromScore(finalScore);

      // Sanitize data
      const data = sanitizeLeadData({ 
        ...form, 
        name: form.name.trim(), 
        mobile: cleanMobile(form.mobile),
        score: finalScore,
        temperature: temperature.label,
        lastContactDate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      if (isEdit) {
        await updateLead(user.uid, lead.id, data);
        toast.success(`Lead updated - ${temperature.label}`);
      } else {
        await addLead(user.uid, data);
        toast.success(`Lead added - ${temperature.label}`);
      }
      
      onDone?.();
    } catch (err) {
      console.error("LeadForm save error:", err);
      const errorMsg = err?.message || "Failed to save. Please try again.";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.form}>
      
      {/* Lead Score Display (only when editing) */}
      {isEdit && (
        <LeadScoreDisplay score={currentScore} temperature={currentTemperature} />
      )}

      <Row label="Name *" icon={Star}>
        <input
          ref={firstRef}
          className="relio-input"
          placeholder="Pooja Bhatia / Anirban Bhatia"
          value={form.name}
          onChange={set("name")}
        />
      </Row>

      <Row label="Mobile *" icon={AlertTriangle}>
        <input
          className="relio-input"
          placeholder="+91 9650070241"
          type="tel"
          value={form.mobile}
          onChange={set("mobile")}
        />
        {dupLead && (
          <p className={styles.dupWarn}>
            <AlertTriangle size={14} /> This number belongs to <strong>{dupLead.name}</strong>
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
          {/* Looking to - Buy/Rent */}
          <Row label="Looking to" icon={Home}>
            <div className={styles.chips}>
              {LEAD_TYPES.map(t => (
                <button key={t} type="button"
                  className={`${styles.chip} ${form.type === t ? styles.chipActive : ""}`}
                  onClick={() => setVal("type", t)}>
                  {t}
                </button>
              ))}
            </div>
          </Row>

          {/* Property Type */}
          <Row label="Property Type" icon={Home}>
            <select className="relio-input" value={form.propertyType} onChange={set("propertyType")}>
              <option value="">Select property type...</option>
              {PROPERTY_TYPES.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </Row>

          {/* Configuration */}
          <Row label="Configuration">
            <div className={styles.chips}>
              {BHK_OPTIONS.map(b => (
                <button key={b} type="button"
                  className={`${styles.chip} ${form.bhk === b ? styles.chipActive : ""}`}
                  onClick={() => setVal("bhk", form.bhk === b ? "" : b)}>
                  {b}
                </button>
              ))}
            </div>
          </Row>

          {/* Project / Area Interest */}
          <Row label="Project / Area Interest" icon={Home}>
            <input 
              className="relio-input" 
              placeholder="Near Delhi border, Smartworld Gems..."
              value={form.projectInterest} 
              onChange={set("projectInterest")} 
            />
          </Row>

          {/* Budget */}
          <Row label="Budget" icon={DollarSign}>
            <select 
              className="relio-input" 
              value={form.budgetRange} 
              onChange={(e) => {
                setVal("budgetRange", e.target.value);
                const selected = BUDGET_RANGES.find(b => b.value === e.target.value);
                if (selected && selected.value !== "custom") {
                  setVal("budget", selected.label);
                }
              }}
            >
              <option value="">Select budget range...</option>
              {BUDGET_RANGES.map(b => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
            {form.budgetRange === "custom" && (
              <input 
                className="relio-input" 
                style={{ marginTop: 8 }}
                placeholder="e.g., 3-4 Cr, 50-60 Lac"
                value={form.budget} 
                onChange={set("budget")} 
              />
            )}
          </Row>

          {/* Purchase Timeline */}
          <Row label="Purchase Timeline" icon={Clock}>
            <select className="relio-input" value={form.purchaseTimeline} onChange={set("purchaseTimeline")}>
              <option value="">When are they looking to buy?</option>
              {PURCHASE_TIMELINE.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Row>

          {/* Lead Category */}
          <Row label="Lead Category" icon={Star}>
            <div className={styles.categoryGrid}>
              {LEAD_CATEGORIES.map(cat => (
                <button 
                  key={cat.value} 
                  type="button"
                  className={`${styles.categoryChip} ${form.category === cat.value ? styles.categoryActive : ""}`}
                  style={{ 
                    borderColor: form.category === cat.value ? cat.color : undefined,
                    background: form.category === cat.value ? cat.color + '20' : undefined
                  }}
                  onClick={() => setVal("category", cat.value)}
                >
                  <span style={{ color: cat.color }}>{cat.label.split(' ')[0]}</span>
                  <small>{cat.description}</small>
                </button>
              ))}
            </div>
          </Row>

          {/* Lead Source */}
          <Row label="Lead Source">
            <select className="relio-input" value={form.source} onChange={set("source")}>
              <option value="">How did this lead come in?</option>
              {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Row>

          {/* Stage */}
          <Row label="Stage" icon={Star}>
            <select className="relio-input" value={form.stage} onChange={set("stage")}>
              <option value="">Select current stage...</option>
              {LEAD_STAGES.filter(s => !s.isClosed || form.stage === s.value).map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </Row>

          {/* Follow-up Date with Quick Options */}
          <Row label="Follow-up Date" icon={Calendar}>
            <input 
              className="relio-input" 
              type="date" 
              min={todayStr()}
              value={form.followUpDate} 
              onChange={set("followUpDate")} 
            />
            <div className={styles.quickFollowup}>
              <span>Quick set:</span>
              {FOLLOWUP_QUICK.map(opt => (
                <button 
                  key={opt.days} 
                  type="button"
                  className={styles.quickBtn}
                  onClick={() => handleQuickFollowup(opt.days)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Row>

          {/* Email */}
          <Row label="Email" optional>
            <input 
              className="relio-input" 
              type="email" 
              placeholder="email@example.com"
              value={form.email} 
              onChange={set("email")} 
            />
          </Row>

          {/* Referred By */}
          <Row label="Referred By" optional>
            <input 
              className="relio-input" 
              placeholder="DG, Rajesh Sharma, etc."
              value={form.referredBy} 
              onChange={set("referredBy")} 
            />
          </Row>

          {/* Remarks */}
          <Row label="Remarks" optional>
            <textarea 
              className={`relio-input ${styles.textarea}`}
              placeholder="Notes about this lead - requirements, preferences, concerns..."
              value={form.remarks} 
              onChange={set("remarks")} 
              rows={3} 
            />
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
        <button 
          type="button" 
          className="relio-btn relio-btn-primary" 
          onClick={handleSave}
          disabled={busy} 
          style={{ flex: 1 }}
        >
          {busy ? "Saving…" : isEdit ? "Save Changes" : "Add Lead"}
        </button>
      </div>
    </div>
  );
}
