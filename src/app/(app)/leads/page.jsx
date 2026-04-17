"use client";
import { useState, useMemo } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useLeads } from "@/lib/hooks/useLeads";
import { filterLeads, sortLeads } from "@/lib/utils/leadHelpers";
import { LEAD_STATUSES, LEAD_SOURCES } from "@/lib/utils/constants";
import { useToast } from "@/components/shared/Toast";
import { SkeletonList } from "@/components/shared/Skeleton";
import LeadCard from "@/components/leads/LeadCard";
import LeadForm from "@/components/leads/LeadForm";
import BulkImport from "@/components/leads/BulkImport";
import PostCallSheet from "@/components/leads/PostCallSheet";
import BottomSheet from "@/components/shared/BottomSheet";
import EmptyState from "@/components/shared/EmptyState";
import { Users, Upload, Plus, X, Search, Flame, Sun, Snowflake, Moon } from "lucide-react";
import styles from "./leads.module.css";

// ─── sessionStorage helpers ───────────────────────────────────────────────────
function ssGet(key, fallback) {
  try { const v = sessionStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function ssSet(key, value) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export default function LeadsPage() {
  const { user }           = useAuth();
  const { leads, loading } = useLeads();
  const toast = useToast();

  const [search,  setSearch]  = useState(() => ssGet("leads_search",  ""));
  const [filter,  setFilter]  = useState(() => ssGet("leads_filter",  { status:"", source:"", type:"", priority:"" }));
  const [sortBy,  setSortBy]  = useState(() => ssGet("leads_sortBy",  "createdAt"));
  const [sortDir, setSortDir] = useState(() => ssGet("leads_sortDir", "desc"));
  const [showAdd,  setShowAdd]  = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [postCall, setPostCall] = useState(null);

  // Persist every change to sessionStorage
  function handleSearch(val)  { setSearch(val);  ssSet("leads_search",  val); }
  function handleFilter(fn)   {
    setFilter(prev => {
      const next = typeof fn === "function" ? fn(prev) : fn;
      ssSet("leads_filter", next);
      return next;
    });
  }
  function handleSortBy(val)  { setSortBy(val);  ssSet("leads_sortBy",  val); }
  function handleSortDir(val) { setSortDir(val); ssSet("leads_sortDir", val); }

  const displayed = useMemo(() => {
    const filtered = filterLeads(leads, { search, ...filter });
    return sortLeads(filtered, sortBy, sortDir);
  }, [leads, search, filter, sortBy, sortDir]);

  function toggleSort(field) {
    if (sortBy === field) {
      const next = sortDir === "asc" ? "desc" : "asc";
      handleSortDir(next);
    } else {
      handleSortBy(field);
      handleSortDir("desc");
    }
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
          <button className={styles.importBtn} onClick={() => setShowBulk(true)}>
            <Upload size={16} /> Import
          </button>
          <button className={styles.addBtn} onClick={() => setShowAdd(true)}>
            <Plus size={18} /> Add
          </button>
        </div>
      </header>

      <div className={styles.searchRow}>
        <Search size={18} className={styles.searchIcon} />
        <input className={styles.searchInput}
          placeholder="Search name, mobile, project…"
          value={search} onChange={e => handleSearch(e.target.value)} />
        {search && (
          <button className={styles.clearBtn} onClick={() => handleSearch("")} aria-label="Clear search">
            <X size={16} />
          </button>
        )}
      </div>

      <div className={styles.filterRow}>
        <select className={styles.filterSelect} value={filter.status}
          onChange={e => handleFilter(f => ({ ...f, status: e.target.value }))}>
          <option value="">All statuses</option>
          {LEAD_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select className={styles.filterSelect} value={filter.source}
          onChange={e => handleFilter(f => ({ ...f, source: e.target.value }))}>
          <option value="">All sources</option>
          {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={styles.filterSelect} value={filter.priority}
          onChange={e => handleFilter(f => ({ ...f, priority: e.target.value }))}>
          <option value="">All temps</option>
          <option value="hot">Hot</option>
          <option value="warm">Warm</option>
          <option value="cold">Cold</option>
          <option value="dormant">Dormant</option>
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
        {loading && <SkeletonList count={5} />}
        {!loading && displayed.length === 0 && (
          <EmptyState icon={<Users size={48} />} title="No leads yet"
            body="Tap + Add to capture your first lead. Takes 20 seconds."
            action={
              <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap" }}>
                <button className="relio-btn relio-btn-primary" onClick={() => setShowAdd(true)}>
                  <Plus size={18} /> Add Lead
                </button>
                <button className="relio-btn relio-btn-ghost" onClick={() => setShowBulk(true)}>
                  <Upload size={18} /> Bulk Import
                </button>
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
