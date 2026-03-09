"use client";
import { useState, useMemo } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useLeads } from "@/lib/hooks/useLeads";
import { filterLeads, sortLeads } from "@/lib/utils/leadHelpers";
import { LEAD_STATUSES, LEAD_SOURCES } from "@/lib/utils/constants";
import LeadCard from "@/components/leads/LeadCard";
import LeadForm from "@/components/leads/LeadForm";
import BulkImport from "@/components/leads/BulkImport";
import PostCallSheet from "@/components/leads/PostCallSheet";
import BottomSheet from "@/components/shared/BottomSheet";
import EmptyState from "@/components/shared/EmptyState";
import styles from "./leads.module.css";

export default function LeadsPage() {
  const { user }           = useAuth();
  const { leads, loading } = useLeads();

  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState({ status:"", source:"", type:"", priority:"" });
  const [sortBy,  setSortBy]  = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [showAdd,  setShowAdd]  = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [postCall, setPostCall] = useState(null);

  const displayed = useMemo(() => {
    const filtered = filterLeads(leads, { search, ...filter });
    return sortLeads(filtered, sortBy, sortDir);
  }, [leads, search, filter, sortBy, sortDir]);

  function toggleSort(field) {
    if (sortBy === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("desc"); }
  }

  function handleCall(lead) {
    window.open(`tel:${lead.mobile}`, "_self");
    setPostCall(lead);
  }
  function handleWA(lead) {
    window.open(`https://wa.me/91${lead.mobile?.replace(/\D/g,"")}`, "_blank");
  }

  const SORT_OPTIONS = [
    { key:"createdAt", label:"Date"      },
    { key:"name",      label:"Name"      },
    { key:"priority",  label:"Priority"  },
    { key:"followUp",  label:"Follow-up" },
    { key:"status",    label:"Status"    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Leads
          <span className={styles.count}>{displayed.length}</span>
        </h1>
        <div className={styles.headerBtns}>
          <button className={styles.importBtn} onClick={() => setShowBulk(true)}>⬆ Import</button>
          <button className={styles.addBtn}    onClick={() => setShowAdd(true)}>+ Add</button>
        </div>
      </header>

      <div className={styles.searchRow}>
        <input className={styles.searchInput}
          placeholder="Search name, mobile, project…"
          value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button className={styles.clearBtn} onClick={() => setSearch("")}>✕</button>}
      </div>

      <div className={styles.filterRow}>
        <select className={styles.filterSelect} value={filter.status}
          onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
          <option value="">All statuses</option>
          {LEAD_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select className={styles.filterSelect} value={filter.source}
          onChange={e => setFilter(f => ({ ...f, source: e.target.value }))}>
          <option value="">All sources</option>
          {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={styles.filterSelect} value={filter.priority}
          onChange={e => setFilter(f => ({ ...f, priority: e.target.value }))}>
          <option value="">All temps</option>
          <option value="hot">🔥 Hot</option>
          <option value="warm">☀ Warm</option>
          <option value="cold">❄ Cold</option>
          <option value="dormant">💤 Dormant</option>
        </select>
      </div>

      <div className={styles.sortRow}>
        {SORT_OPTIONS.map(o => (
          <button key={o.key}
            className={`${styles.sortBtn} ${sortBy === o.key ? styles.sortBtnActive : ""}`}
            onClick={() => toggleSort(o.key)}>
            {o.label}{sortBy === o.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
          </button>
        ))}
      </div>

      <div className={styles.list}>
        {loading && <p className={styles.loadingMsg}>Loading leads…</p>}
        {!loading && displayed.length === 0 && (
          <EmptyState icon="👤" title="No leads yet"
            body="Tap + Add to capture your first lead. Takes 20 seconds."
            action={
              <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap" }}>
                <button className="relio-btn relio-btn-primary" onClick={() => setShowAdd(true)}>+ Add Lead</button>
                <button className="relio-btn relio-btn-ghost"   onClick={() => setShowBulk(true)}>⬆ Bulk Import</button>
              </div>
            } />
        )}
        {displayed.map(lead => (
          <LeadCard key={lead.id} lead={lead}
            onCall={() => handleCall(lead)}
            onWhatsApp={() => handleWA(lead)} />
        ))}
      </div>

      <button className={styles.fab} onClick={() => setShowAdd(true)}>+</button>

      <BottomSheet open={showAdd} onClose={() => setShowAdd(false)} title="Add Lead" tall>
        <LeadForm leads={leads} quickMode
          onDone={() => setShowAdd(false)}
          onCancel={() => setShowAdd(false)} />
      </BottomSheet>

      <BottomSheet open={showBulk} onClose={() => setShowBulk(false)} title="Bulk Import Leads" tall>
        <BulkImport leads={leads}
          onDone={() => setShowBulk(false)}
          onCancel={() => setShowBulk(false)} />
      </BottomSheet>

      <PostCallSheet lead={postCall} open={!!postCall}
        onClose={() => setPostCall(null)} onDone={() => setPostCall(null)} />
    </div>
  );
}
