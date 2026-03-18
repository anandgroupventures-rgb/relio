"use client";
import { useState, useMemo } from "react";
import { deleteInventory } from "@/lib/firebase/inventory";
import { useAuth } from "@/lib/hooks/useAuth";
import { useInventory } from "@/lib/hooks/useInventory";
import { stalenessLevel } from "@/lib/utils/dateHelpers";
import { AVAILABILITY } from "@/lib/utils/constants";
import InvCard from "@/components/inventory/InvCard";
import InvForm from "@/components/inventory/InvForm";
import InvBulkImport from "@/components/inventory/InvBulkImport";
import BottomSheet from "@/components/shared/BottomSheet";
import EmptyState from "@/components/shared/EmptyState";
import styles from "./inventory.module.css";

// ─── sessionStorage helpers ───────────────────────────────────────────────────
function ssGet(key, fallback) {
  try { const v = sessionStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function ssSet(key, value) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export default function InventoryPage() {
  const { user } = useAuth();
  const { inventory, loading } = useInventory();

  const [search,      setSearch]      = useState(() => ssGet("inv_search",      ""));
  const [filterAvail, setFilterAvail] = useState(() => ssGet("inv_filterAvail", ""));
  const [filterStale, setFilterStale] = useState(() => ssGet("inv_filterStale", ""));
  const [showAdd,     setShowAdd]     = useState(false);
  const [showBulk,    setShowBulk]    = useState(false);
  const [editItem,    setEditItem]    = useState(null);
  const [showDelete,  setShowDelete]  = useState(null);
  const [showShare,   setShowShare]   = useState(null);

  // Persist every change to sessionStorage
  function handleSearch(val)      { setSearch(val);      ssSet("inv_search",      val); }
  function handleFilterAvail(val) { setFilterAvail(val); ssSet("inv_filterAvail", val); }
  function handleFilterStale(val) { setFilterStale(val); ssSet("inv_filterStale", val); }

  const displayed = useMemo(() => inventory.filter(i => {
    if (search) {
      const q = search.toLowerCase();
      if (!([i.projectName, i.area, i.ownerName, i.bhk, i.remarks]
        .some(v => v?.toLowerCase().includes(q)))) return false;
    }
    if (filterAvail && i.availability !== filterAvail) return false;
    if (filterStale) {
      const s = stalenessLevel(i.lastOwnerContacted);
      if (s.level !== filterStale) return false;
    }
    return true;
  }), [inventory, search, filterAvail, filterStale]);

  function buildShareText(item) {
    return [
      `🏠 *${item.projectName}*`,
      item.bhk   ? `📐 ${item.bhk}${item.size ? ` · ${item.size} sqft` : ""}` : "",
      item.area  ? `📍 ${item.area}` : "",
      item.unit  ? `🔢 Unit: ${item.unit}` : "",
      item.price ? `💰 ${item.price}` : "",
      item.remarks ? `\n📝 ${item.remarks}` : "",
      `\n_Shared via Relio_`,
    ].filter(Boolean).join("\n");
  }

  async function handleDelete() {
    if (!showDelete) return;
    await deleteInventory(user.uid, showDelete.id);
    setShowDelete(null);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Inventory
          <span className={styles.count}>{displayed.length}</span>
        </h1>
        <div className={styles.headerBtns}>
          <button className={styles.importBtn} onClick={() => setShowBulk(true)}>⬆ Import</button>
          <button className={styles.addBtn}    onClick={() => setShowAdd(true)}>+ Add</button>
        </div>
      </header>

      <div className={styles.searchRow}>
        <input className={styles.searchInput}
          placeholder="Search project, area, owner…"
          value={search} onChange={e => handleSearch(e.target.value)} />
        {search && <button className={styles.clearBtn} onClick={() => handleSearch("")}>✕</button>}
      </div>

      <div className={styles.filterRow}>
        <select className={styles.filterSelect} value={filterAvail}
          onChange={e => handleFilterAvail(e.target.value)}>
          <option value="">All availability</option>
          {AVAILABILITY.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
        <select className={styles.filterSelect} value={filterStale}
          onChange={e => handleFilterStale(e.target.value)}>
          <option value="">All freshness</option>
          <option value="fresh">🟢 Fresh (&lt;14 days)</option>
          <option value="aging">🟡 Aging (14–21 days)</option>
          <option value="stale">🔴 Stale (21+ days)</option>
        </select>
      </div>

      <div className={styles.list}>
        {loading && <p className={styles.msg}>Loading inventory…</p>}
        {!loading && displayed.length === 0 && (
          <EmptyState icon="🏠" title="No properties yet"
            body="Add your first property or import a spreadsheet."
            action={
              <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap" }}>
                <button className="relio-btn relio-btn-primary" onClick={() => setShowAdd(true)}>+ Add Property</button>
                <button className="relio-btn relio-btn-ghost"   onClick={() => setShowBulk(true)}>⬆ Bulk Import</button>
              </div>
            } />
        )}
        {displayed.map(item => (
          <InvCard key={item.id} item={item}
            onEdit={() => setEditItem(item)}
            onCall={() => window.open(`tel:${item.ownerMobile}`, "_self")}
            onWhatsApp={() => window.open(`https://wa.me/91${item.ownerMobile?.replace(/\D/g,"")}`, "_blank")}
            onShare={() => setShowShare(item)} />
        ))}
      </div>

      <button className={styles.fab} onClick={() => setShowAdd(true)}>+</button>

      <BottomSheet open={showAdd}  onClose={() => setShowAdd(false)}  title="Add Property" tall>
        <InvForm onDone={() => setShowAdd(false)} onCancel={() => setShowAdd(false)} />
      </BottomSheet>

      <BottomSheet open={!!editItem} onClose={() => setEditItem(null)} title="Edit Property" tall>
        <InvForm item={editItem} onDone={() => setEditItem(null)} onCancel={() => setEditItem(null)} />
      </BottomSheet>

      <BottomSheet open={showBulk} onClose={() => setShowBulk(false)} title="Bulk Import Properties" tall>
        <InvBulkImport onDone={() => setShowBulk(false)} onCancel={() => setShowBulk(false)} />
      </BottomSheet>

      <BottomSheet open={!!showShare} onClose={() => setShowShare(null)} title="Share Property">
        {showShare && (
          <div style={{ padding:"16px 20px 24px", display:"flex", flexDirection:"column", gap:12 }}>
            <textarea className="relio-input" rows={8} readOnly
              value={buildShareText(showShare)}
              style={{ resize:"none", fontFamily:"monospace", fontSize:13 }} />
            <button className="relio-btn relio-btn-primary"
              onClick={() => {
                const wa = encodeURIComponent(buildShareText(showShare));
                window.open(`https://wa.me/?text=${wa}`, "_blank");
              }} style={{ width:"100%" }}>
              Share via WhatsApp 💬
            </button>
            <button className="relio-btn relio-btn-ghost"
              onClick={() => { navigator.clipboard?.writeText(buildShareText(showShare)); setShowShare(null); }}
              style={{ width:"100%" }}>
              Copy to clipboard
            </button>
            <button className="relio-btn relio-btn-danger"
              style={{ width:"100%", marginTop:4 }}
              onClick={() => { setShowDelete(showShare); setShowShare(null); }}>
              🗑 Delete Property
            </button>
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={!!showDelete} onClose={() => setShowDelete(null)} title="Delete Property">
        <div style={{ padding:"16px 20px 24px", display:"flex", flexDirection:"column", gap:12 }}>
          <p style={{ fontSize:15, color:"var(--relio-text)" }}>
            Delete <strong>{showDelete?.projectName}</strong>? Cannot be undone.
          </p>
          <button className="relio-btn relio-btn-danger" onClick={handleDelete} style={{ width:"100%" }}>Delete Property</button>
          <button className="relio-btn relio-btn-ghost"  onClick={() => setShowDelete(null)} style={{ width:"100%" }}>Cancel</button>
        </div>
      </BottomSheet>
    </div>
  );
}
