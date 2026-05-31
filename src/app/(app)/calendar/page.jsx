"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLeads } from "@/lib/hooks/useLeads";
import { todayStr, formatFollowUp, isOverdue } from "@/lib/utils/dateHelpers";
import { getTempStyle } from "@/lib/utils/leadHelpers";
import { ArrowLeft, ChevronLeft, ChevronRight, CalendarDays, Bell } from "lucide-react";
import styles from "./calendar.module.css";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function CalendarPage() {
  const router = useRouter();
  const { leads, loading } = useLeads();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState(null);

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

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(viewMonth + 1).padStart(2, "0");
      const dd = String(d).padStart(2, "0");
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

  const listLeads = useMemo(() => {
    const active = leads.filter(l => l.followUpDate && !["converted","lost"].includes(l.status));
    return active.sort((a,b) => a.followUpDate.localeCompare(b.followUpDate));
  }, [leads]);

  const overdueSplit = listLeads.filter(l => l.followUpDate < todayDateStr);
  const todaySplit = listLeads.filter(l => l.followUpDate === todayDateStr);
  const upcomingSplit = listLeads.filter(l => l.followUpDate > todayDateStr);

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <div className={styles.avatar}>
              {(user?.displayName?.[0] || "U").toUpperCase()}
            </div>
            <h1 className="text-headline-md" style={{ color: "var(--r-primary)" }}>Relio</h1>
          </div>
          <button className={styles.notifBtn} aria-label="Notifications">
            <Bell size={20} color="var(--r-on-surface-variant)" />
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {/* Month Nav */}
        <div className={styles.monthNav}>
          <button className={styles.navBtn} onClick={prevMonth} aria-label="Previous month">
            <ChevronLeft size={20} />
          </button>
          <span className="text-headline-md">{MONTHS[viewMonth]} {viewYear}</span>
          <button className={styles.navBtn} onClick={nextMonth} aria-label="Next month">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Day Headers */}
        <div className={styles.dayHeaders}>
          {DAYS.map(d => <span key={d} className="text-label-md" style={{ color: "var(--r-outline)" }}>{d}</span>)}
        </div>

        {/* Calendar Grid */}
        <div className={styles.grid}>
          {calendarDays.map((dateStr, i) => {
            if (!dateStr) return <div key={`empty-${i}`} className={styles.emptyCell} />;
            const hasLeads = followUpMap[dateStr]?.length > 0;
            const isOv = dateStr < todayDateStr && hasLeads;
            const isTd = dateStr === todayDateStr;
            const isSel = dateStr === selected;
            const dayNum = parseInt(dateStr.split("-")[2]);
            const dotColors = hasLeads
              ? [...new Set(followUpMap[dateStr].map(l => getTempStyle(l.temperature || "cold").text))].slice(0, 3)
              : [];

            return (
              <button key={dateStr} className={`${styles.cell} ${isTd ? styles.cellToday : ""} ${isSel ? styles.cellSelected : ""} ${isOv ? styles.cellOverdue : ""}`} onClick={() => setSelected(isSel ? null : dateStr)}>
                <span className={styles.dayNum}>{dayNum}</span>
                {dotColors.length > 0 && (
                  <div className={styles.dots}>
                    {dotColors.map((c, di) => <span key={di} className={styles.dot} style={{ background: c }} />)}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {loading && <p className="text-body-md" style={{ color: "var(--r-outline)", textAlign: "center", padding: 8 }}>Loading follow-ups…</p>}

        {/* Selected day panel */}
        {selected && (
          <div className={`r-card ${styles.selectedPanel}`}>
            <div className={styles.selectedHeader}>
              <span className="text-headline-md">
                {new Date(selected + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
              </span>
              <button className={styles.clearSel} onClick={() => setSelected(null)}>×</button>
            </div>
            {selectedLeads.length === 0
              ? <p className="text-body-md" style={{ color: "var(--r-outline)", padding: "16px 0" }}>No follow-ups scheduled for this day.</p>
              : selectedLeads.map(l => <LeadRow key={l.id} lead={l} onClick={() => router.push(`/leads/${l.id}`)} />)
            }
          </div>
        )}

        {/* Follow-up list */}
        <div className={styles.listSection}>
          <h2 className="text-headline-md" style={{ marginBottom: 16 }}>All Follow-ups</h2>

          {overdueSplit.length > 0 && (
            <Section title="Overdue" color="var(--r-error)">
              {overdueSplit.map(l => <LeadRow key={l.id} lead={l} onClick={() => router.push(`/leads/${l.id}`)} />)}
            </Section>
          )}
          {todaySplit.length > 0 && (
            <Section title="Today" color="var(--r-secondary)">
              {todaySplit.map(l => <LeadRow key={l.id} lead={l} onClick={() => router.push(`/leads/${l.id}`)} />)}
            </Section>
          )}
          {upcomingSplit.length > 0 && (
            <Section title="Upcoming" color="var(--r-primary)">
              {upcomingSplit.map(l => <LeadRow key={l.id} lead={l} onClick={() => router.push(`/leads/${l.id}`)} />)}
            </Section>
          )}

          {!loading && listLeads.length === 0 && (
            <div className={styles.empty}>
              <CalendarDays size={48} color="var(--r-outline)" />
              <p className="text-body-md" style={{ color: "var(--r-outline)" }}>No pending follow-ups. Enjoy the clear day!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Section({ title, color, children }) {
  return (
    <div className={styles.section}>
      <p className="text-label-md" style={{ color, marginBottom: 8 }}>{title}</p>
      {children}
    </div>
  );
}

function LeadRow({ lead, onClick }) {
  const temp = getTempStyle(lead.temperature || "cold");
  const fu = formatFollowUp(lead.followUpDate);
  return (
    <div className={styles.leadRow} style={{ borderLeftColor: temp.text }} onClick={onClick}>
      <div className={styles.leadInfo}>
        <span className="text-body-md" style={{ fontWeight: 600 }}>{lead.name}</span>
        <span className="text-body-md" style={{ color: "var(--r-on-surface-variant)" }}>{lead.projectInterest || lead.mobile}</span>
      </div>
      <span className="text-data-mono" style={{ color: isOverdue(lead.followUpDate) ? "var(--r-error)" : "var(--r-secondary)", fontWeight: 600 }}>
        {fu}
      </span>
    </div>
  );
}
