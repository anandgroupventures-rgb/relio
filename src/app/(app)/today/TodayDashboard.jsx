"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/hooks/useAuth";
import { useLeads } from "@/lib/hooks/useLeads";
import { useInventory } from "@/lib/hooks/useInventory";
import { useSyncStatus } from "@/lib/hooks/useSyncStatus";
import { isOverdue, isToday, formatFollowUp, stalenessLevel } from "@/lib/utils/dateHelpers";
import { getTempStyle, getStatusLabel, getStatusColor, isUncontacted } from "@/lib/utils/leadHelpers";
import { LEAD_STATUSES } from "@/lib/utils/constants";
import { getFollowupSuggestions, findMatchingProperties } from "@/lib/utils/smartSuggestions";
import BottomSheet from "@/components/shared/BottomSheet";

const LeadForm = dynamic(() => import("@/components/leads/LeadForm"), { ssr: false });
const PostCallSheet = dynamic(() => import("@/components/leads/PostCallSheet"), { ssr: false });
import { TrendingUp, Zap, MapPin, Handshake, Wallet, Plus, Phone, MessageCircle, ChevronRight, Home, Sparkles, AlertTriangle, CloudOff, RefreshCw } from "lucide-react";
import NavMenu from "@/components/layout/NavMenu";
import styles from "./today.module.css";

export default function TodayDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { leads, loading: leadsLoading, isOffline } = useLeads();
  const { inventory } = useInventory();
  const syncStatus = useSyncStatus();

  const [showAddLead, setShowAddLead] = useState(false);
  const [postCallLead, setPostCallLead] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const firstName = user?.displayName?.split(" ")[0] || "";

  // Stats
  const activeLeads = leads.filter(l => l.status !== "new" && !["converted", "lost", "disqualified", "invalid_number"].includes(l.status));
  const hotLeads = leads.filter(l => l.temperature === "hot" && l.status !== "new" && !["converted", "lost"].includes(l.status));
  const overdue = leads.filter(l => l.followUpDate && isOverdue(l.followUpDate) && l.status !== "new" && !["converted", "lost", "disqualified", "invalid_number"].includes(l.status));
  const dueToday = leads.filter(l => l.followUpDate && isToday(l.followUpDate) && l.status !== "new");
  const siteVisits = leads.filter(l => l.status === "visit_scheduled" && l.followUpDate && isToday(l.followUpDate));
  const converted = leads.filter(l => l.status === "converted");
  const bookings = leads.filter(l => l.status === "negotiating" || l.status === "converted");

  // Needs first contact
  const needsContact = leads.filter(isUncontacted).sort((a, b) => {
    const da = a.leadDate || "9999";
    const db = b.leadDate || "9999";
    return da < db ? -1 : da > db ? 1 : 0;
  });

  const availableProperties = inventory.filter(i => i.availability === "available");
  const staleInv = inventory.filter(i => {
    const s = stalenessLevel(i.lastOwnerContacted);
    return s.level === "stale" && i.availability === "available";
  });

  // Smart suggestions
  const followupSuggestions = getFollowupSuggestions(leads);
  const matchAlerts = [];
  for (const lead of activeLeads) {
    const matches = findMatchingProperties(lead, inventory, 50);
    if (matches.length > 0) {
      matchAlerts.push({ lead, topMatch: matches[0], count: matches.length });
    }
  }
  matchAlerts.sort((a, b) => b.topMatch.match.score - a.topMatch.match.score);
  const topMatchAlerts = matchAlerts.slice(0, 3);

  // Funnel counts
  const funnel = {
    new: leads.filter(l => l.status === "new").length,
    contacted: leads.filter(l => l.status === "contacted").length,
    visited: leads.filter(l => l.status === "visit_done").length,
    negotiating: leads.filter(l => l.status === "negotiating").length,
    closed: converted.length,
  };
  const funnelMax = Math.max(funnel.new, 1);

  function handleCall(lead) {
    window.open(`tel:${lead.mobile}`, "_self");
    setPostCallLead(lead);
  }
  function handleWA(lead) {
    window.open(`https://wa.me/91${lead.mobile?.replace(/\D/g, "")}`, "_blank");
  }

  // Recent activity (mocked from lead interactions / status changes)
  const recentActivities = leads
    .filter(l => l.updatedAt)
    .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0))
    .slice(0, 5)
    .map(l => ({
      type: l.status === "new" ? "add" : l.status === "converted" ? "deal" : "call",
      title: l.status === "new" ? `Added new lead ${l.name}` : l.status === "converted" ? `${l.name} converted` : `Updated ${l.name}`,
      subtitle: getStatusLabel(l.status),
      time: l.updatedAt,
    }));

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <h1 className="text-headline-lg-mobile" style={{ color: "var(--r-primary)" }}>Relio</h1>
          </div>
          <div className={styles.headerRight}>
            {isOffline && (
              <span className={styles.offlineBadge} title="Offline mode — changes queued">
                <CloudOff size={14} />
              </span>
            )}
            {syncStatus.pendingChanges > 0 && (
              <span className={styles.syncBadge} title={`${syncStatus.pendingChanges} changes syncing…`}>
                <RefreshCw size={14} />
                {syncStatus.pendingChanges}
              </span>
            )}
            <NavMenu />
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {/* KPI Cards - Horizontal Scroll */}
        <section className={styles.kpiSection}>
          <div className={styles.kpiScroll}>
            <KpiCard label="Total Leads" value={leads.length} trend={activeLeads.length > 0 ? `${activeLeads.length} active` : null} icon={<TrendingUp size={16} />} accent="primary" />
            <KpiCard label="Active" value={activeLeads.length} trend={`${hotLeads.length} hot`} icon={<Zap size={16} />} accent="primary" />
            <KpiCard label="Site Visits" value={siteVisits.length} trend={siteVisits.length > 0 ? "Today" : "None"} icon={<MapPin size={16} />} accent="secondary" />
            <KpiCard label="Bookings" value={bookings.length} trend={`${converted.length} closed`} icon={<Handshake size={16} />} accent="secondary" />
            <KpiCard label="Revenue" value="₹0" trend="Track deals" icon={<Wallet size={16} />} accent="secondary" />
          </div>
        </section>

        {/* Sales Funnel */}
        <section className={`r-card ${styles.funnelCard}`}>
          <div className={styles.sectionHeader}>
            <h2 className="text-headline-md">Sales Funnel</h2>
            <span className="text-label-md" style={{ color: "var(--r-outline)" }}>Last 30 Days</span>
          </div>
          <div className={styles.funnelBars}>
            <FunnelBar label="New" count={funnel.new} pct={funnel.new / funnelMax} color="bg-primary" />
            <FunnelBar label="Contacted" count={funnel.contacted} pct={funnel.contacted / funnelMax} color="bg-primary-container" />
            <FunnelBar label="Visited" count={funnel.visited} pct={funnel.visited / funnelMax} color="bg-secondary" />
            <FunnelBar label="Negotiation" count={funnel.negotiating} pct={funnel.negotiating / funnelMax} color="bg-on-primary-container" />
            <FunnelBar label="Closed" count={funnel.closed} pct={funnel.closed / funnelMax} color="bg-secondary-container" />
          </div>
        </section>

        {/* Today's Schedule — Follow-ups first */}
        <section className={`r-card ${styles.scheduleCard}`}>
          <h2 className="text-headline-md" style={{ marginBottom: 16 }}>Today&apos;s Schedule</h2>
          {siteVisits.length > 0 || dueToday.length > 0 ? (
            <div className={styles.scheduleList}>
              {siteVisits.slice(0, 3).map(lead => (
                <ScheduleItem key={lead.id} lead={lead} time={lead.visitTime || "10:00 AM"} label={`Site visit${lead.visitLocation ? ` — ${lead.visitLocation}` : ""}`} onTap={() => router.push(`/leads/${lead.id}`)} onCall={() => handleCall(lead)} onWA={() => handleWA(lead)} />
              ))}
              {dueToday.filter(l => !siteVisits.find(s => s.id === l.id)).slice(0, 3).map(lead => (
                <ScheduleItem key={lead.id} lead={lead} time="2:00 PM" label="Follow-up" onTap={() => router.push(`/leads/${lead.id}`)} onCall={() => handleCall(lead)} onWA={() => handleWA(lead)} />
              ))}
            </div>
          ) : (
            <div className={styles.emptySchedule}>
              <p className="text-body-md" style={{ color: "var(--r-outline)" }}>No follow-ups for today</p>
              <button className={styles.viewCalBtn} onClick={() => router.push("/calendar")}>View Calendar</button>
            </div>
          )}
        </section>

        {/* Needs First Contact */}
        {needsContact.length > 0 && (
          <section className={`r-card ${styles.scheduleCard}`}>
            <div className={styles.sectionHeader} style={{ marginBottom: 16 }}>
              <h2 className="text-headline-md">Needs First Contact</h2>
              <span className="text-label-md" style={{ color: "var(--r-error)" }}>{needsContact.length} pending</span>
            </div>
            <div className={styles.scheduleList}>
              {needsContact.slice(0, 5).map(lead => (
                <ScheduleItem key={lead.id} lead={lead} time="Call" label={lead.projectInterest || "New lead"} onTap={() => router.push(`/leads/${lead.id}`)} onCall={() => handleCall(lead)} onWA={() => handleWA(lead)} />
              ))}
            </div>
            {needsContact.length > 5 && (
              <button className="r-btn r-btn-ghost" style={{ width: "100%", marginTop: 8 }} onClick={() => router.push("/leads")}>
                View All {needsContact.length} Leads
              </button>
            )}
          </section>
        )}

        {/* Smart Suggestions */}
        {(followupSuggestions.length > 0 || topMatchAlerts.length > 0) && (
          <section className={`r-card ${styles.suggestionsCard}`}>
            <div className={styles.sectionHeader}>
              <h2 className="text-headline-md" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Sparkles size={18} color="var(--r-secondary)" /> Smart Suggestions
              </h2>
              <span className="text-label-md" style={{ color: "var(--r-outline)" }}>
                {followupSuggestions.length + topMatchAlerts.length}
              </span>
            </div>
            <div className={styles.suggestionList}>
              {followupSuggestions.map(s => (
                <div key={s.leadId} className={styles.suggestionItem} onClick={() => router.push(`/leads/${s.leadId}`)}>
                  <div className={styles.suggestionIcon} style={{
                    background: s.type === "followup_urgent" ? "var(--r-error-bg)" : "var(--r-warning-bg)",
                    color: s.type === "followup_urgent" ? "var(--r-error)" : "var(--r-warning)"
                  }}>
                    {s.type === "followup_urgent" ? <AlertTriangle size={14} /> : <Phone size={14} />}
                  </div>
                  <div className={styles.suggestionBody}>
                    <p className="text-body-md" style={{ fontWeight: 600 }}>{s.message}</p>
                    <p className="text-label-md" style={{ color: "var(--r-outline)" }}>{s.subtext}</p>
                  </div>
                  <ChevronRight size={16} color="var(--r-outline)" />
                </div>
              ))}
              {topMatchAlerts.map(m => (
                <div key={m.lead.id} className={styles.suggestionItem} onClick={() => router.push(`/leads/${m.lead.id}`)}>
                  <div className={styles.suggestionIcon} style={{ background: "var(--r-primary-fixed)", color: "var(--r-primary)" }}>
                    <Home size={14} />
                  </div>
                  <div className={styles.suggestionBody}>
                    <p className="text-body-md" style={{ fontWeight: 600 }}>
                      {m.lead.name} — {m.topMatch.projectName || m.topMatch.area}
                    </p>
                    <p className="text-label-md" style={{ color: "var(--r-outline)" }}>
                      {m.topMatch.match.score}% match · {m.count} propert{m.count > 1 ? "ies" : "y"} available
                    </p>
                  </div>
                  <ChevronRight size={16} color="var(--r-outline)" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent Activities */}
        <section className={`r-card ${styles.activityCard}`}>
          <div className={styles.sectionHeader}>
            <h2 className="text-headline-md">Recent Activities</h2>
            <button className="text-label-md" style={{ color: "var(--r-secondary)" }} onClick={() => router.push("/leads")}>See All</button>
          </div>
          <div className={styles.activityList}>
            {recentActivities.length > 0 ? recentActivities.map((act, i) => (
              <div key={i} className={styles.activityItem}>
                <div className={styles.activityIcon} style={{
                  background: act.type === "deal" ? "var(--r-secondary-fixed)" : act.type === "add" ? "var(--r-primary-fixed)" : "var(--r-surface-container-high)"
                }}>
                  {act.type === "deal" ? <Handshake size={16} color="var(--r-on-secondary-fixed)" /> : act.type === "add" ? <Home size={16} color="var(--r-on-primary-fixed)" /> : <Phone size={16} color="var(--r-on-surface-variant)" />}
                </div>
                <div className={styles.activityBody}>
                  <p className="text-body-md" style={{ fontWeight: 600 }}>{act.title}</p>
                  <p className="text-label-md" style={{ color: "var(--r-outline)" }}>{act.subtitle}</p>
                </div>
              </div>
            )) : (
              <p className="text-body-md" style={{ color: "var(--r-outline)", textAlign: "center", padding: "24px 0" }}>No recent activity</p>
            )}
          </div>
        </section>
      </main>

      {/* FAB */}
      <button className="r-fab" onClick={() => router.push("/leads/new")}>
        <Plus size={28} />
      </button>

      {/* Bottom Sheet: Add Lead */}
      <BottomSheet open={showAddLead} onClose={() => setShowAddLead(false)} title="Add Lead" tall>
        <LeadForm leads={leads} quickMode onDone={() => setShowAddLead(false)} onCancel={() => setShowAddLead(false)} />
      </BottomSheet>

      {/* Post Call Sheet */}
      <PostCallSheet lead={postCallLead} open={!!postCallLead} onClose={() => setPostCallLead(null)} onDone={() => setPostCallLead(null)} />
    </div>
  );
}

function KpiCard({ label, value, trend, icon, accent }) {
  const trendColor = accent === "secondary" ? "var(--r-secondary)" : "var(--r-primary)";
  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiHeader}>
        <span className="text-label-md" style={{ color: "var(--r-outline)" }}>{label}</span>
        <span style={{ color: trendColor }}>{icon}</span>
      </div>
      <div className="text-headline-md" style={{ color: "var(--r-primary)", marginTop: 4 }}>{value}</div>
      {trend && <div className="text-label-md" style={{ color: trendColor, marginTop: 4 }}>{trend}</div>}
    </div>
  );
}

function FunnelBar({ label, count, pct, color }) {
  const height = Math.max(pct * 100, 4);
  return (
    <div className={styles.funnelItem}>
      <div className={styles.funnelBarTrack}>
        <div className={styles.funnelBarFill} style={{ height: `${height}%`, background: `var(--${color.replace("bg-", "r-").replace("-container", "-container")})` }}>
          {color === "bg-primary" && <div style={{ width: "100%", height: "100%", background: "var(--r-primary-container)", borderRadius: "inherit" }} />}
          {color === "bg-primary-container" && <div style={{ width: "100%", height: "100%", background: "var(--r-primary)", borderRadius: "inherit" }} />}
          {color === "bg-secondary" && <div style={{ width: "100%", height: "100%", background: "var(--r-secondary)", borderRadius: "inherit" }} />}
          {color === "bg-on-primary-container" && <div style={{ width: "100%", height: "100%", background: "var(--r-on-primary-container)", borderRadius: "inherit" }} />}
          {color === "bg-secondary-container" && <div style={{ width: "100%", height: "100%", background: "var(--r-secondary-container)", borderRadius: "inherit" }} />}
        </div>
      </div>
      <span className="text-label-md" style={{ color: "var(--r-outline)", textAlign: "center", marginTop: 6 }}>{label}</span>
    </div>
  );
}

function ScheduleItem({ lead, time, label, onTap, onCall, onWA }) {
  return (
    <div className={styles.scheduleItem}>
      <div className={styles.scheduleTime}>
        <div className="text-body-md" style={{ fontWeight: 700, color: "var(--r-primary)" }}>{time}</div>
        <div className="text-label-md" style={{ color: "var(--r-outline)" }}>AM</div>
      </div>
      <div className={styles.scheduleBody} onClick={onTap}>
        <div className="text-body-md" style={{ fontWeight: 600 }}>{lead.name}</div>
        <div className="text-body-md" style={{ color: "var(--r-on-surface-variant)" }}>{lead.projectInterest || label}</div>
        <div className={styles.scheduleActions} onClick={e => e.stopPropagation()}>
          <button className={styles.scheduleAction} onClick={onCall}><Phone size={14} /></button>
          <button className={styles.scheduleAction} onClick={onWA}><MessageCircle size={14} /></button>
        </div>
      </div>
    </div>
  );
}
