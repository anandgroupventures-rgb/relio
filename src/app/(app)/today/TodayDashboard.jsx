"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { useLeads } from "@/lib/hooks/useLeads";
import { useInventory } from "@/lib/hooks/useInventory";
import { logOut } from "@/lib/firebase/auth";
import { isOverdue, isToday, stalenessLevel, formatFollowUp } from "@/lib/utils/dateHelpers";
import { getTempStyle, getStatusLabel } from "@/lib/utils/leadHelpers";
import BottomSheet from "@/components/shared/BottomSheet";
import LeadForm from "@/components/leads/LeadForm";
import PostCallSheet from "@/components/leads/PostCallSheet";
import styles from "./today.module.css";

export default function TodayDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { leads, loading: leadsLoading } = useLeads();
  const { inventory } = useInventory();

  const [showAddLead, setShowAddLead] = useState(false);
  const [postCallLead, setPostCallLead] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const firstName = user?.displayName?.split(" ")[0] || "";

  // Calculate stats
  const activeLeads = leads.filter(l => !["converted", "lost", "disqualified"].includes(l.status));
  const hotLeads = leads.filter(l => l.temperature === "hot" && !["converted", "lost"].includes(l.status));
  const warmLeads = leads.filter(l => l.temperature === "warm" && !["converted", "lost"].includes(l.status));
  const overdue = leads.filter(l => l.followUpDate && isOverdue(l.followUpDate) && !["converted", "lost", "disqualified"].includes(l.status));
  const dueToday = leads.filter(l => l.followUpDate && isToday(l.followUpDate));
  
  const availableProperties = inventory.filter(i => i.availability === "available");
  const staleInv = inventory.filter(i => {
    const s = stalenessLevel(i.lastOwnerContacted);
    return s.level === "stale" && i.availability === "available";
  });

  function handleCall(lead) {
    window.open(`tel:${lead.mobile}`, "_self");
    setPostCallLead(lead);
  }

  function handleWA(lead) {
    window.open(`https://wa.me/91${lead.mobile?.replace(/\D/g, "")}`, "_blank");
  }

  async function handleLogout() {
    await logOut();
    router.replace("/login");
  }

  return (
    <div className={styles.dashboard}>
      {/* Header Section - Shows Relio logo and user avatar */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logoBlock}>
            <span className={styles.logoIcon}>🌿</span>
            <h1 className={styles.logoText}>Relio</h1>
          </div>
          <button className={styles.avatar} onClick={handleLogout} title="Sign out">
            {firstName[0]?.toUpperCase() || "U"}
          </button>
        </div>
      </header>

      {/* Quick Stats Cards */}
      <section className={styles.statsSection}>
        <div className={styles.statsGrid}>
          <StatCard 
            label="Active Leads" 
            value={activeLeads.length} 
            trend={hotLeads.length > 0 ? `${hotLeads.length} hot` : null}
            icon="👥"
            color="sage"
          />
          <StatCard 
            label="Follow-ups" 
            value={dueToday.length} 
            trend={overdue.length > 0 ? `${overdue.length} overdue` : "On track"}
            icon="📅"
            color={overdue.length > 0 ? "danger" : "sage"}
          />
          <StatCard 
            label="Properties" 
            value={availableProperties.length} 
            trend={staleInv.length > 0 ? `${staleInv.length} need attention` : "All good"}
            icon="🏠"
            color={staleInv.length > 0 ? "warning" : "sage"}
          />
          <StatCard 
            label="Hot Leads" 
            value={hotLeads.length} 
            trend={warmLeads.length > 0 ? `${warmLeads.length} warm` : null}
            icon="🔥"
            color="hot"
          />
        </div>
      </section>

      {/* Today's Agenda */}
      <section className={styles.agendaSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Today's Agenda</h2>
          <span className={styles.dateLabel}>{currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
        </div>

        {/* Overdue Follow-ups */}
        {overdue.length > 0 && (
          <div className={`${styles.agendaCard} ${styles.agendaCardUrgent}`}>
            <div className={styles.agendaCardHeader}>
              <span className={styles.agendaIcon}>⚠️</span>
              <span className={styles.agendaCount}>{overdue.length}</span>
            </div>
            <h3 className={styles.agendaTitle}>Overdue Follow-ups</h3>
            <p className={styles.agendaSubtitle}>Needs immediate attention</p>
            <div className={styles.agendaList}>
              {overdue.slice(0, 3).map(lead => (
                <LeadRow 
                  key={lead.id} 
                  lead={lead} 
                  overdue 
                  onTap={() => router.push(`/leads/${lead.id}`)}
                  onCall={() => handleCall(lead)}
                  onWA={() => handleWA(lead)}
                />
              ))}
              {overdue.length > 3 && (
                <button className={styles.viewMoreBtn} onClick={() => router.push('/leads?filter=overdue')}>
                  +{overdue.length - 3} more overdue leads
                </button>
              )}
            </div>
          </div>
        )}

        {/* Today's Follow-ups */}
        <div className={styles.agendaCard}>
          <div className={styles.agendaCardHeader}>
            <span className={styles.agendaIcon}>📅</span>
            <span className={styles.agendaCount}>{dueToday.length}</span>
          </div>
          <h3 className={styles.agendaTitle}>Scheduled for Today</h3>
          <p className={styles.agendaSubtitle}>{dueToday.length === 0 ? "No follow-ups scheduled" : "Your planned activities"}</p>
          {dueToday.length > 0 ? (
            <div className={styles.agendaList}>
              {dueToday.slice(0, 3).map(lead => (
                <LeadRow 
                  key={lead.id} 
                  lead={lead}
                  onTap={() => router.push(`/leads/${lead.id}`)}
                  onCall={() => handleCall(lead)}
                  onWA={() => handleWA(lead)}
                />
              ))}
              {dueToday.length > 3 && (
                <button className={styles.viewMoreBtn} onClick={() => router.push('/leads?filter=today')}>
                  +{dueToday.length - 3} more for today
                </button>
              )}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>✓</span>
              <p className={styles.emptyText}>You're all caught up!</p>
              <button className={styles.emptyAction} onClick={() => router.push('/leads')}>
                View all leads
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Quick Actions */}
      <section className={styles.actionsSection}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.actionsGrid}>
          <QuickAction 
            icon="➕"
            label="Add Lead"
            onClick={() => setShowAddLead(true)}
            primary
          />
          <QuickAction 
            icon="📋"
            label="View Leads"
            onClick={() => router.push('/leads')}
          />
          <QuickAction 
            icon="🏠"
            label="Inventory"
            onClick={() => router.push('/inventory')}
          />
          <QuickAction 
            icon="📊"
            label="Reports"
            onClick={() => router.push('/reports')}
          />
        </div>
      </section>

      {/* Property Alerts */}
      {staleInv.length > 0 && (
        <section className={styles.alertsSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Property Alerts</h2>
            <button className={styles.viewAllBtn} onClick={() => router.push('/inventory')}>
              View all
            </button>
          </div>
          <div className={styles.alertsCard}>
            <div className={styles.alertHeader}>
              <span className={styles.alertIcon}>🏠</span>
              <span className={styles.alertBadge}>{staleInv.length} need attention</span>
            </div>
            <p className={styles.alertText}>
              {staleInv.length} properties haven't been contacted in 30+ days
            </p>
            <div className={styles.alertProperties}>
              {staleInv.slice(0, 2).map(i => (
                <div key={i.id} className={styles.alertProperty}>
                  <span className={styles.propertyName}>{i.projectName}</span>
                  <div className={styles.propertyActions}>
                    <button className={styles.propertyActionBtn} onClick={() => window.open(`tel:${i.ownerMobile}`, "_self")}>
                      📞
                    </button>
                    <button className={styles.propertyActionBtn} onClick={() => window.open(`https://wa.me/91${i.ownerMobile?.replace(/\D/g, "")}`, "_blank")}>
                      💬
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Bottom Spacing */}
      <div className={styles.bottomSpacer} />

      {/* Add Lead Sheet */}
      <BottomSheet open={showAddLead} onClose={() => setShowAddLead(false)} title="Add Lead" tall>
        <LeadForm leads={leads} quickMode onDone={() => setShowAddLead(false)} onCancel={() => setShowAddLead(false)} />
      </BottomSheet>

      {/* Post-call sheet */}
      <PostCallSheet
        lead={postCallLead}
        open={!!postCallLead}
        onClose={() => setPostCallLead(null)}
        onDone={() => setPostCallLead(null)}
      />
    </div>
  );
}

function StatCard({ label, value, trend, icon, color }) {
  const colorClass = {
    sage: styles.statCardSage,
    hot: styles.statCardHot,
    danger: styles.statCardDanger,
    warning: styles.statCardWarning,
  }[color] || styles.statCardSage;

  return (
    <div className={`${styles.statCard} ${colorClass}`}>
      <div className={styles.statHeader}>
        <span className={styles.statIcon}>{icon}</span>
      </div>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
      {trend && <span className={styles.statTrend}>{trend}</span>}
    </div>
  );
}

function LeadRow({ lead, overdue, onTap, onCall, onWA }) {
  const temp = getTempStyle(lead.temperature || "cold");
  const fu = formatFollowUp(lead.followUpDate);
  
  return (
    <div className={`${styles.leadRow} ${overdue ? styles.leadRowOverdue : ''}`} onClick={onTap}>
      <div className={styles.leadRowLeft}>
        <div className={styles.leadAvatar} style={{ backgroundColor: temp.bg, color: temp.text }}>
          {lead.name?.[0]?.toUpperCase() || "?"}
        </div>
        <div className={styles.leadInfo}>
          <span className={styles.leadName}>{lead.name}</span>
          <span className={styles.leadSub}>
            {lead.projectInterest || lead.mobile}
            {fu && <span className={styles.leadFu}> · {fu}</span>}
          </span>
        </div>
      </div>
      <div className={styles.leadActions} onClick={e => e.stopPropagation()}>
        <button className={styles.actionBtn} onClick={onCall}>📞</button>
        <button className={styles.actionBtn} onClick={onWA}>💬</button>
      </div>
    </div>
  );
}

function QuickAction({ icon, label, onClick, primary }) {
  return (
    <button className={`${styles.quickAction} ${primary ? styles.quickActionPrimary : ''}`} onClick={onClick}>
      <span className={styles.quickActionIcon}>{icon}</span>
      <span className={styles.quickActionLabel}>{label}</span>
    </button>
  );
}
