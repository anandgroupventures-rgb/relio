"use client";
import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/hooks/useAuth";
import { useLeads } from "@/lib/hooks/useLeads";
import { filterLeads, sortLeads, getTempStyle, getStatusLabel } from "@/lib/utils/leadHelpers";
import { LEAD_STATUSES, LEAD_SOURCES, BHK_OPTIONS } from "@/lib/utils/constants";
import { formatFollowUp, isOverdue } from "@/lib/utils/dateHelpers";
import BottomSheet from "@/components/shared/BottomSheet";
import EmptyState from "@/components/shared/EmptyState";
import { bulkDeleteLeads, bulkArchiveLeads, updateLead } from "@/lib/firebase/leads";

const LeadForm = dynamic(() => import("@/components/leads/LeadForm"), { ssr: false });
const BulkImport = dynamic(() => import("@/components/leads/BulkImport"), { ssr: false });
const PostCallSheet = dynamic(() => import("@/components/leads/PostCallSheet"), { ssr: false });
import { Bell, Search, Phone, MessageCircle, Plus, MapPin, Home, ChevronRight, Trash2, Archive, X, CheckSquare, Square, LayoutGrid, List, Upload, SlidersHorizontal, Calendar } from "lucide-react";
import { DATE_PRESETS, getPresetRange, formatShortDate } from "@/lib/utils/dateHelpers";
import styles from "./leads.module.css";

function ssGet(key, fallback) {
  try { const v = sessionStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function ssSet(key, value) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export default function LeadsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { leads, loading, hasMore, loadMore } = useLeads();

  const [search,  setSearch]  = useState(() => ssGet("leads_search", ""));
  const [filter,  setFilter]  = useState(() => ssGet("leads_filter", { status:"", source:"", type:"", priority:"", archived: false, dateFrom:"", dateTo:"", datePreset:"" }));
  const [sortBy,  setSortBy]  = useState(() => ssGet("leads_sortBy", "createdAt"));
  const [sortDir, setSortDir] = useState(() => ssGet("leads_sortDir", "desc"));
  const [showAdd,  setShowAdd]  = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [postCall, setPostCall] = useState(null);
  const [viewMode, setViewMode] = useState(() => ssGet("leads_view", "list")); // list | kanban
  const [showFilters, setShowFilters] = useState(false);
  const [draftFilter, setDraftFilter] = useState(filter);
  const [draftSortBy, setDraftSortBy] = useState(sortBy);
  const [draftSortDir, setDraftSortDir] = useState(sortDir);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const longPressTimer = useRef(null);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Bulk WhatsApp
  const [showBulkWA, setShowBulkWA] = useState(false);
  const [bulkWAProgress, setBulkWAProgress] = useState(0);
  const [templates, setTemplates] = useState(() => {
    if (typeof window === "undefined") return [];
    try { const v = localStorage.getItem("relio_wa_templates"); return v ? JSON.parse(v) : []; } catch { return []; }
  });

  function handleSearch(val)  { setSearch(val); ssSet("leads_search", val); }
  function handleFilter(fn) {
    setFilter(prev => {
      const next = typeof fn === "function" ? fn(prev) : fn;
      ssSet("leads_filter", next);
      return next;
    });
  }
  function handleSortBy(val)  { setSortBy(val); ssSet("leads_sortBy", val); }
  function handleSortDir(val) { setSortDir(val); ssSet("leads_sortDir", val); }
  function handleViewMode(val) { setViewMode(val); ssSet("leads_view", val); }

  const displayed = useMemo(() => {
    const filtered = filterLeads(leads, { search, ...filter });
    return sortLeads(filtered, sortBy, sortDir);
  }, [leads, search, filter, sortBy, sortDir]);

  function toggleSort(field) {
    if (sortBy === field) {
      handleSortDir(sortDir === "asc" ? "desc" : "asc");
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
    window.open(`https://wa.me/91${lead.mobile?.replace(/\D/g, "")}`, "_blank");
  }

  // Multi-select handlers
  function startLongPress(leadId) {
    longPressTimer.current = setTimeout(() => {
      setIsSelecting(true);
      toggleSelection(leadId);
    }, 600);
  }
  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }
  function toggleSelection(leadId) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  }
  function clearSelection() {
    setSelectedIds(new Set());
    setIsSelecting(false);
  }
  function selectAll() {
    setSelectedIds(new Set(displayed.map(l => l.id)));
  }
  async function handleBulkDelete() {
    if (!user || selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} lead${selectedIds.size > 1 ? "s" : ""}? This cannot be undone.`)) return;
    await bulkDeleteLeads(user.uid, Array.from(selectedIds));
    clearSelection();
  }
  async function handleBulkArchive() {
    if (!user || selectedIds.size === 0) return;
    if (!window.confirm(`Archive ${selectedIds.size} lead${selectedIds.size > 1 ? "s" : ""}?`)) return;
    await bulkArchiveLeads(user.uid, Array.from(selectedIds));
    clearSelection();
  }

  async function handleBulkWA(template = null) {
    if (!user || selectedIds.size === 0) return;
    const selectedLeads = displayed.filter(l => selectedIds.has(l.id));
    let msg = "Hi {name}, following up on your property inquiry.";
    if (template) {
      msg = template.message;
    }
    setShowBulkWA(false);
    setBulkWAProgress(0);
    for (let i = 0; i < selectedLeads.length; i++) {
      const lead = selectedLeads[i];
      const personalized = msg
        .replace(/{name}/g, lead.name || "")
        .replace(/{project}/g, lead.projectInterest || "your property inquiry")
        .replace(/{date}/g, new Date().toLocaleDateString("en-IN"))
        .replace(/{time}/g, new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
      const encoded = encodeURIComponent(personalized);
      window.open(`https://wa.me/91${lead.mobile?.replace(/\D/g, "")}?text=${encoded}`, "_blank");
      setBulkWAProgress(i + 1);
      if (i < selectedLeads.length - 1) {
        await new Promise(r => setTimeout(r, 1200)); // 1.2s gap so user can switch back
      }
    }
    setBulkWAProgress(0);
    clearSelection();
  }

  const propertyChips = ["Residential", "Commercial", "Plots"];
  const priorityChips = ["hot", "warm", "cold", "dormant"];

  // ─── Active filter pills ────────────────────────────────────────────────────
  function getActivePills() {
    const pills = [];
    if (sortBy !== "createdAt" || sortDir !== "desc") {
      const sortLabel = { createdAt: "Date", leadDate: "Lead Date", name: "Name", priority: "Priority", followUp: "Follow-up", status: "Status" }[sortBy] || sortBy;
      pills.push({ key: "sort", label: `Sort: ${sortLabel} ${sortDir === "asc" ? "↑" : "↓"}`, onRemove: () => { handleSortBy("createdAt"); handleSortDir("desc"); } });
    }
    if (filter.status) pills.push({ key: "status", label: `Status: ${filter.status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}`, onRemove: () => handleFilter(f => ({ ...f, status: "" })) });
    if (filter.type) pills.push({ key: "type", label: `Type: ${filter.type}`, onRemove: () => handleFilter(f => ({ ...f, type: "" })) });
    if (filter.source) pills.push({ key: "source", label: `Source: ${filter.source}`, onRemove: () => handleFilter(f => ({ ...f, source: "" })) });
    if (filter.priority) pills.push({ key: "priority", label: `Priority: ${filter.priority.charAt(0).toUpperCase() + filter.priority.slice(1)}`, onRemove: () => handleFilter(f => ({ ...f, priority: "" })) });
    if (filter.archived) pills.push({ key: "archived", label: "Archived", onRemove: () => handleFilter(f => ({ ...f, archived: false })) });
    if (filter.dateFrom || filter.dateTo) {
      let dLabel = "Date: ";
      if (filter.datePreset && filter.datePreset !== "custom") {
        dLabel += DATE_PRESETS.find(p => p.value === filter.datePreset)?.label || filter.datePreset;
      } else if (filter.dateFrom && filter.dateTo) {
        dLabel += `${formatShortDate(filter.dateFrom)} – ${formatShortDate(filter.dateTo)}`;
      } else if (filter.dateFrom) {
        dLabel += `From ${formatShortDate(filter.dateFrom)}`;
      } else {
        dLabel += `Until ${formatShortDate(filter.dateTo)}`;
      }
      pills.push({ key: "date", label: dLabel, onRemove: () => handleFilter(f => ({ ...f, dateFrom: "", dateTo: "", datePreset: "" })) });
    }
    return pills;
  }

  const activePills = getActivePills();
  const visiblePills = activePills.slice(0, 3);
  const hiddenCount = activePills.length - 3;

  function hasActiveFilters() {
    return activePills.length > 0;
  }

  function openFilters() {
    setDraftFilter(filter);
    setDraftSortBy(sortBy);
    setDraftSortDir(sortDir);
    setShowFilters(true);
  }

  function applyFilters() {
    setFilter(draftFilter);
    setSortBy(draftSortBy);
    setSortDir(draftSortDir);
    setShowFilters(false);
  }

  function clearAllFilters() {
    const empty = { status: "", source: "", type: "", priority: "", archived: false, dateFrom: "", dateTo: "", datePreset: "" };
    setDraftFilter(empty);
    setDraftSortBy("createdAt");
    setDraftSortDir("desc");
    setFilter(empty);
    setSortBy("createdAt");
    setSortDir("desc");
  }

  function handlePreset(preset) {
    if (preset === "custom") {
      setDraftFilter(f => ({ ...f, datePreset: preset }));
      return;
    }
    const { from, to } = getPresetRange(preset);
    setDraftFilter(f => ({ ...f, datePreset: preset, dateFrom: from, dateTo: to }));
  }

  return (
    <div className={`${styles.page} ${isSelecting ? styles.pageSelecting : ""}`}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          {isSelecting ? (
            <div className={styles.headerLeft} style={{ flex: 1 }}>
              <button className={styles.backBtn} onClick={clearSelection}>
                <X size={22} color="var(--r-primary)" />
              </button>
              <h1 className="text-headline-md" style={{ color: "var(--r-primary)" }}>
                {selectedIds.size} selected
              </h1>
            </div>
          ) : (
            <div className={styles.headerLeft}>
              <div className={styles.avatar}>
                {(user?.displayName?.[0] || "U").toUpperCase()}
              </div>
              <h1 className="text-headline-lg-mobile" style={{ color: "var(--r-primary)" }}>Relio</h1>
            </div>
          )}
          {isSelecting ? (
            <button className={styles.headerAction} onClick={selectAll}>
              <CheckSquare size={20} color="var(--r-primary)" />
            </button>
          ) : (
            <button className={styles.notifBtn}>
              <Bell size={22} color="var(--r-primary)" />
            </button>
          )}
        </div>
      </header>

      <main className={styles.main}>
        {/* Search */}
        <div className={styles.searchWrap}>
          <Search size={20} color="var(--r-outline)" className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search by name, phone or locality..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
          {search && (
            <button className={styles.clearBtn} onClick={() => handleSearch("")}>×</button>
          )}
        </div>

        {/* Active filter pills */}
        {activePills.length > 0 && (
          <div className={styles.pillsRow}>
            <div className={styles.pillsScroll}>
              {visiblePills.map(pill => (
                <button key={pill.key} className={styles.filterPill} onClick={pill.onRemove}>
                  {pill.label}
                  <X size={12} style={{ marginLeft: 4 }} />
                </button>
              ))}
              {hiddenCount > 0 && (
                <button className={styles.filterPillMore} onClick={openFilters}>
                  +{hiddenCount} more
                </button>
              )}
              <button className={styles.clearAllPill} onClick={clearAllFilters}>
                Clear All
              </button>
            </div>
          </div>
        )}

        {/* View Toggle + Filter */}
        <div className={styles.viewBar}>
          <button
            className={`${styles.filterTrigger} ${hasActiveFilters() ? styles.filterTriggerActive : ""}`}
            onClick={openFilters}
            title="Filters"
          >
            <SlidersHorizontal size={16} />
            {hasActiveFilters() && <span className={styles.filterBadge}>{activePills.length}</span>}
            <span className={styles.filterLabel}>Filters</span>
          </button>
          <div className={styles.viewToggle}>
            <button className={`${styles.viewBtn} ${viewMode === "list" ? styles.viewBtnActive : ""}`} onClick={() => handleViewMode("list")} title="List view">
              <List size={18} />
            </button>
            <button className={`${styles.viewBtn} ${viewMode === "kanban" ? styles.viewBtnActive : ""}`} onClick={() => handleViewMode("kanban")} title="Kanban view">
              <LayoutGrid size={18} />
            </button>
            <button className={styles.viewBtn} onClick={() => setShowBulk(true)} title="Bulk import">
              <Upload size={18} />
            </button>
          </div>
        </div>

        {/* Lead Cards — List or Kanban */}
        {viewMode === "list" ? (
          <section className={styles.grid}>
            {loading && <p className={styles.loadingMsg}>Loading leads…</p>}
            {!loading && displayed.length === 0 && (
              <EmptyState
                icon={<UsersIcon />}
                title={filter.archived ? "No archived leads" : "No leads yet"}
                body={filter.archived ? "Archived leads will appear here." : "Tap + Add to capture your first lead. Takes 20 seconds."}
                action={
                  filter.archived ? (
                    <button className="r-btn r-btn-ghost" onClick={() => handleFilter(f => ({ ...f, archived: false }))}>View Active Leads</button>
                  ) : (
                    <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                      <button className="r-btn r-btn-primary" onClick={() => setShowAdd(true)}>+ Add Lead</button>
                      <button className="r-btn r-btn-ghost" onClick={() => setShowBulk(true)}>Import</button>
                    </div>
                  )
                }
              />
            )}
            {displayed.map(lead => (
              <LeadCardDesign
                key={lead.id}
                lead={lead}
                isSelecting={isSelecting}
                isSelected={selectedIds.has(lead.id)}
                onTap={() => {
                  if (isSelecting) toggleSelection(lead.id);
                  else router.push(`/leads/${lead.id}`);
                }}
                onLongPressStart={() => startLongPress(lead.id)}
                onLongPressEnd={cancelLongPress}
                onCall={() => handleCall(lead)}
                onWA={() => handleWA(lead)}
              />
            ))}
            {hasMore && viewMode === "list" && (
              <button className="r-btn r-btn-ghost" onClick={loadMore} style={{ width: "100%", marginTop: 8 }}>
                Load More
              </button>
            )}
          </section>
        ) : (
          <KanbanBoard
            leads={displayed}
            loading={loading}
            isSelecting={isSelecting}
            selectedIds={selectedIds}
            onTap={(lead) => {
              if (isSelecting) toggleSelection(lead.id);
              else router.push(`/leads/${lead.id}`);
            }}
            onLongPressStart={(id) => startLongPress(id)}
            onLongPressEnd={cancelLongPress}
            onMove={async (leadId, newStatus) => {
              if (!user) return;
              await updateLead(user.uid, leadId, { status: newStatus });
            }}
          />
        )}
      </main>

      {/* FAB — hidden when selecting */}
      {!isSelecting && (
        <button className="r-fab" onClick={() => router.push("/leads/new")}>
          <Plus size={28} />
        </button>
      )}

      {/* Bulk Action Bar */}
      {isSelecting && selectedIds.size > 0 && (
        <div className={styles.bulkBar}>
          <button className={`${styles.bulkBtn} ${styles.bulkBtnWA}`} onClick={() => setShowBulkWA(true)}>
            <MessageCircle size={18} /> WhatsApp
          </button>
          <button className={styles.bulkBtn} onClick={handleBulkArchive}>
            <Archive size={18} /> Archive
          </button>
          <button className={`${styles.bulkBtn} ${styles.bulkBtnDanger}`} onClick={handleBulkDelete}>
            <Trash2 size={18} /> Delete
          </button>
        </div>
      )}

      {/* Bulk WhatsApp Progress */}
      {bulkWAProgress > 0 && (
        <div className={styles.bulkProgressOverlay}>
          <div className={styles.bulkProgressCard}>
            <MessageCircle size={28} color="var(--r-primary)" />
            <p className="text-body-lg" style={{ fontWeight: 600, marginTop: 8 }}>Sending WhatsApp messages…</p>
            <p className="text-body-md" style={{ color: "var(--r-on-surface-variant)", marginTop: 4 }}>
              {bulkWAProgress} of {selectedIds.size} sent
            </p>
            <div className={styles.bulkProgressBar}>
              <div className={styles.bulkProgressFill} style={{ width: `${(bulkWAProgress / selectedIds.size) * 100}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Filter & Sort Sheet */}
      <BottomSheet open={showFilters} onClose={() => setShowFilters(false)} title="Filters & Sort" tall>
        <div style={{ padding: "0 16px 24px", maxHeight: "70vh", overflowY: "auto" }}>
          {/* Sort */}
          <section style={{ marginBottom: 24 }}>
            <h4 className="text-label-md" style={{ color: "var(--r-outline)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Sort by</h4>
            <div className={styles.sheetChips}>
              {[
                { key: "createdAt", label: "Date" },
                { key: "leadDate", label: "Lead Date" },
                { key: "name", label: "Name" },
                { key: "priority", label: "Priority" },
                { key: "followUp", label: "Follow-up" },
                { key: "status", label: "Status" },
              ].map(o => (
                <button
                  key={o.key}
                  className={`${styles.sheetChip} ${draftSortBy === o.key ? styles.sheetChipActive : ""}`}
                  onClick={() => {
                    if (draftSortBy === o.key) setDraftSortDir(draftSortDir === "asc" ? "desc" : "asc");
                    else { setDraftSortBy(o.key); setDraftSortDir("desc"); }
                  }}
                >
                  {o.label} {draftSortBy === o.key ? (draftSortDir === "asc" ? "↑" : "↓") : ""}
                </button>
              ))}
            </div>
          </section>

          {/* Date Range */}
          <section style={{ marginBottom: 24 }}>
            <h4 className="text-label-md" style={{ color: "var(--r-outline)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Date Range</h4>
            <div className={styles.sheetChips}>
              {DATE_PRESETS.map(p => (
                <button
                  key={p.value}
                  className={`${styles.sheetChip} ${draftFilter.datePreset === p.value ? styles.sheetChipActive : ""}`}
                  onClick={() => handlePreset(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {draftFilter.datePreset === "custom" && (
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <div style={{ flex: 1 }}>
                  <label className="text-label-md" style={{ color: "var(--r-on-surface-variant)", display: "block", marginBottom: 4 }}>From</label>
                  <input
                    type="date"
                    className="r-input"
                    value={draftFilter.dateFrom}
                    onChange={e => setDraftFilter(f => ({ ...f, dateFrom: e.target.value }))}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="text-label-md" style={{ color: "var(--r-on-surface-variant)", display: "block", marginBottom: 4 }}>To</label>
                  <input
                    type="date"
                    className="r-input"
                    value={draftFilter.dateTo}
                    onChange={e => setDraftFilter(f => ({ ...f, dateTo: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </section>

          {/* Status */}
          <section style={{ marginBottom: 24 }}>
            <h4 className="text-label-md" style={{ color: "var(--r-outline)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Status</h4>
            <div className={styles.sheetChips}>
              <button
                className={`${styles.sheetChip} ${!draftFilter.status && !draftFilter.archived ? styles.sheetChipActive : ""}`}
                onClick={() => setDraftFilter(f => ({ ...f, status: "", archived: false }))}
              >
                All Active
              </button>
              {LEAD_STATUSES.map(s => (
                <button
                  key={s.value}
                  className={`${styles.sheetChip} ${draftFilter.status === s.value ? styles.sheetChipActive : ""}`}
                  onClick={() => setDraftFilter(f => ({ ...f, status: s.value, archived: false }))}
                >
                  {s.label}
                </button>
              ))}
              <button
                className={`${styles.sheetChip} ${draftFilter.archived ? styles.sheetChipActive : ""}`}
                onClick={() => setDraftFilter(f => ({ ...f, status: "", archived: true }))}
              >
                Archived
              </button>
            </div>
          </section>

          {/* Property Type */}
          <section style={{ marginBottom: 24 }}>
            <h4 className="text-label-md" style={{ color: "var(--r-outline)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Property Type</h4>
            <div className={styles.sheetChips}>
              {propertyChips.map(chip => (
                <button
                  key={chip}
                  className={`${styles.sheetChip} ${draftFilter.type === chip ? styles.sheetChipActive : ""}`}
                  onClick={() => setDraftFilter(f => ({ ...f, type: f.type === chip ? "" : chip }))}
                >
                  {chip}
                </button>
              ))}
            </div>
          </section>

          {/* Source */}
          <section style={{ marginBottom: 24 }}>
            <h4 className="text-label-md" style={{ color: "var(--r-outline)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Source</h4>
            <div className={styles.sheetChips}>
              <button
                className={`${styles.sheetChip} ${!draftFilter.source ? styles.sheetChipActive : ""}`}
                onClick={() => setDraftFilter(f => ({ ...f, source: "" }))}
              >
                Any
              </button>
              {LEAD_SOURCES.map(src => (
                <button
                  key={src}
                  className={`${styles.sheetChip} ${draftFilter.source === src ? styles.sheetChipActive : ""}`}
                  onClick={() => setDraftFilter(f => ({ ...f, source: f.source === src ? "" : src }))}
                >
                  {src}
                </button>
              ))}
            </div>
          </section>

          {/* Priority */}
          <section style={{ marginBottom: 24 }}>
            <h4 className="text-label-md" style={{ color: "var(--r-outline)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Priority</h4>
            <div className={styles.sheetChips}>
              <button
                className={`${styles.sheetChip} ${!draftFilter.priority ? styles.sheetChipActive : ""}`}
                onClick={() => setDraftFilter(f => ({ ...f, priority: "" }))}
              >
                Any
              </button>
              {priorityChips.map(p => (
                <button
                  key={p}
                  className={`${styles.sheetChip} ${draftFilter.priority === p ? styles.sheetChipActive : ""}`}
                  onClick={() => setDraftFilter(f => ({ ...f, priority: f.priority === p ? "" : p }))}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </section>

          {/* Footer actions */}
          <div style={{ display: "flex", gap: 12, paddingTop: 12, borderTop: "1px solid var(--r-outline-variant)", position: "sticky", bottom: 0, background: "var(--r-surface-container-lowest)" }}>
            <button className="r-btn r-btn-ghost" style={{ flex: 1 }} onClick={clearAllFilters}>
              Clear All
            </button>
            <button className="r-btn r-btn-primary" style={{ flex: 1 }} onClick={applyFilters}>
              Apply
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet open={showAdd} onClose={() => setShowAdd(false)} title="Add Lead" tall>
        <LeadForm leads={leads} quickMode onDone={() => setShowAdd(false)} onCancel={() => setShowAdd(false)} />
      </BottomSheet>

      <BottomSheet open={showBulk} onClose={() => setShowBulk(false)} title="Bulk Import Leads" tall>
        <BulkImport leads={leads} onDone={() => setShowBulk(false)} onCancel={() => setShowBulk(false)} />
      </BottomSheet>

      {/* Bulk WhatsApp Template Sheet */}
      <BottomSheet open={showBulkWA} onClose={() => setShowBulkWA(false)} title="Send WhatsApp to Selected">
        <div style={{ padding: 16 }}>
          <p className="text-body-md" style={{ color: "var(--r-on-surface-variant)", marginBottom: 12 }}>
            {selectedIds.size} lead{selectedIds.size > 1 ? "s" : ""} selected. Choose a template or send a quick message.
          </p>
          <button className="r-btn r-btn-primary" onClick={() => handleBulkWA()} style={{ width: "100%", marginBottom: 12 }}>
            Quick Message
          </button>
          {templates.map(t => (
            <button key={t.id} className="r-btn r-btn-ghost" onClick={() => handleBulkWA(t)} style={{ width: "100%", marginBottom: 8, justifyContent: "flex-start" }}>
              <MessageCircle size={16} /> {t.name}
            </button>
          ))}
          {templates.length === 0 && (
            <p className="text-body-md" style={{ color: "var(--r-outline)", textAlign: "center", padding: 12 }}>
              No templates yet. Create them in Settings.
            </p>
          )}
        </div>
      </BottomSheet>

      <PostCallSheet lead={postCall} open={!!postCall} onClose={() => setPostCall(null)} onDone={() => setPostCall(null)} />
    </div>
  );
}

function LeadCardDesign({ lead, isSelecting, isSelected, onTap, onLongPressStart, onLongPressEnd, onCall, onWA }) {
  const temp = getTempStyle(lead.temperature || "warm");
  const fu = formatFollowUp(lead.followUpDate);
  const overdue = isOverdue(lead.followUpDate);
  const initials = lead.name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";

  return (
    <div
      className={`${styles.leadCard} ${isSelected ? styles.leadCardSelected : ""}`}
      onClick={onTap}
      onMouseDown={onLongPressStart}
      onMouseUp={onLongPressEnd}
      onMouseLeave={onLongPressEnd}
      onTouchStart={onLongPressStart}
      onTouchEnd={onLongPressEnd}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Selection checkbox */}
      {isSelecting && (
        <div className={styles.selectBox}>
          {isSelected ? (
            <CheckSquare size={22} color="var(--r-primary)" />
          ) : (
            <Square size={22} color="var(--r-outline)" />
          )}
        </div>
      )}
      {/* Temperature corner badge */}
      {lead.temperature === "hot" && (
        <div className={styles.cornerBadge} style={{ background: "var(--r-error)" }}>Hot</div>
      )}
      {lead.temperature === "warm" && (
        <div className={styles.cornerBadge} style={{ background: "var(--r-secondary)" }}>Warm</div>
      )}
      {lead.temperature === "cold" && (
        <div className={styles.cornerBadge} style={{ background: "var(--r-outline)" }}>Cold</div>
      )}

      <div className={styles.cardTop}>
        <div className={styles.cardAvatar} style={{ background: temp.bg, color: temp.text }}>
          {initials}
        </div>
        <div className={styles.cardInfo}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3 className="text-body-lg" style={{ fontWeight: 600, color: "var(--r-primary)" }}>{lead.name}</h3>
            {typeof lead.aiScore === "number" && (
              <span className={styles.scoreBadge} style={{
                background: lead.aiScore >= 75 ? "var(--r-error-bg)" : lead.aiScore >= 50 ? "var(--r-secondary-fixed)" : "var(--r-surface-container-high)",
                color: lead.aiScore >= 75 ? "var(--r-error)" : lead.aiScore >= 50 ? "var(--r-secondary)" : "var(--r-on-surface-variant)"
              }}>{lead.aiScore}</span>
            )}
          </div>
          <p className="text-data-mono" style={{ color: "var(--r-on-surface-variant)" }}>+91 {lead.mobile}</p>
        </div>
      </div>

      <div className={styles.cardMeta}>
        {lead.projectInterest && (
          <div className={styles.metaRow}>
            <MapPin size={16} color="var(--r-secondary)" />
            <span className="text-body-md" style={{ color: "var(--r-on-surface-variant)" }}>
              {lead.bhk && `${lead.bhk} in `}{lead.projectInterest}
            </span>
          </div>
        )}
        <div className={styles.tagRow}>
          {lead.source && (
            <span className={styles.tag} style={{ background: "var(--r-secondary-fixed)", color: "var(--r-on-secondary-fixed)" }}>
              {lead.source}
            </span>
          )}
          {fu && (
            <span className={styles.tag} style={{
              background: overdue ? "var(--r-error-container)" : "var(--r-primary-fixed)",
              color: overdue ? "var(--r-error)" : "var(--r-on-primary-fixed)"
            }}>
              {overdue ? "⚠ " : ""}{fu}
            </span>
          )}
        </div>
        {lead.leadDate && (
          <div className={styles.metaRow} style={{ marginTop: 6 }}>
            <Calendar size={14} color="var(--r-outline)" />
            <span className="text-label-md" style={{ color: "var(--r-outline)" }}>
              Captured {formatShortDate(lead.leadDate)}
            </span>
          </div>
        )}
      </div>

      <div className={styles.cardBottom}>
        <span className={styles.statusBadge} style={{
          background: `${getTempStyle(lead.status).bg || "var(--r-surface-container-high)"}`,
          color: getTempStyle(lead.status).text || "var(--r-on-surface-variant)"
        }}>
          {getStatusLabel(lead.status)}
        </span>
        <button className={styles.viewDetails} onClick={e => { e.stopPropagation(); onTap(); }}>
          VIEW DETAILS <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function KanbanBoard({ leads, loading, isSelecting, selectedIds, onTap, onLongPressStart, onLongPressEnd, onMove }) {
  const router = useRouter();
  const columns = [
    { value: "new", label: "New", color: "var(--r-primary)" },
    { value: "contacted", label: "Contacted", color: "var(--r-primary-container)" },
    { value: "interested", label: "Interested", color: "var(--r-secondary)" },
    { value: "details_shared", label: "Details Shared", color: "var(--r-secondary-container)" },
    { value: "visit_scheduled", label: "Visit Scheduled", color: "var(--r-on-primary-container)" },
    { value: "visit_done", label: "Visited", color: "var(--r-success)" },
    { value: "negotiating", label: "Negotiation", color: "var(--r-warning)" },
    { value: "converted", label: "Won", color: "var(--r-secondary)" },
  ];

  if (loading) return <p className={styles.loadingMsg}>Loading leads…</p>;
  if (leads.length === 0) return (
    <EmptyState
      icon={<UsersIcon />}
      title="No leads yet"
      body="Tap + Add to capture your first lead."
      action={
        <button className="r-btn r-btn-primary" onClick={() => router.push("/leads/new")}>+ Add Lead</button>
      }
    />
  );

  return (
    <div className={styles.kanbanWrap}>
      <div className={styles.kanbanScroll}>
        {columns.map(col => {
          const colLeads = leads.filter(l => l.status === col.value);
          return (
            <div key={col.value} className={styles.kanbanColumn}>
              <div className={styles.kanbanHeader} style={{ borderLeft: `3px solid ${col.color}` }}>
                <span className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>{col.label}</span>
                <span className={styles.kanbanCount}>{colLeads.length}</span>
              </div>
              <div className={styles.kanbanCards}>
                {colLeads.map(lead => (
                  <KanbanCard
                    key={lead.id}
                    lead={lead}
                    isSelecting={isSelecting}
                    isSelected={selectedIds.has(lead.id)}
                    onTap={() => onTap(lead)}
                    onLongPressStart={() => onLongPressStart(lead.id)}
                    onLongPressEnd={onLongPressEnd}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KanbanCard({ lead, isSelecting, isSelected, onTap, onLongPressStart, onLongPressEnd }) {
  const temp = getTempStyle(lead.temperature || "warm");
  const initials = lead.name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";

  return (
    <div
      className={`${styles.kanbanCard} ${isSelected ? styles.leadCardSelected : ""}`}
      onClick={onTap}
      onMouseDown={onLongPressStart}
      onMouseUp={onLongPressEnd}
      onMouseLeave={onLongPressEnd}
      onTouchStart={onLongPressStart}
      onTouchEnd={onLongPressEnd}
      onContextMenu={e => e.preventDefault()}
    >
      {isSelecting && (
        <div className={styles.selectBox} style={{ top: 8, left: 8 }}>
          {isSelected ? (
            <CheckSquare size={18} color="var(--r-primary)" />
          ) : (
            <Square size={18} color="var(--r-outline)" />
          )}
        </div>
      )}
      <div className={styles.kanbanCardTop}>
        <div className={styles.kanbanAvatar} style={{ background: temp.bg, color: temp.text }}>{initials}</div>
        <div className={styles.kanbanInfo}>
          <p className="text-body-md" style={{ fontWeight: 600, color: "var(--r-primary)", lineHeight: 1.3 }}>{lead.name}</p>
          <p className="text-label-md" style={{ color: "var(--r-outline)", marginTop: 2 }}>+91 {lead.mobile}</p>
        </div>
      </div>
      {lead.projectInterest && (
        <p className="text-label-md" style={{ color: "var(--r-on-surface-variant)", marginTop: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {lead.projectInterest}
        </p>
      )}
      <div className={styles.kanbanTags}>
        <span className={`r-badge r-badge-${lead.temperature || "warm"}`} style={{ fontSize: 10, padding: "2px 8px" }}>
          {lead.temperature || "warm"}
        </span>
        {lead.followUpDate && (
          <span className="text-label-md" style={{ color: "var(--r-outline)" }}>
            {formatFollowUp(lead.followUpDate)}
          </span>
        )}
      </div>
    </div>
  );
}

function UsersIcon() {
  return <UsersIconSVG />;
}
function UsersIconSVG() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--r-outline)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}
