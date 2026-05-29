"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { useLeads } from "@/lib/hooks/useLeads";
import { useInventory } from "@/lib/hooks/useInventory";
import { LEAD_STATUSES, LEAD_SOURCES } from "@/lib/utils/constants";
import { isToday, isOverdue } from "@/lib/utils/dateHelpers";
import { CalendarDays, TrendingUp, BarChart3, Wallet, Users, Target, FileText, GitBranch, PieChart, Banknote, Sparkles } from "lucide-react";
import styles from "./stats.module.css";

export default function StatsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { leads } = useLeads();
  const { inventory } = useInventory();
  const [period, setPeriod] = useState("This Month");

  const totalLeads = leads.length;
  const activeLeads = leads.filter(l => !["converted", "lost", "disqualified", "invalid_number"].includes(l.status));
  const converted = leads.filter(l => l.status === "converted").length;
  const conversionRate = totalLeads > 0 ? ((converted / totalLeads) * 100).toFixed(1) : "0.0";
  const siteVisits = leads.filter(l => l.status === "visit_done").length;
  const bookings = leads.filter(l => l.status === "negotiating" || l.status === "converted").length;
  const overdueCount = leads.filter(l => l.followUpDate && isOverdue(l.followUpDate)).length;
  const todayCount = leads.filter(l => l.followUpDate && isToday(l.followUpDate)).length;

  // Source performance
  const sourceCounts = useMemo(() => {
    const counts = {};
    LEAD_SOURCES.forEach(s => counts[s] = 0);
    leads.forEach(l => { if (l.source) counts[l.source] = (counts[l.source] || 0) + 1; });
    return Object.entries(counts).filter(([,c]) => c > 0).sort((a,b) => b[1] - a[1]);
  }, [leads]);

  const maxSource = Math.max(...sourceCounts.map(([,c]) => c), 1);

  // Funnel
  const funnel = {
    new: leads.filter(l => l.status === "new").length,
    contacted: leads.filter(l => l.status === "contacted").length,
    visited: leads.filter(l => l.status === "visit_done").length,
    negotiating: leads.filter(l => l.status === "negotiating").length,
    closed: converted,
  };
  const funnelMax = Math.max(funnel.new, 1);

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <span className="text-headline-lg-mobile" style={{ color: "var(--r-primary)", fontWeight: 800 }}>Relio</span>
            <div className={styles.divider} />
            <h1 className="text-headline-md">Reports</h1>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.dateBtn}>
              <CalendarDays size={16} />
              <span className="text-label-md">{period}</span>
            </button>
            <div className={styles.headerAvatar}>
              {(user?.displayName?.[0] || "U").toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {/* Key Metrics */}
        <section className={styles.metricsGrid}>
          <MetricCard label="Total Leads" value={totalLeads.toString()} trend={`+${activeLeads.length} active`} icon={<Users size={20} />} color="primary" />
          <MetricCard label="Conversion Rate" value={`${conversionRate}%`} trend={`${converted} closed`} icon={<Target size={20} />} color="primary" />
          <MetricCard label="Revenue" value="₹0" trend="Track deals" icon={<Wallet size={20} />} color="accent" />
        </section>

        {/* Charts Row */}
        <section className={styles.chartsGrid}>
          {/* Lead Funnel */}
          <div className={`r-card ${styles.chartCard}`}>
            <div className={styles.chartHeader}>
              <h3 className="text-headline-md">Lead Funnel</h3>
            </div>
            <div className={styles.funnelList}>
              <FunnelRow label="New Leads" count={funnel.new} pct={100} color="var(--r-primary-container)" />
              <FunnelRow label="Contacted" count={funnel.contacted} pct={(funnel.contacted/funnelMax)*100} color="var(--r-primary)" />
              <FunnelRow label="Site Visit" count={funnel.visited} pct={(funnel.visited/funnelMax)*100} color="var(--r-secondary)" />
              <FunnelRow label="Negotiation" count={funnel.negotiating} pct={(funnel.negotiating/funnelMax)*100} color="var(--r-on-primary-container)" />
              <FunnelRow label="Won Deals" count={funnel.closed} pct={(funnel.closed/funnelMax)*100} color="var(--r-secondary-container)" />
            </div>
          </div>

          {/* Source Performance */}
          <div className={`r-card ${styles.chartCard}`}>
            <div className={styles.chartHeader}>
              <h3 className="text-headline-md">Lead Source Performance</h3>
              <div className={styles.legend}>
                <LegendDot color="var(--r-primary)" label="Total" />
              </div>
            </div>
            <div className={styles.sourceList}>
              {sourceCounts.map(([source, count]) => (
                <div key={source} className={styles.sourceRow}>
                  <span className="text-body-md" style={{ width: 100, flexShrink: 0 }}>{source}</span>
                  <div className={styles.sourceBarTrack}>
                    <div className={styles.sourceBar} style={{ width: `${(count / maxSource) * 100}%` }} />
                  </div>
                  <span className="text-data-mono" style={{ width: 48, textAlign: "right" }}>{count}</span>
                </div>
              ))}
              {sourceCounts.length === 0 && (
                <p className="text-body-md" style={{ color: "var(--r-outline)", textAlign: "center", padding: 24 }}>No source data yet</p>
              )}
            </div>
          </div>
        </section>

        {/* Agent Leaderboard */}
        <section className={`r-card ${styles.leaderCard}`}>
          <div className={styles.chartHeader}>
            <h3 className="text-headline-md">Performance</h3>
          </div>
          <div className={styles.leaderTable}>
            <div className={styles.leaderRow}>
              <span className="text-label-md" style={{ color: "var(--r-outline)" }}>Metric</span>
              <span className="text-label-md" style={{ color: "var(--r-outline)", textAlign: "center" }}>Count</span>
              <span className="text-label-md" style={{ color: "var(--r-outline)" }}>Status</span>
            </div>
            <LeaderRow metric="Hot Leads" count={leads.filter(l => l.temperature === "hot").length} status="priority" />
            <LeaderRow metric="Overdue" count={overdueCount} status="urgent" />
            <LeaderRow metric="Today" count={todayCount} status="normal" />
            <LeaderRow metric="Site Visits" count={siteVisits} status="normal" />
            <LeaderRow metric="Inventory" count={inventory.length} status="normal" />
          </div>
        </section>

        {/* Report Categories */}
        <section className={styles.catGrid}>
          <button className={styles.catBtn} onClick={() => router.push("/leads")}>
            <div className={styles.catIcon}><FileText size={22} /></div>
            <span className="text-label-md">Lead Summary</span>
          </button>
          <button className={styles.catBtn} onClick={() => router.push("/leads")}>
            <div className={styles.catIcon}><GitBranch size={22} /></div>
            <span className="text-label-md">Pipeline</span>
          </button>
          <button className={styles.catBtn} onClick={() => router.push("/stats")}>
            <div className={styles.catIcon}><PieChart size={22} /></div>
            <span className="text-label-md">Productivity</span>
          </button>
          <button className={styles.catBtn} onClick={() => router.push("/stats")}>
            <div className={styles.catIcon}><Banknote size={22} /></div>
            <span className="text-label-md">Revenue</span>
          </button>
        </section>

        {/* CTA */}
        <section className={styles.ctaCard}>
          <div className={styles.ctaContent}>
            <h2 className="text-headline-lg-mobile" style={{ color: "#fff", marginBottom: 8 }}>Deep Insights</h2>
            <p className="text-body-lg" style={{ color: "rgba(255,255,255,0.85)", marginBottom: 20 }}>
              Generate an AI-powered growth report based on your performance.
            </p>
            <button className={styles.ctaBtn} onClick={() => alert("AI Analysis coming soon!")}>
              <Sparkles size={18} /> Generate AI Analysis
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

function MetricCard({ label, value, trend, icon, color }) {
  const isAccent = color === "accent";
  return (
    <div className={`${styles.metricCard} ${isAccent ? styles.metricAccent : ""}`}>
      <div className={styles.metricHeader}>
        <div>
          <p className="text-label-md" style={{ color: isAccent ? "rgba(255,255,255,0.8)" : "var(--r-outline)" }}>{label}</p>
          <h3 className="text-headline-lg" style={{ color: isAccent ? "#fff" : "var(--r-primary)", marginTop: 4 }}>{value}</h3>
        </div>
        <div className={`${styles.metricIcon} ${isAccent ? styles.metricIconAccent : ""}`}>{icon}</div>
      </div>
      <div className={`${styles.metricTrend} ${isAccent ? styles.metricTrendAccent : ""}`}>
        <TrendingUp size={14} />
        <span className="text-label-md">{trend}</span>
      </div>
    </div>
  );
}

function FunnelRow({ label, count, pct, color }) {
  return (
    <div className={styles.funnelRow}>
      <div className={styles.funnelRowHeader}>
        <span className="text-body-md" style={{ fontWeight: 600 }}>{label}</span>
        <span className="text-data-mono">{count} ({Math.round(pct)}%)</span>
      </div>
      <div className={styles.funnelBarTrack}>
        <div className={styles.funnelBarFill} style={{ width: `${Math.max(pct, 2)}%`, background: color }} />
      </div>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div className={styles.legendItem}>
      <span className={styles.legendDot} style={{ background: color }} />
      <span className="text-label-md">{label}</span>
    </div>
  );
}

function LeaderRow({ metric, count, status }) {
  const statusStyle = status === "priority" ? { bg: "var(--r-secondary-container)", text: "var(--r-on-secondary-container)" } :
                      status === "urgent" ? { bg: "var(--r-error-container)", text: "var(--r-error)" } :
                      { bg: "var(--r-surface-container-high)", text: "var(--r-on-surface-variant)" };
  return (
    <div className={styles.leaderRow}>
      <span className="text-body-md" style={{ fontWeight: 600 }}>{metric}</span>
      <span className="text-data-mono" style={{ textAlign: "center" }}>{count}</span>
      <span className={styles.leaderBadge} style={{ background: statusStyle.bg, color: statusStyle.text }}>
        {status === "priority" ? "Priority" : status === "urgent" ? "Urgent" : "On Track"}
      </span>
    </div>
  );
}
