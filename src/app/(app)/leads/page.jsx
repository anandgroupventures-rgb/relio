"use client";
import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/hooks/useAuth";
import { useLeads } from "@/lib/hooks/useLeads";
import { filterLeads, sortLeads, getTempStyle, getStatusLabel, getCallStatusLabel, getCallStatusColor, isNew, isPipeline, isDisqualified, isBroker } from "@/lib/utils/leadHelpers";
import { CALL_STATUSES, PIPELINE_STATUSES, LEAD_SOURCES, BHK_OPTIONS } from "@/lib/utils/constants";
import { formatFollowUp, isOverdue, DATE_PRESETS, getPresetRange, formatShortDate, isValidDateStr } from "@/lib/utils/dateHelpers";
import BottomSheet from "@/components/shared/BottomSheet";
import EmptyState from "@/components/shared/EmptyState";
import { SkeletonList } from "@/components/shared/Skeleton";
import { bulkDeleteLeads, bulkArchiveLeads, updateLead } from "@/lib/firebase/leads";

const LeadForm = dynamic(() => import("@/components/leads/LeadForm"), { ssr: false });
const BulkImport = dynamic(() => import("@/components/leads/BulkImport"), { ssr: false });
const PostCallSheet = dynamic(() => import("@/components/leads/PostCallSheet"), { ssr: false });
import { Bell, Search, Phone, MessageCircle, Plus, MapPin, Home, ChevronRight, Trash2, Archive, X, CheckSquare, Square, LayoutGrid, List, Upload, SlidersHorizontal, Calendar, ArrowUpDown } from "lucide-react";
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
  const { leads, loading, uncontactedCount } = useLeads();

  const [search,  setSearch]  = useState(() => ssGet("leads_search", ""));
  const [filter,  setFilter]  = useState(() => ssGet("leads_filter", { status:"", source:"", type:"", priority:"", archived: false, dateFrom:"", dateTo:"", datePreset:"", showDisqualified: false, showBrokers: false }));
  const [sortBy,  setSortBy]  = useState(() => ssGet("leads_sortBy", "leadDate"));
  const [sortDir, setSortDir] = useState(() => ssGet("leads_sortDir", "desc"));
  const [activeTab, setActiveTab] = useState(() => ssGet("leads_tab", "new")); // new | pipeline
  const [pipelineView, setPipelineView] = useState(() => ssGet("leads_pipelineView", "list")); // list | kanban
  const [showAdd,  setShowAdd]  = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [postCall, setPostCall] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
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
  function handleActiveTab(val) { setActiveTab(val); ssSet("leads_tab", val); }
  function handlePipelineView(val) { setPipelineView(val); ssSet("leads_pipelineView", val); }

  const displayed = useMemo(() => {
    const bucket = activeTab === "new" ? "new" : "pipeline";
    const filtered = filterLeads(leads, { search, ...filter, bucket });
    return sortLeads(filtered, sortBy, sortDir);
  }, [leads, search, filter, sortBy, sortDir, activeTab]);

  function toggleSort(field) {
    if (sortBy === field) {
      handleSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      handleSortBy(field);
      handleSortDir("desc");
    }
  }

  function handleCall(lead) {
    const digits = lead.mobile?.replace(/\D/g, "") || "";
    const clean = digits.startsWith("91") ? digits.slice(2) : digits;
    window.open(`tel:${clean}`, "_self");
    setPostCall(lead);
  }
  function handleWA(lead) {
    const digits = lead.mobile?.replace(/\D/g, "") || "";
    const clean = digits.startsWith("91") ? digits.slice(2) : digits;
    window.open(`https://wa.me/91${clean}`, "_blank");
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
      const digits = lead.mobile?.replace(/\D/g, "") || "";
      const clean = digits.startsWith("91") ? digits.slice(2) : digits;
      window.open(`https://wa.me/91${clean}?text=${encoded}`, "_blank");
      setBulkWAProgress(i + 1);
      if (i < selectedLeads.length - 1) {
        await new Promise(r => setTimeout(r, 1200));
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
    if (sortBy !== "leadDate" || sortDir !== "desc") {
      const sortLabel = { leadDate: "Lead Date", name: "Name", priority: "Priority", followUp: "Follow-up", status: "Status" }[sortBy] || sortBy;
      pills.push({ key: "sort", label: `Sort: ${sortLabel} ${sortDir === "asc" ? "↑" : "↓"}`, onRemove: () => { handleSortBy("leadDate"); handleSortDir("desc"); } });
    }
    if (filter.status) pills.push({ key: "status", label: `Status: ${filter.status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}`, onRemove: () => handleFilter(f => ({ ...f, status: "" })) });
    if (filter.type) pills.push({ key: "type", label: `Type: ${filter.type}`, onRemove: () => handleFilter(f => ({ ...f, type: "" })) });
    if (filter.source) pills.push({ key: "source", label: `Source: ${filter.source}`, onRemove: () => handleFilter(f => ({ ...f, source: "" })) });
    if (filter.priority) pills.push({ key: "priority", label: `Priority: ${filter.priority.charAt(0).toUpperCase() + filter.priority.slice(1)}`, onRemove: () => handleFilter(f => ({ ...f, priority: "" })) });
    if (filter.archived) pills.push({ key: "archived", label: "Archived", onRemove: () => handleFilter(f => ({ ...f, archived: false })) });
    if (activeTab === "new" && filter.showBrokers) pills.push({ key: "brokers", label: "Brokers", onRemove: () => handleFilter(f => ({ ...f, showBrokers: false })) });
    if (activeTab === "new" && filter.showDisqualified) pills.push({ key: "disqualified", label: "Disqualified", onRemove: () => handleFilter(f => ({ ...f, showDisqualified: false })) });
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
    const empty = { status: "", source: "", type: "", priority: "", archived: false, dateFrom: "", dateTo: "", datePreset: "", showDisqualified: false, showBrokers: false };
    setDraftFilter(empty);
    setDraftSortBy("leadDate");
    setDraftSortDir("desc");
    setFilter(empty);
    setSortBy("leadDate");
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

  // Counts
  const newCount = leads.filter(l => isNew(l) && !isBroker(l) && !isDisqualified(l)).length;
  const brokerCount = leads.filter(isBroker).length;
  const disqualifiedCount = leads.filter(isDisqualified).length;

  return (
    <div className={`${styles.page} ${isSelecting ? styles.pageSelecting : ""}`}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          {isSelecting ? (
            <div className={styles.headerLeft} style={{ flex: 1 }}>
              <button className={styles.backBtn} onClick={clearSelection} aria-label="Cancel selection">
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
            <button className={styles.headerAction} onClick={selectAll} aria-label="Select all">
              <CheckSquare size={20} color="var(--r-primary)" />
            </button>
          ) : (
            <button className={styles.notifBtn} aria-label="Notifications">
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

        {/* Toolbar: Filter + Sort (visible on both tabs) */}
        <div className={styles.viewBar}>
          <button
            className={`${styles.filterTrigger} ${hasActiveFilters() ? styles.filterTriggerActive : ""}`}
            onClick={openFilters}
            aria-label="Open filters"
          >
            <SlidersHorizontal size={16} />
            {hasActiveFilters() && <span className={styles.filterBadge}>{activePills.length}</span>}
            <span className={styles.filterLabel}>Filters</span>
          </button>
          <button
            className={`${styles.filterTrigger} ${styles.sortTrigger} ${activeTab !== "new" ? styles.sortTriggerActive : ""}`}
            onClick={() => setShowSort(true)}
            aria-label="Sort leads"
          >
            <ArrowUpDown size={16} />
            <span className={styles.filterLabel}>
              {`Sort: ${sortBy === "leadDate" ? "Lead Date" : sortBy === "name" ? "Name" : sortBy === "priority" ? "Priority" : sortBy === "followUp" ? "Follow-up" : "Status"} ${sortDir === "asc" ? "↑" : "↓"}`}
            </span>
          </button>
        </div>

        {/* Main Tabs: New | Pipeline */}
        <div className={styles.tabBar} role="tablist" aria-label="Leads view">
          <button
            className={`${styles.tabBtn} ${activeTab === "new" ? styles.tabBtnActive : ""}`}
            onClick={() => handleActiveTab("new")}
            role="tab"
            aria-selected={activeTab === "new"}
            id="tab-new"
            aria-controls="panel-new"
          >
            New
            {newCount > 0 && <span className={styles.tabBadge}>{newCount}</span>}
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === "pipeline" ? styles.tabBtnActive : ""}`}
            onClick={() => handleActiveTab("pipeline")}
            role="tab"
            aria-selected={activeTab === "pipeline"}
            id="tab-pipeline"
            aria-controls="panel-pipeline"
          >
            Pipeline
          </button>
        </div>

        {/* ─── New Tab ───────────────────────────────────────────────────────── */}
        {activeTab === "new" && (
          <section className={styles.grid} role="tabpanel" id="panel-new" aria-labelledby="tab-new">
            {loading && <SkeletonList count={5} />}
            {!loading && displayed.length === 0 && (
              <EmptyState
                icon={<UsersIcon />}
                title="All caught up!"
                body="No new leads to contact. New enquiries will appear here."
                action={
                  <button className="r-btn r-btn-primary" onClick={() => router.push("/leads/new")}>+ Add Lead</button>
                }
              />
            )}
            {displayed.map(lead => (
              <NewTabCard
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
          </section>
        )}

        {/* ─── Pipeline Tab ──────────────────────────────────────────────────── */}
        {activeTab === "pipeline" && (
          <section role="tabpanel" id="panel-pipeline" aria-labelledby="tab-pipeline">
            {/* Pipeline toolbar: list/kanban/bulk */}
            <div className={styles.viewBar} style={{ justifyContent: "flex-end" }}>
              <div className={styles.viewToggle}>
                <button className={`${styles.viewBtn} ${pipelineView === "list" ? styles.viewBtnActive : ""}`} onClick={() => handlePipelineView("list")} aria-label="List view">
                  <List size={18} />
                </button>
                <button className={`${styles.viewBtn} ${pipelineView === "kanban" ? styles.viewBtnActive : ""}`} onClick={() => handlePipelineView("kanban")} aria-label="Kanban view">
                  <LayoutGrid size={18} />
                </button>
                <button className={styles.viewBtn} onClick={() => setShowBulk(true)} aria-label="Bulk import">
                  <Upload size={18} />
                </button>
              </div>
            </div>

            {/* Pipeline Content */}
            {pipelineView === "list" ? (
              <section className={styles.grid}>
                {loading && <SkeletonList count={5} />}
                {!loading && displayed.length === 0 && (
                  <EmptyState
                    icon={<UsersIcon />}
                    title={filter.showDisqualified ? "No disqualified leads" : "No pipeline leads"}
                    body={filter.showDisqualified ? "Disqualified leads will appear here." : "Qualified leads move here after first contact."}
                    action={
                      filter.showDisqualified ? (
                        <button className="r-btn r-btn-ghost" onClick={() => handleFilter(f => ({ ...f, showDisqualified: false }))}>View Active Pipeline</button>
                      ) : (
                        <button className="r-btn r-btn-primary" onClick={() => handleActiveTab("new")}>Contact New Leads</button>
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
              </section>
            ) : (
              <>
                {loading && <SkeletonList count={3} />}
                {!loading && (
                <KanbanBoard
                  leads={displayed}
                  loading={false}
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
              </>
            )}
          </section>
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
          {/* New View Toggle */}
          {activeTab === "new" && (
            <section style={{ marginBottom: 24 }}>
              <h4 className="text-label-md" style={{ color: "var(--r-outline)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>New View</h4>
              <div className={styles.sheetChips}>
                <button
                  className={`${styles.sheetChip} ${!draftFilter.showBrokers && !draftFilter.showDisqualified ? styles.sheetChipActive : ""}`}
                  onClick={() => setDraftFilter(f => ({ ...f, showBrokers: false, showDisqualified: false }))}
                >
                  Active New
                </button>
                <button
                  className={`${styles.sheetChip} ${draftFilter.showBrokers ? styles.sheetChipActive : ""}`}
                  onClick={() => setDraftFilter(f => ({ ...f, showBrokers: true, showDisqualified: false }))}
                >
                  Brokers ({brokerCount})
                </button>
                <button
                  className={`${styles.sheetChip} ${draftFilter.showDisqualified ? styles.sheetChipActive : ""}`}
                  onClick={() => setDraftFilter(f => ({ ...f, showBrokers: false, showDisqualified: true }))}
                >
                  Disqualified ({disqualifiedCount})
                </button>
              </div>
            </section>
          )}

          {/* Pipeline View Toggle */}
          {activeTab === "pipeline" && (
            <section style={{ marginBottom: 24 }}>
              <h4 className="text-label-md" style={{ color: "var(--r-outline)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Pipeline View</h4>
              <div className={styles.sheetChips}>
                <button
                  className={`${styles.sheetChip} ${!draftFilter.showDisqualified ? styles.sheetChipActive : ""}`}
                  onClick={() => setDraftFilter(f => ({ ...f, showDisqualified: false }))}
                >
                  Active Pipeline
                </button>
                <button
                  className={`${styles.sheetChip} ${draftFilter.showDisqualified ? styles.sheetChipActive : ""}`}
                  onClick={() => setDraftFilter(f => ({ ...f, showDisqualified: true }))}
                >
                  Show Lost
                </button>
              </div>
            </section>
          )}

          {/* Sort */}
          <section style={{ marginBottom: 24 }}>
            <h4 className="text-label-md" style={{ color: "var(--r-outline)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Sort by</h4>
            <div className={styles.sheetChips}>
              {[
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
            <h4 className="text-label-md" style={{ color: "var(--r-outline)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Lead Date Range</h4>
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
                className={`${styles.sheetChip} ${!draftFilter.status ? styles.sheetChipActive : ""}`}
                onClick={() => setDraftFilter(f => ({ ...f, status: "" }))}
              >
                All
              </button>
              {activeTab === "new" ? CALL_STATUSES.map(s => (
                <button
                  key={s.value}
                  className={`${styles.sheetChip} ${draftFilter.status === s.value ? styles.sheetChipActive : ""}`}
                  onClick={() => setDraftFilter(f => ({ ...f, status: s.value }))}
                >
                  {s.label}
                </button>
              )) : PIPELINE_STATUSES.map(s => (
                <button
                  key={s.value}
                  className={`${styles.sheetChip} ${draftFilter.status === s.value ? styles.sheetChipActive : ""}`}
                  onClick={() => setDraftFilter(f => ({ ...f, status: s.value }))}
                >
                  {s.label}
                </button>
              ))}
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

      {/* Sort Sheet */}
      <BottomSheet open={showSort} onClose={() => setShowSort(false)} title="Sort by">
        <div style={{ padding: "0 16px 24px" }}>
          <p className="text-body-md" style={{ color: "var(--r-on-surface-variant)", marginBottom: 12 }}>
            Choose a field and direction
          </p>
          {[
            { key: "leadDate", label: "Lead Date" },
            { key: "name", label: "Name" },
            { key: "priority", label: "Priority" },
            { key: "followUp", label: "Follow-up" },
            { key: "status", label: "Status" },
          ].map(o => (
            <button
              key={o.key}
              className={`${styles.sheetChip} ${sortBy === o.key ? styles.sheetChipActive : ""}`}
              onClick={() => {
                if (sortBy === o.key) {
                  handleSortDir(sortDir === "asc" ? "desc" : "asc");
                } else {
                  handleSortBy(o.key);
                  handleSortDir("desc");
                }
                setShowSort(false);
              }}
              style={{ width: "100%", justifyContent: "space-between", marginBottom: 8 }}
            >
              <span>{o.label}</span>
              <span style={{ opacity: sortBy === o.key ? 1 : 0.4 }}>
                {sortBy === o.key ? (sortDir === "asc" ? "↑ Ascending" : "↓ Descending") : ""}
              </span>
            </button>
          ))}
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

// ─── Type color helper ───────────────────────────────────────────────────────
const TYPE_COLORS = {
  buyer:     { bg: "#2563EB", label: "Buyer" },
  seller:    { bg: "#059669", label: "Seller" },
  tenant:    { bg: "#D97706", label: "Tenant" },
  landlord:  { bg: "#7C3AED", label: "Landlord" },
};
function getTypeColor(type) {
  const key = (type || "").toString().trim().toLowerCase();
  return TYPE_COLORS[key] || { bg: "var(--r-outline)", label: type || "—" };
}

const STATUS_COLORS = {
  new:              { bg: "#e5e7eb", color: "#374151" },
  contacted:        { bg: "#dbeafe", color: "#1e40af" },
  interested:       { bg: "#fef3c7", color: "#92400e" },
  details_shared:   { bg: "#e0e7ff", color: "#3730a3" },
  visit_scheduled:  { bg: "#fce7f3", color: "#9d174d" },
  visit_done:       { bg: "#d1fae5", color: "#065f46" },
  negotiating:      { bg: "#ffedd5", color: "#9a3412" },
  converted:        { bg: "#dcfce7", color: "#15803d" },
  call_back:        { bg: "#e0f2fe", color: "#075985" },
  not_answering:    { bg: "#fef3c7", color: "#92400e" },
  call_back:        { bg: "#dbeafe", color: "#1e40af" },
  qualified:        { bg: "#dcfce7", color: "#15803d" },
  disqualified:     { bg: "#fee2e2", color: "#991b1b" },
  broker:           { bg: "#ede9fe", color: "#5b21b6" },
};
function getStatusColors(status) {
  return STATUS_COLORS[status] || { bg: "var(--r-surface-container-high)", color: "var(--r-on-surface-variant)" };
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map(n => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ─── Shared Lead Card Shell ─────────────────────────────────────────────────
function LeadCard({ lead, isSelecting, isSelected, onTap, onLongPressStart, onLongPressEnd, onCall, onWA, showStatus, showCallStatus, showBudget, showTemp }) {
  const typeInfo = getTypeColor(lead.type);
  const hasValidDate = isValidDateStr(lead.leadDate);
  const statusColors = getStatusColors(showCallStatus ? lead.callStatus : lead.status);
  const fu = formatFollowUp(lead.followUpDate);
  const overdue = isOverdue(lead.followUpDate);
  const statusLabel = showCallStatus ? getCallStatusLabel(lead.callStatus) : getStatusLabel(lead.status);

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
      {/* Left type strip */}
      <div className={styles.typeStrip} style={{ background: typeInfo.bg }} />

      {/* Selection checkbox (top-right) */}
      {isSelecting && (
        <div className={styles.selectBox}>
          {isSelected ? <CheckSquare size={20} color="var(--r-primary)" /> : <Square size={20} color="var(--r-outline)" />}
        </div>
      )}

      <div className={styles.cardInner}>
        {/* Avatar */}
        <div className={styles.cardLeft}>
          <div className={styles.cardAvatar} style={{ background: typeInfo.bg }}>
            {getInitials(lead.name)}
          </div>
        </div>

        {/* Body */}
        <div className={styles.cardBody}>
          {/* Row 1: Name + Project */}
          <div className={styles.cardRow1}>
            <span className={styles.cardName}>{lead.name}</span>
            {lead.projectInterest && (
              <span className={styles.cardProject}>{lead.projectInterest}</span>
            )}
          </div>

          {/* Row 2: Type pill + Date + Follow-up */}
          <div className={styles.cardRow2}>
            <span className={styles.typePill} style={{ background: typeInfo.bg }}>{typeInfo.label}</span>
            {hasValidDate && (
              <span className={styles.cardMetaText}>
                <Calendar size={12} color="var(--r-outline)" /> {formatShortDate(lead.leadDate)}
              </span>
            )}
            {fu && (
              <span className={styles.cardMetaText} style={{ color: overdue ? "var(--r-error)" : "var(--r-secondary)", fontWeight: 600 }}>
                <Calendar size={12} color={overdue ? "var(--r-error)" : "var(--r-secondary)"} />
                <span>{overdue ? "Overdue: " : ""}{fu}</span>
              </span>
            )}
          </div>

          {/* Row 3: Status + Temp + Score */}
          {(showStatus || showCallStatus) && (
            <div className={styles.cardRow3}>
              <span className={styles.statusBadge} style={{ background: statusColors.bg, color: statusColors.color }}>
                {statusLabel}
              </span>
              {showTemp && lead.temperature && (
                <span className={styles.tempBadge} style={{
                  background: lead.temperature === "hot" ? "var(--r-error-bg)" : lead.temperature === "warm" ? "var(--r-secondary-fixed)" : "var(--r-surface-container-high)",
                  color: lead.temperature === "hot" ? "var(--r-error)" : lead.temperature === "warm" ? "var(--r-secondary)" : "var(--r-on-surface-variant)",
                }}>
                  {lead.temperature}
                </span>
              )}
              {typeof lead.aiScore === "number" && (
                <span className={styles.scoreBadge} style={{
                  background: lead.aiScore >= 75 ? "var(--r-error-bg)" : lead.aiScore >= 50 ? "var(--r-secondary-fixed)" : "var(--r-surface-container-high)",
                  color: lead.aiScore >= 75 ? "var(--r-error)" : lead.aiScore >= 50 ? "var(--r-secondary)" : "var(--r-on-surface-variant)"
                }}>{lead.aiScore}</span>
              )}
            </div>
          )}

          {/* Row 4: Budget (conditional) */}
          {showBudget && lead.budget && (
            <div className={styles.cardRow3}>
              <span className={styles.cardMetaText} style={{ fontWeight: 600 }}>
                Budget: {lead.budget}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className={styles.cardActions} onClick={e => e.stopPropagation()}>
          <button className={styles.actionBtnCircle} onClick={onCall} aria-label="Call" style={{ background: "var(--r-primary)", color: "#fff" }}>
            <Phone size={14} />
          </button>
          <button className={styles.actionBtnCircle} onClick={onWA} aria-label="WhatsApp" style={{ background: "#25D366", color: "#fff" }}>
            <MessageCircle size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── New Tab Card ─────────────────────────────────────────────────────────────
function NewTabCard({ lead, isSelecting, isSelected, onTap, onLongPressStart, onLongPressEnd, onCall, onWA }) {
  return (
    <LeadCard
      lead={lead}
      isSelecting={isSelecting}
      isSelected={isSelected}
      onTap={onTap}
      onLongPressStart={onLongPressStart}
      onLongPressEnd={onLongPressEnd}
      onCall={onCall}
      onWA={onWA}
      showCallStatus={true}
      showStatus={false}
      showBudget={false}
      showTemp={false}
    />
  );
}

// ─── Pipeline Lead Card ────────────────────────────────────────────────────
function LeadCardDesign({ lead, isSelecting, isSelected, onTap, onLongPressStart, onLongPressEnd, onCall, onWA }) {
  return (
    <LeadCard
      lead={lead}
      isSelecting={isSelecting}
      isSelected={isSelected}
      onTap={onTap}
      onLongPressStart={onLongPressStart}
      onLongPressEnd={onLongPressEnd}
      onCall={onCall}
      onWA={onWA}
      showStatus={true}
      showCallStatus={false}
      showBudget={true}
      showTemp={true}
    />
  );
}

// ─── Kanban Board ──────────────────────────────────────────────────────────
function KanbanBoard({ leads, loading, isSelecting, selectedIds, onTap, onLongPressStart, onLongPressEnd, onMove }) {
  const router = useRouter();
  const columns = [
    { value: "qualified", label: "Qualified", color: "var(--r-primary)" },
    { value: "details_shared", label: "Details Shared", color: "var(--r-secondary)" },
    { value: "visit_scheduled", label: "Visit Scheduled", color: "var(--r-on-primary-container)" },
    { value: "visit_done", label: "Visited", color: "var(--r-success)" },
    { value: "deal_meeting_awaited", label: "Deal Meeting", color: "var(--r-warning)" },
    { value: "won", label: "Won", color: "var(--r-secondary)" },
  ];

  if (loading) return <p className={styles.loadingMsg}>Loading leads…</p>;
  if (leads.length === 0) return (
    <EmptyState
      icon={<UsersIcon />}
      title="No pipeline leads"
      body="Qualified leads appear here after first contact."
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
