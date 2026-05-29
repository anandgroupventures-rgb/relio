"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { deleteInventory } from "@/lib/firebase/inventory";
import { useAuth } from "@/lib/hooks/useAuth";
import { useInventory } from "@/lib/hooks/useInventory";
import { stalenessLevel } from "@/lib/utils/dateHelpers";
import { AVAILABILITY } from "@/lib/utils/constants";
import InvCard from "@/components/inventory/InvCard";
import BottomSheet from "@/components/shared/BottomSheet";
import EmptyState from "@/components/shared/EmptyState";

const InvForm = dynamic(() => import("@/components/inventory/InvForm"), { ssr: false });
const InvBulkImport = dynamic(() => import("@/components/inventory/InvBulkImport"), { ssr: false });
import { ArrowLeft, Bell, Search, Plus, Home, MapPin, TrendingUp } from "lucide-react";
import styles from "./inventory.module.css";

function ssGet(key, fallback) {
  try { const v = sessionStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function ssSet(key, value) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function MarketTrends({ inventory }) {
  // Aggregate price history by area
  const areaTrends = useMemo(() => {
    const areaMap = {};
    for (const item of inventory) {
      const area = item.area || item.projectName || "Unknown";
      if (!areaMap[area]) areaMap[area] = { prices: [], history: [] };
      if (item.pricePerSqft || item.totalPrice) {
        areaMap[area].prices.push(parseFloat(item.pricePerSqft || item.totalPrice) || 0);
      }
      if (item.priceHistory) {
        areaMap[area].history.push(...item.priceHistory);
      }
    }

    const trends = [];
    for (const [area, data] of Object.entries(areaMap)) {
      if (data.prices.length === 0) continue;
      const avg = data.prices.reduce((a, b) => a + b, 0) / data.prices.length;
      // Calculate change from oldest to newest history entry
      let change = 0;
      let changePct = 0;
      if (data.history.length >= 2) {
        const sorted = [...data.history].sort((a, b) => new Date(a.date) - new Date(b.date));
        const oldest = parseFloat(sorted[0].pricePerSqft || sorted[0].price || sorted[0].totalPrice) || avg;
        const newest = parseFloat(sorted[sorted.length - 1].pricePerSqft || sorted[sorted.length - 1].price || sorted[sorted.length - 1].totalPrice) || avg;
        if (oldest > 0) {
          change = newest - oldest;
          changePct = ((change) / oldest) * 100;
        }
      }
      trends.push({ area, avg: Math.round(avg), change: Math.round(change), changePct: Math.round(changePct * 10) / 10, count: data.prices.length });
    }
    return trends.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)).slice(0, 5);
  }, [inventory]);

  if (areaTrends.length === 0) return null;

  return (
    <section className={`r-card ${styles.trendsCard}`}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <TrendingUp size={18} color="var(--r-secondary)" />
        <h2 className="text-headline-md">Market Trends</h2>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {areaTrends.map(t => (
          <div key={t.area} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "var(--r-surface-container-low)", borderRadius: "var(--r-radius)" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="text-body-md" style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.area}</p>
              <p className="text-label-md" style={{ color: "var(--r-outline)" }}>{t.count} propert{t.count > 1 ? "ies" : "y"} · Avg ₹{t.avg.toLocaleString("en-IN")}</p>
            </div>
            {t.changePct !== 0 && (
              <span className="text-body-md" style={{
                fontWeight: 700,
                color: t.changePct > 0 ? "var(--r-error)" : "var(--r-success)",
                whiteSpace: "nowrap"
              }}>
                {t.changePct > 0 ? "↑" : "↓"} {Math.abs(t.changePct)}%
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function InventoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { inventory, loading } = useInventory();

  const [search, setSearch] = useState(() => ssGet("inv_search", ""));
  const [filterAvail, setFilterAvail] = useState(() => ssGet("inv_filterAvail", ""));
  const [filterStale, setFilterStale] = useState(() => ssGet("inv_filterStale", ""));
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showDelete, setShowDelete] = useState(null);
  const [showShare, setShowShare] = useState(null);

  function handleSearch(val) { setSearch(val); ssSet("inv_search", val); }
  function handleFilterAvail(val) { setFilterAvail(val); ssSet("inv_filterAvail", val); }
  function handleFilterStale(val) { setFilterStale(val); ssSet("inv_filterStale", val); }

  const displayed = useMemo(() => inventory.filter(i => {
    if (search) {
      const q = search.toLowerCase();
      if (!([i.projectName, i.area, i.ownerName, i.bhk, i.remarks].some(v => v?.toLowerCase().includes(q)))) return false;
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
      item.bhk ? `📐 ${item.bhk}${item.size ? ` · ${item.size} sqft` : ""}` : "",
      item.area ? `📍 ${item.area}` : "",
      item.unit ? `🔢 Unit: ${item.unit}` : "",
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
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <button className={styles.backBtn} onClick={() => router.push("/today")}>
              <ArrowLeft size={22} color="var(--r-primary)" />
            </button>
            <h1 className="text-headline-md" style={{ color: "var(--r-primary)" }}>Inventory</h1>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.headerIcon} onClick={() => setShowAdd(true)}>
              <Plus size={20} color="var(--r-primary)" />
            </button>
            <button className={styles.notifBtn}>
              <Bell size={20} color="var(--r-on-surface-variant)" />
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {/* Search */}
        <div className={styles.searchWrap}>
          <Search size={18} color="var(--r-outline)" className={styles.searchIcon} />
          <input className={styles.searchInput} placeholder="Search project, area, owner..." value={search} onChange={e => handleSearch(e.target.value)} />
          {search && <button className={styles.clearBtn} onClick={() => handleSearch("")}>×</button>}
        </div>

        {/* Filters */}
        <div className={styles.filterRow}>
          <select className="r-input" value={filterAvail} onChange={e => handleFilterAvail(e.target.value)}>
            <option value="">All availability</option>
            {AVAILABILITY.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
          <select className="r-input" value={filterStale} onChange={e => handleFilterStale(e.target.value)}>
            <option value="">All freshness</option>
            <option value="fresh">Fresh (&lt;14 days)</option>
            <option value="aging">Aging (14–21 days)</option>
            <option value="stale">Stale (21+ days)</option>
          </select>
        </div>

        {/* KPI Cards */}
        <div className={styles.kpiRow}>
          <div className={`r-card ${styles.kpiCard}`}>
            <Home size={18} color="var(--r-primary)" />
            <span className="text-headline-md" style={{ color: "var(--r-primary)" }}>{inventory.length}</span>
            <span className="text-label-md" style={{ color: "var(--r-outline)" }}>Total</span>
          </div>
          <div className={`r-card ${styles.kpiCard}`}>
            <MapPin size={18} color="var(--r-secondary)" />
            <span className="text-headline-md" style={{ color: "var(--r-primary)" }}>{inventory.filter(i => i.availability === "available").length}</span>
            <span className="text-label-md" style={{ color: "var(--r-outline)" }}>Available</span>
          </div>
          <div className={`r-card ${styles.kpiCard}`}>
            <TrendingUp size={18} color="var(--r-error)" />
            <span className="text-headline-md" style={{ color: "var(--r-primary)" }}>{inventory.filter(i => stalenessLevel(i.lastOwnerContacted).level === "stale").length}</span>
            <span className="text-label-md" style={{ color: "var(--r-outline)" }}>Stale</span>
          </div>
        </div>

        {/* Market Trends */}
        <MarketTrends inventory={inventory} />

        {/* List */}
        <div className={styles.list}>
          {loading && <p className="text-body-md" style={{ color: "var(--r-outline)", textAlign: "center", padding: 40 }}>Loading inventory…</p>}
          {!loading && displayed.length === 0 && (
            <EmptyState icon={<Home size={48} color="var(--r-outline)" />} title="No properties yet"
              body="Add your first property or import a spreadsheet."
              action={
                <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                  <button className="r-btn r-btn-primary" onClick={() => router.push("/inventory/new")}>+ Add Property</button>
                  <button className="r-btn r-btn-ghost" onClick={() => setShowBulk(true)}>Bulk Import</button>
                </div>
              } />
          )}
          {displayed.map(item => (
            <InvCard key={item.id} item={item}
              onEdit={() => setEditItem(item)}
              onCall={() => window.open(`tel:${item.ownerMobile}`, "_self")}
              onWhatsApp={() => window.open(`https://wa.me/91${item.ownerMobile?.replace(/\D/g, "")}`, "_blank")}
              onShare={() => setShowShare(item)} />
          ))}
        </div>
      </main>

      {/* FAB */}
      <button className="r-fab" onClick={() => router.push("/inventory/new")}>
        <Plus size={28} />
      </button>

      <BottomSheet open={!!editItem} onClose={() => setEditItem(null)} title="Edit Property" tall>
        <InvForm item={editItem} onDone={() => setEditItem(null)} onCancel={() => setEditItem(null)} />
      </BottomSheet>

      <BottomSheet open={showBulk} onClose={() => setShowBulk(false)} title="Bulk Import Properties" tall>
        <InvBulkImport onDone={() => setShowBulk(false)} onCancel={() => setShowBulk(false)} />
      </BottomSheet>

      <BottomSheet open={!!showShare} onClose={() => setShowShare(null)} title={showShare?.projectName || "Property"}>
        {showShare && (
          <div style={{ padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Price History */}
            {showShare.priceHistory && showShare.priceHistory.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <p className="text-label-md" style={{ color: "var(--r-outline)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Price History</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {showShare.priceHistory.map((h, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--r-surface-container-low)", borderRadius: "var(--r-radius)" }}>
                      <span className="text-body-md">{h.price || h.totalPrice || h.pricePerSqft}</span>
                      <span className="text-label-md" style={{ color: "var(--r-outline)" }}>{h.date}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--r-primary-fixed)", borderRadius: "var(--r-radius)" }}>
                    <span className="text-body-md" style={{ fontWeight: 600 }}>{showShare.price || showShare.totalPrice || showShare.pricePerSqft || "Current"}</span>
                    <span className="text-label-md" style={{ color: "var(--r-primary)" }}>Now</span>
                  </div>
                </div>
              </div>
            )}
            <textarea className="r-input" rows={6} readOnly value={buildShareText(showShare)} style={{ resize: "none", fontFamily: "monospace", fontSize: 13 }} />
            <button className="r-btn r-btn-primary" onClick={() => {
              const wa = encodeURIComponent(buildShareText(showShare));
              window.open(`https://wa.me/?text=${wa}`, "_blank");
            }} style={{ width: "100%" }}>Share via WhatsApp</button>
            <button className="r-btn r-btn-ghost" onClick={() => { navigator.clipboard?.writeText(buildShareText(showShare)); setShowShare(null); }} style={{ width: "100%" }}>Copy to clipboard</button>
            <button className="r-btn r-btn-danger" style={{ width: "100%", marginTop: 4 }} onClick={() => { setShowDelete(showShare); setShowShare(null); }}>Delete Property</button>
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={!!showDelete} onClose={() => setShowDelete(null)} title="Delete Property">
        <div style={{ padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
          <p className="text-body-md" style={{ color: "var(--r-on-surface)" }}>Delete <strong>{showDelete?.projectName}</strong>? Cannot be undone.</p>
          <button className="r-btn r-btn-danger" onClick={handleDelete} style={{ width: "100%" }}>Delete Property</button>
          <button className="r-btn r-btn-ghost" onClick={() => setShowDelete(null)} style={{ width: "100%" }}>Cancel</button>
        </div>
      </BottomSheet>
    </div>
  );
}
