"use client";
export const dynamic = 'force-dynamic';
import { useState, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { usePaginatedLeads } from "@/lib/hooks/useLeads";
import { LEAD_STAGES, LEAD_SOURCES, LEAD_CATEGORIES } from "@/lib/utils/constants";
import { useToast } from "@/components/shared/Toast";
import VirtualizedLeadList from "@/components/leads/VirtualizedLeadList";
import LeadForm from "@/components/leads/LeadForm";
import BulkImport from "@/components/leads/BulkImport";
import PostCallSheet from "@/components/leads/PostCallSheet";
import ArchiveLeadModal from "@/components/shared/ArchiveLeadModal";
import BottomSheet from "@/components/shared/BottomSheet";
import EmptyState from "@/components/shared/EmptyState";
import { 
  Users, Upload, Plus, X, Search, Filter, RefreshCw, Archive,
  Flame, Sun, Snowflake, Moon, VolumeX
} from "lucide-react";
import styles from "./leads.module.css";

// ─── sessionStorage helpers ───────────────────────────────────────────────────
function ssGet(key, fallback) {
  try { 
    const v = sessionStorage.getItem(key); 
    return v !== null ? JSON.parse(v) : fallback; 
  }
  catch { return fallback; }
}
function ssSet(key, value) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export default function LeadsPage() {
  const { user } = useAuth();
  const { 
    leads, 
    loading, 
    loadingMore, 
    hasMore, 
    loadMore, 
    refresh,
    archiveLead,
    error 
  } = usePaginatedLeads();
  const toast = useToast();

  // UI State
  const [search, setSearch] = useState(() => ssGet("leads_search", ""));
  const [filters, setFilters] = useState(() => ssGet("leads_filters", { 
    status: "", 
    source: "", 
    category: "",
    temperature: "" 
  }));
  const [showFilters, setShowFilters] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [postCall, setPostCall] = useState(null);
  const [archiveModalLead, setArchiveModalLead] = useState(null);

  // Persist filters to sessionStorage
  const handleSearch = (val) => { 
    setSearch(val);  
    ssSet("leads_search", val); 
  };
  
  const handleFilterChange = (key, value) => {
    setFilters(prev => {
      const next = { ...prev, [key]: value };
      ssSet("leads_filters", next);
      return next;
    });
  };

  const clearFilters = () => {
    setFilters({ status: "", source: "", category: "", temperature: "" });
    setSearch("");
    ssSet("leads_filters", { status: "", source: "", category: "", temperature: "" });
    ssSet("leads_search", "");
  };

  // Action handlers
  const handleCall = useCallback((lead) => {
    window.open(`tel:${lead.mobile}`, "_self");
    setPostCall(lead);
  }, []);

  const handleWA = useCallback((lead) => {
    window.open(`https://wa.me/91${lead.mobile?.replace(/\D/g,"")}`, "_blank");
  }, []);

  const handleArchive = useCallback(async (leadId, archiveData) => {
    try {
      await archiveLead(leadId, archiveData);
      toast.success("Lead archived successfully");
      setArchiveModalLead(null);
    } catch (err) {
      console.error("Archive error:", err);
      toast.error("Failed to archive lead");
    }
  }, [archiveLead, toast]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(v => v !== "").length;
  }, [filters]);

  // Empty state component
  const emptyState = useMemo(() => {
    if (leads.length === 0 && !loading) {
      return (
        <EmptyState 
          icon={<Users size={48} />} 
          title="No leads yet"
          body="Tap + Add to capture your first lead. Takes 20 seconds."
          action={
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="relio-btn relio-btn-primary" onClick={() => setShowAdd(true)}>
                <Plus size={18} /> Add Lead
              </button>
              <button className="relio-btn relio-btn-ghost" onClick={() => setShowBulk(true)}>
                <Upload size={18} /> Bulk Import
              </button>
            </div>
          } 
        />
      );
    }
    
    if (leads.length > 0 && search && filteredCount === 0) {
      return (
        <EmptyState 
          icon={<Search size={48} />} 
          title="No matching leads"
          body={`No leads found for "${search}". Try a different search term.`}
          action={
            <button className="relio-btn relio-btn-ghost" onClick={clearFilters}>
              Clear Filters
            </button>
          }
        />
      );
    }
    
    return null;
  }, [leads.length, loading, search]);

  // Calculate filtered count for display
  const filteredCount = useMemo(() => {
    if (!search && activeFilterCount === 0) return leads.length;
    
    let count = leads.length;
    
    if (search) {
      const query = search.toLowerCase();
      count = leads.filter(lead => 
        lead.name?.toLowerCase().includes(query) ||
        lead.mobile?.includes(query)
      ).length;
    }
    
    return count;
  }, [leads, search, activeFilterCount]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          Leads
          <span className={styles.count}>{filteredCount}</span>
          {hasMore && <span className={styles.moreIndicator}>+</span>}
        </h1>
        <div className={styles.headerBtns}>
          <button 
            className={styles.refreshBtn} 
            onClick={refresh}
            disabled={loading}
            title="Refresh leads"
          >
            <RefreshCw size={16} className={loading ? styles.spinning : ""} />
          </button>
          <button className={styles.importBtn} onClick={() => setShowBulk(true)}>
            <Upload size={16} /> Import
          </button>
          <button className={styles.addBtn} onClick={() => setShowAdd(true)}>
            <Plus size={18} /> Add
          </button>
        </div>
      </header>

      {/* Search Row */}
      <div className={styles.searchRow}>
        <Search size={18} className={styles.searchIcon} />
        <input 
          className={styles.searchInput}
          placeholder="Search name, mobile, project..."
          value={search}
          onChange={e => handleSearch(e.target.value)}
        />
        {search && (
          <button 
            className={styles.clearBtn} 
            onClick={() => handleSearch("")}
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filter Toggle Button */}
      <div className={styles.filterToggleRow}>
        <button 
          className={`${styles.filterToggle} ${activeFilterCount > 0 ? styles.filterActive : ""}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={14} />
          Filters
          {activeFilterCount > 0 && (
            <span className={styles.filterBadge}>{activeFilterCount}</span>
          )}
        </button>
        
        {activeFilterCount > 0 && (
          <button className={styles.clearFiltersBtn} onClick={clearFilters}>
            Clear all
          </button>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className={styles.filtersPanel}>
          <div className={styles.filterGroup}>
            <label>Stage</label>
            <select 
              value={filters.status} 
              onChange={e => handleFilterChange("status", e.target.value)}
            >
              <option value="">All stages</option>
              {LEAD_STAGES.filter(s => !s.isClosed).map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Source</label>
            <select 
              value={filters.source} 
              onChange={e => handleFilterChange("source", e.target.value)}
            >
              <option value="">All sources</option>
              {LEAD_SOURCES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Category</label>
            <select 
              value={filters.category} 
              onChange={e => handleFilterChange("category", e.target.value)}
            >
              <option value="">All categories</option>
              {LEAD_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Temperature</label>
            <div className={styles.tempFilters}>
              <button 
                className={`${styles.tempBtn} ${filters.temperature === "hot" ? styles.tempActive : ""}`}
                onClick={() => handleFilterChange("temperature", filters.temperature === "hot" ? "" : "hot")}
              >
                <Flame size={12} /> Hot
              </button>
              <button 
                className={`${styles.tempBtn} ${filters.temperature === "warm" ? styles.tempActive : ""}`}
                onClick={() => handleFilterChange("temperature", filters.temperature === "warm" ? "" : "warm")}
              >
                <Sun size={12} /> Warm
              </button>
              <button 
                className={`${styles.tempBtn} ${filters.temperature === "cold" ? styles.tempActive : ""}`}
                onClick={() => handleFilterChange("temperature", filters.temperature === "cold" ? "" : "cold")}
              >
                <Snowflake size={12} /> Cold
              </button>
              <button 
                className={`${styles.tempBtn} ${filters.temperature === "unresponsive" ? styles.tempActive : ""}`}
                onClick={() => handleFilterChange("temperature", filters.temperature === "unresponsive" ? "" : "unresponsive")}
              >
                <VolumeX size={12} /> Unresponsive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Virtualized Lead List */}
      <div className={styles.listContainer}>
        <VirtualizedLeadList
          leads={leads}
          onCall={handleCall}
          onWhatsApp={handleWA}
          onArchive={setArchiveModalLead}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={loadMore}
          searchQuery={search}
          filters={filters}
          emptyState={emptyState}
        />
      </div>

      {/* Add Lead FAB */}
      <button className={styles.fab} onClick={() => setShowAdd(true)}>
        <Plus size={24} />
      </button>

      {/* Add Lead Bottom Sheet */}
      <BottomSheet open={showAdd} onClose={() => setShowAdd(false)} title="Add Lead" tall>
        <LeadForm 
          leads={leads} 
          quickMode
          onDone={() => setShowAdd(false)}
          onCancel={() => setShowAdd(false)} 
        />
      </BottomSheet>

      {/* Bulk Import Bottom Sheet */}
      <BottomSheet open={showBulk} onClose={() => setShowBulk(false)} title="Bulk Import Leads" tall>
        <BulkImport 
          leads={leads}
          onDone={() => setShowBulk(false)}
          onCancel={() => setShowBulk(false)} 
        />
      </BottomSheet>

      {/* Post Call Sheet */}
      <PostCallSheet 
        lead={postCall} 
        open={!!postCall}
        onClose={() => setPostCall(null)} 
        onDone={() => setPostCall(null)} 
      />

      {/* Archive Modal */}
      <ArchiveLeadModal
        lead={archiveModalLead}
        isOpen={!!archiveModalLead}
        onClose={() => setArchiveModalLead(null)}
        onArchive={handleArchive}
      />
    </div>
  );
}
