"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLeads } from "@/lib/hooks/useLeads";
import { todayStr, addDays, formatFollowUp, isOverdue, isToday } from "@/lib/utils/dateHelpers";
import { getTempStyle } from "@/lib/utils/leadHelpers";
import styles from "./calendar.module.css";

const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function CalendarPage() {
  const router  = useRouter();
  const { leads, loading } = useLeads();
  const today   = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected,  setSelected]  = useState(null); // "YYYY-MM-DD"

  // Build a map: "YYYY-MM-DD" -> [leads]
  const followUpMap = useMemo(() => {
    const map = {};
    leads.forEach(l => {
      if (l.followUpDate) {
        if (!map[l.followUpDate]) map[l.followUpDate] = [];
        map[l.followUpDate].push(l);
      }
    });
    return map;
  }, [leads]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const mm  = String(viewMonth + 1).padStart(2, "0");
      const dd  = String(d).padStart(2, "0");
      cells.push(`${viewYear}-${mm}-${dd}`);
    }
    return cells;
  }, [viewYear, viewMonth]);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
    setSelected(null);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
    setSelected(null);
  }

  const todayDateStr = todayStr();
  const selectedLeads = selected ? (followUpMap[selected] || []) : [];

  // Upcoming list (below calendar) — overdue + today + next 30 days
  const listLeads = useMemo(() => {
    const active = leads.filter(l =>
      l.followUpDate && !["converted","lost"].includes(l.status));
    return active.sort((a,b) => a.followUpDate.localeCompare(b.followUpDate));
  }, [leads]);

  const overdueSplit  = listLeads.filter(l => l.followUpDate < todayDateStr);
  const todaySplit    = listLeads.filter(l => l.followUpDate === todayDateStr);
  const upcomingSplit = listLeads.filter(l => l.followUpDate > todayDateStr);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Calendar</h1>
      </header>

      {/* Month nav */}
      <div className={styles.monthNav}>
        <button className={styles.navBtn} onClick={prevMonth}>‹</button>
        <span className={styles.monthLabel}>{MONTHS[viewMonth]} {viewYear}</span>
        <button className={styles.navBtn} onClick={nextMonth}>›</button>
      </div>

      {/* Day headers */}
      <div className={styles.dayHeaders}>
        {DAYS.map(d => <span key={d} className={styles.dayHeader}>{d}</span>)}
      </div>

      {/* Calendar grid */}
      <div className={styles.grid}>
        {calendarDays.map((dateStr, i) => {
          if (!dateStr) return <div key={`empty-${i}`} className={styles.emptyCell} />;

          const hasLeads   = followUpMap[dateStr]?.length > 0;
          const isOv       = dateStr < todayDateStr && hasLeads;
          const isTd       = dateStr === todayDateStr;
          const isSel      = dateStr === selected;
          const dayNum     = parseInt(dateStr.split("-")[2]);
          const dotColors  = hasLeads
            ? [...new Set(followUpMap[dateStr].map(l =>
                getTempStyle(l.temperature || "cold").border
              ))].slice(0,3)
            : [];

          return (
            <button
              key={dateStr}
              className={`${styles.cell}
                ${isTd  ? styles.cellToday   : ""}
                ${isSel ? styles.cellSelected : ""}
                ${isOv  ? styles.cellOverdue  : ""}
              `}
              onClick={() => setSelected(isSel ? null : dateStr)}
            >
              <span className={styles.dayNum}>{dayNum}</span>
              {dotColors.length > 0 && (
                <div className={styles.dots}>
                  {dotColors.map((c, di) => (
                    <span key={di} className={styles.dot} style={{ background: c }} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day leads */}
      {selected && (
        <div className={styles.selectedPanel}>
          <div className={styles.selectedHeader}>
            <span className={styles.selectedDate}>
              {new Date(selected + "T00:00:00").toLocaleDateString("en-IN",
                { weekday:"long", day:"numeric", month:"long" })}
            </span>
            <button className={styles.clearSel} onClick={() => setSelected(null)}>✕</button>
          </div>
          {selectedLeads.length === 0
            ? <p className={styles.noLeads}>No follow-ups on this day.</p>
            : selectedLeads.map(l => (
              <LeadRow key={l.id} lead={l} onClick={() => router.push(`/leads/${l.id}`)} />
            ))
          }
        </div>
      )}

      {/* List view below */}
      <div className={styles.listSection}>
        <p className={styles.listTitle}>All Follow-ups</p>

        {loading && <p className={styles.msg}>Loading…</p>}

        {overdueSplit.length > 0 && (
          <Section title="⚠ Overdue" color="var(--relio-danger)">
            {overdueSplit.map(l => <LeadRow key={l.id} lead={l} onClick={() => router.push(`/leads/${l.id}`)} />)}
          </Section>
        )}
        {todaySplit.length > 0 && (
          <Section title="📅 Today" color="var(--relio-gold)">
            {todaySplit.map(l => <LeadRow key={l.id} lead={l} onClick={() => router.push(`/leads/${l.id}`)} />)}
          </Section>
        )}
        {upcomingSplit.length > 0 && (
          <Section title="📆 Upcoming" color="var(--relio-cold)">
            {upcomingSplit.map(l => <LeadRow key={l.id} lead={l} onClick={() => router.push(`/leads/${l.id}`)} />)}
          </Section>
        )}
        {!loading && listLeads.length === 0 && (
          <div className={styles.empty}>
            <span style={{ fontSize:36 }}>✅</span>
            <p>No pending follow-ups.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, color, children }) {
  return (
    <div className={styles.section}>
      <p className={styles.sectionTitle} style={{ color }}>{title}</p>
      {children}
    </div>
  );
}

function LeadRow({ lead, onClick }) {
  const temp = getTempStyle(lead.temperature || "cold");
  const fu   = formatFollowUp(lead.followUpDate);
  return (
    <div className={styles.leadRow} style={{ borderLeftColor: temp.border }} onClick={onClick}>
      <div className={styles.leadInfo}>
        <span className={styles.leadName}>{lead.name}</span>
        <span className={styles.leadSub}>{lead.projectInterest || lead.mobile}</span>
      </div>
      <span className={styles.leadDate}
        style={{ color: isOverdue(lead.followUpDate) ? "var(--relio-danger)" : "var(--relio-gold)" }}>
        {fu}
      </span>
    </div>
  );
}
