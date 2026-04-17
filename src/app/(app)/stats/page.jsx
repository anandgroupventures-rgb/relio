"use client";
export const dynamic = 'force-dynamic';
import { useState, useMemo } from "react";
import { useLeads } from "@/lib/hooks/useLeads";
import { useInventory } from "@/lib/hooks/useInventory";
import { daysSince } from "@/lib/utils/dateHelpers";
import styles from "./stats.module.css";

const ALL_WIDGETS = [
  { id: "overview",      label: "Overview Numbers",         icon: "📊" },
  { id: "temperature",   label: "Lead Temperature",         icon: "🌡" },
  { id: "sources",       label: "Lead Sources",             icon: "📣" },
  { id: "status",        label: "Lead Status Breakdown",    icon: "📋" },
  { id: "inventory",     label: "Inventory Summary",        icon: "🏠" },
  { id: "staleness",     label: "Inventory Staleness",      icon: "⏱" },
  { id: "bhk",           label: "Config Demand (Leads)",    icon: "🛏" },
  { id: "conversion",    label: "Conversion by Source",     icon: "🎯" },
];

export default function StatsPage() {
  const { leads }     = useLeads();
  const { inventory } = useInventory();
  const [customising, setCustomising] = useState(false);
  const [visible, setVisible]         = useState(
    () => {
      if (typeof window !== "undefined") {
        try {
          const saved = localStorage.getItem("relio_stat_widgets");
          if (saved) return JSON.parse(saved);
        } catch {}
      }
      return ["overview","temperature","sources","inventory"];
    }
  );

  function toggleWidget(id) {
    setVisible(v => {
      const next = v.includes(id) ? v.filter(x => x !== id) : [...v, id];
      try { localStorage.setItem("relio_stat_widgets", JSON.stringify(next)); } catch {}
      return next;
    });
  }

  const s = useMemo(() => {
    const active    = leads.filter(l => !["converted","lost"].includes(l.status));
    const converted = leads.filter(l => l.status === "converted");
    const lost      = leads.filter(l => l.status === "lost");
    const byTemp    = { hot:0, warm:0, cold:0, dormant:0 };
    const byStatus  = {};
    const bySource  = {};
    const byBhk     = {};

    leads.forEach(l => {
      const t = l.temperature || "cold";
      byTemp[t]  = (byTemp[t]||0) + 1;
      const st   = l.status || "new";
      byStatus[st] = (byStatus[st]||0)+1;
      if (l.source) bySource[l.source] = (bySource[l.source]||0)+1;
      if (l.bhk)    byBhk[l.bhk]       = (byBhk[l.bhk]||0)+1;
    });

    // Conversion by source (needs 3+ leads per source)
    const convBySource = {};
    Object.keys(bySource).forEach(src => {
      if (bySource[src] < 3) return;
      const conv = leads.filter(l => l.source===src && l.status==="converted").length;
      convBySource[src] = Math.round((conv/bySource[src])*100);
    });

    const staleInv = inventory.filter(i => daysSince(i.lastOwnerContacted) > 21 && i.availability==="available");

    return { active, converted, lost, byTemp, byStatus, bySource, byBhk, convBySource, staleInv,
      convRate: leads.length ? Math.round((converted.length/leads.length)*100) : 0 };
  }, [leads, inventory]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Stats</h1>
        <button className={styles.customBtn} onClick={() => setCustomising(c => !c)}>
          {customising ? "Done" : "✎ Customise"}
        </button>
      </header>

      {/* Widget picker */}
      {customising && (
        <div className={styles.picker}>
          <p className={styles.pickerTitle}>Choose which stats to show</p>
          {ALL_WIDGETS.map(w => (
            <label key={w.id} className={styles.pickerRow}>
              <span>{w.icon} {w.label}</span>
              <input type="checkbox" checked={visible.includes(w.id)}
                onChange={() => toggleWidget(w.id)} />
            </label>
          ))}
        </div>
      )}

      <div className={styles.content}>

        {/* Overview */}
        {visible.includes("overview") && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>📊 Overview</h2>
            <div className={styles.grid4}>
              <Stat label="Total"     value={leads.length} />
              <Stat label="Active"    value={s.active.length}    color="var(--relio-gold)" />
              <Stat label="Converted" value={s.converted.length} color="var(--relio-success)" />
              <Stat label="Conv. rate" value={`${s.convRate}%`}  color="var(--relio-gold)" />
            </div>
          </div>
        )}

        {/* Temperature */}
        {visible.includes("temperature") && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>🌡 Lead Temperature</h2>
            {[
              { key:"hot",     label:"🔥 Hot",     color:"var(--relio-hot)"     },
              { key:"warm",    label:"☀ Warm",    color:"var(--relio-warm)"    },
              { key:"cold",    label:"❄ Cold",    color:"var(--relio-cold)"    },
              { key:"dormant", label:"💤 Dormant", color:"var(--relio-dormant)" },
            ].map(t => <Bar key={t.key} label={t.label} value={s.byTemp[t.key]||0}
              total={leads.length} color={t.color} />)}
          </div>
        )}

        {/* Sources */}
        {visible.includes("sources") && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>📣 Lead Sources</h2>
            {Object.entries(s.bySource).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([src,n]) =>
              <Bar key={src} label={src} value={n} total={leads.length}
                color="var(--relio-gold)" />
            )}
            {Object.keys(s.bySource).length===0 && <p className={styles.noData}>No source data yet.</p>}
          </div>
        )}

        {/* Status */}
        {visible.includes("status") && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>📋 Status Breakdown</h2>
            {Object.entries(s.byStatus).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([st,n]) =>
              <Bar key={st} label={st.replace(/_/g," ")} value={n} total={leads.length}
                color="var(--relio-cold)" />
            )}
          </div>
        )}

        {/* Conversion by source */}
        {visible.includes("conversion") && Object.keys(s.convBySource).length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>🎯 Conversion Rate by Source</h2>
            <p className={styles.subNote}>Only shown for sources with 3+ leads.</p>
            {Object.entries(s.convBySource).sort((a,b)=>b[1]-a[1]).map(([src,pct]) =>
              <Bar key={src} label={src} value={pct} total={100} suffix="%" color="var(--relio-success)" />
            )}
          </div>
        )}

        {/* BHK demand */}
        {visible.includes("bhk") && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>🛏 Config Demand</h2>
            {Object.entries(s.byBhk).sort((a,b)=>b[1]-a[1]).map(([bhk,n]) =>
              <Bar key={bhk} label={bhk} value={n} total={leads.length}
                color="var(--relio-warm)" />
            )}
            {Object.keys(s.byBhk).length===0 && <p className={styles.noData}>No config data yet.</p>}
          </div>
        )}

        {/* Inventory */}
        {visible.includes("inventory") && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>🏠 Inventory</h2>
            <div className={styles.grid4}>
              <Stat label="Total"       value={inventory.length} />
              <Stat label="Available"   value={inventory.filter(i=>i.availability==="available").length}   color="var(--relio-success)" />
              <Stat label="Negotiating" value={inventory.filter(i=>i.availability==="negotiating").length} color="var(--relio-warning)" />
              <Stat label="Sold/Rented" value={inventory.filter(i=>["sold","rented"].includes(i.availability)).length} color="var(--relio-text-muted)" />
            </div>
          </div>
        )}

        {/* Staleness */}
        {visible.includes("staleness") && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>⏱ Inventory Staleness</h2>
            {[
              { label:"Fresh (0–14 days)",   fn: i => daysSince(i.lastOwnerContacted) <= 14,  color:"var(--relio-success)" },
              { label:"Aging (15–21 days)",  fn: i => { const d=daysSince(i.lastOwnerContacted); return d>14&&d<=21; }, color:"var(--relio-gold)" },
              { label:"Stale (21+ days)",    fn: i => daysSince(i.lastOwnerContacted) > 21,   color:"var(--relio-danger)" },
            ].map(row => (
              <Bar key={row.label} label={row.label}
                value={inventory.filter(row.fn).length}
                total={inventory.length} color={row.color} />
            ))}
            {inventory.length===0 && <p className={styles.noData}>No inventory yet.</p>}
          </div>
        )}

        {visible.length === 0 && (
          <div className={styles.empty}>
            <p>No stats selected.</p>
            <button className="relio-btn relio-btn-primary" onClick={() => setCustomising(true)}
              style={{ marginTop:12 }}>+ Choose Stats</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statValue} style={{ color: color||"var(--relio-text)" }}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

function Bar({ label, value, total, color, suffix="" }) {
  const pct = total > 0 ? Math.round((value/total)*100) : 0;
  return (
    <div className={styles.barRow}>
      <span className={styles.barLabel}>{label}</span>
      <div className={styles.barTrack}>
        <div className={styles.barFill} style={{ width:`${Math.max(pct,2)}%`, background:color }} />
      </div>
      <span className={styles.barCount}>{value}{suffix}</span>
    </div>
  );
}
