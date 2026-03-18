"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { useLeads } from "@/lib/hooks/useLeads";
import { useInventory } from "@/lib/hooks/useInventory";
import { logOut } from "@/lib/firebase/auth";
import { todayStr, isOverdue, isToday, stalenessLevel, formatFollowUp } from "@/lib/utils/dateHelpers";
import { getTempStyle, getStatusLabel } from "@/lib/utils/leadHelpers";
import BottomSheet from "@/components/shared/BottomSheet";
import LeadForm from "@/components/leads/LeadForm";
import PostCallSheet from "@/components/leads/PostCallSheet";
import styles from "./today.module.css";

export default function TodayPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { leads, loading: leadsLoading } = useLeads();
  const { inventory } = useInventory();

  const [showAddLead,  setShowAddLead]  = useState(false);
  const [postCallLead, setPostCallLead] = useState(null);

  const firstName = user?.displayName?.split(" ")[0] || "there";
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Categorise leads
  const overdue  = leads.filter(l => l.followUpDate && isOverdue(l.followUpDate) &&
    !["converted","lost","disqualified"].includes(l.status));
  const dueToday = leads.filter(l => l.followUpDate && isToday(l.followUpDate));
  const staleInv = inventory.filter(i => {
    const s = stalenessLevel(i.lastOwnerContacted);
    return s.level === "stale" && i.availability === "available";
  });

  const hotLeads = leads.filter(l => l.temperature === "hot" &&
    !["converted","lost"].includes(l.status)).length;

  function handleCall(lead) {
    window.open(`tel:${lead.mobile}`, "_self");
    setPostCallLead(lead);
  }
  function handleWA(lead) {
    window.open(`https://wa.me/91${lead.mobile?.replace(/\D/g,"")}`, "_blank");
  }

  async function handleLogout() {
    await logOut();
    router.replace("/login");
  }

  const Section = ({ title, count, color, children, emptyMsg }) => (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle} style={{ color }}>{title}</span>
        {count > 0 && <span className={styles.sectionCount} style={{ background: color + "20", color }}>{count}</span>}
      </div>
      {count === 0
        ? <p className={styles.emptyMsg}>{emptyMsg}</p>
        : children}
    </div>
  );

  return (
    <div className={styles.page}>

      {/* Header */}
      <header className={styles.header}>
        <div>
          <p className={styles.greeting}>{greeting},</p>
          <h1 className={styles.name}>{firstName} 👋</h1>
        </div>
        <button className={styles.avatar} onClick={handleLogout} title="Sign out">
          {firstName[0]?.toUpperCase()}
        </button>
      </header>

      {/* Stats strip */}
      <div className={styles.statsStrip}>
        {[
          { label: "Active leads",  value: leads.filter(l => !["converted","lost"].includes(l.status)).length },
          { label: "Hot leads",     value: hotLeads },
          { label: "Follow-ups",    value: dueToday.length + overdue.length },
          { label: "Properties",    value: inventory.filter(i => i.availability === "available").length },
        ].map(s => (
          <div key={s.label} className={styles.stat}>
            <span className={styles.statValue}>{s.value}</span>
            <span className={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      <div className={styles.content}>

        {/* Overdue */}
        <Section title="⚠ Overdue" count={overdue.length} color="var(--relio-danger)"
          emptyMsg="">
          {overdue.map(l => (
            <TodayLeadRow key={l.id} lead={l} overdue
              onTap={() => router.push(`/leads/${l.id}`)}
              onCall={() => handleCall(l)} onWA={() => handleWA(l)} />
          ))}
        </Section>

        {/* Today */}
        <Section title="📅 Today" count={dueToday.length} color="var(--relio-gold)"
          emptyMsg={leadsLoading ? "Loading…" : "Nothing due today. All clear ✓"}>
          {dueToday.map(l => (
            <TodayLeadRow key={l.id} lead={l}
              onTap={() => router.push(`/leads/${l.id}`)}
              onCall={() => handleCall(l)} onWA={() => handleWA(l)} />
          ))}
        </Section>

        {/* Stale inventory */}
        {staleInv.length > 0 && (
          <Section title="🏠 Stale Inventory" count={staleInv.length} color="var(--relio-warning)"
            emptyMsg="">
            {staleInv.slice(0, 5).map(i => (
              <div key={i.id} className={styles.staleCard}
                onClick={() => router.push("/inventory")}>
                <div className={styles.staleInfo}>
                  <span className={styles.staleName}>{i.projectName}</span>
                  <span className={styles.staleOwner}>{i.ownerName}</span>
                </div>
                <div className={styles.staleActions} onClick={e => e.stopPropagation()}>
                  <button className={styles.miniBtn}
                    onClick={() => window.open(`tel:${i.ownerMobile}`, "_self")}>📞</button>
                  <button className={styles.miniBtn}
                    onClick={() => window.open(`https://wa.me/91${i.ownerMobile?.replace(/\D/g,"")}`, "_blank")}>💬</button>
                </div>
              </div>
            ))}
            {staleInv.length > 5 && (
              <p className={styles.moreLink} onClick={() => router.push("/inventory")}>
                +{staleInv.length - 5} more in Inventory →
              </p>
            )}
          </Section>
        )}

      </div>

      {/* FAB */}
      <button className={styles.fab} onClick={() => setShowAddLead(true)}>+</button>

      {/* Add lead sheet */}
      <BottomSheet open={showAddLead} onClose={() => setShowAddLead(false)} title="Add Lead" tall>
        <LeadForm leads={leads} quickMode
          onDone={() => setShowAddLead(false)}
          onCancel={() => setShowAddLead(false)} />
      </BottomSheet>

      {/* Post-call sheet */}
      <PostCallSheet
        lead={postCallLead}
        open={!!postCallLead}
        onClose={() => setPostCallLead(null)}
        onDone={() => setPostCallLead(null)} />
    </div>
  );
}

function TodayLeadRow({ lead, overdue, onTap, onCall, onWA }) {
  const temp = getTempStyle(lead.temperature || "cold");
  const fu   = formatFollowUp(lead.followUpDate);
  return (
    <div className={`${styles.leadRow} ${overdue ? styles.leadRowOverdue : ""}`}
      style={{ borderLeftColor: temp.border }} onClick={onTap}>
      <div className={styles.leadRowInfo}>
        <span className={styles.leadRowName}>{lead.name}</span>
        <span className={styles.leadRowSub}>
          {lead.projectInterest || lead.mobile}
          {fu && <span className={styles.leadRowFu}> · {fu}</span>}
        </span>
      </div>
      <div className={styles.leadRowBtns} onClick={e => e.stopPropagation()}>
        <button className={styles.miniBtn} onClick={onCall}>📞</button>
        <button className={styles.miniBtn} onClick={onWA}>💬</button>
      </div>
    </div>
  );
}
