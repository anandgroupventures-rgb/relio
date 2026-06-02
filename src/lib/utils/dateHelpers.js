// Returns today as YYYY-MM-DD
export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Add N days to today, returns YYYY-MM-DD
export function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Format YYYY-MM-DD → "Today", "Tomorrow", "3 Jan", "15 Mar 2025"
export function formatFollowUp(dateStr) {
  if (!dateStr) return null;
  const today    = todayStr();
  const tomorrow = addDays(1);
  if (dateStr === today)    return "Today";
  if (dateStr === tomorrow) return "Tomorrow";
  const d = new Date(dateStr + "T00:00:00");
  const thisYear = new Date().getFullYear();
  return d.toLocaleDateString("en-IN", {
    day:   "numeric",
    month: "short",
    ...(d.getFullYear() !== thisYear ? { year: "numeric" } : {}),
  });
}

// Is date string overdue (before today)?
export function isOverdue(dateStr) {
  if (!dateStr) return false;
  return dateStr < todayStr();
}

// Is date string today?
export function isToday(dateStr) {
  return dateStr === todayStr();
}

// Days since a Firestore Timestamp or JS Date
export function daysSince(ts) {
  if (!ts) return 9999;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

// Staleness level for inventory
export function stalenessLevel(ts) {
  const days = daysSince(ts);
  if (days <= 14) return { level: "fresh",  color: "#1A7842", bg: "#E8F5EE", label: `${days}d ago` };
  if (days <= 21) return { level: "aging",  color: "#C49A2A", bg: "#FBF3DC", label: `${days}d ago` };
  return              { level: "stale",  color: "#C43018", bg: "#FCEAE8", label: `${days}d ago` };
}

// Format a Firestore timestamp to readable string
export function formatTs(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// Format date for timeline display
export function formatTimelineDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1)   return "Just now";
  if (diffMins < 60)  return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24)   return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7)   return `${diffDays}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// ─── Date Preset Helpers for Lead Filtering ─────────────────────────────────
export const DATE_PRESETS = [
  { value: "today",      label: "Today" },
  { value: "yesterday",  label: "Yesterday" },
  { value: "last7",      label: "Last 7 Days" },
  { value: "thisMonth",  label: "This Month" },
  { value: "custom",     label: "Custom Range" },
];

export function getPresetRange(preset) {
  const today = todayStr();
  const d = new Date();
  switch (preset) {
    case "today": {
      return { from: today, to: today };
    }
    case "yesterday": {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const ys = `${y.getFullYear()}-${String(y.getMonth()+1).padStart(2,'0')}-${String(y.getDate()).padStart(2,'0')}`;
      return { from: ys, to: ys };
    }
    case "last7": {
      const s = new Date();
      s.setDate(s.getDate() - 6);
      const ss = `${s.getFullYear()}-${String(s.getMonth()+1).padStart(2,'0')}-${String(s.getDate()).padStart(2,'0')}`;
      return { from: ss, to: today };
    }
    case "thisMonth": {
      const start = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
      return { from: start, to: today };
    }
    default:
      return { from: "", to: "" };
  }
}

// Validate a YYYY-MM-DD string
export function isValidDateStr(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return false;
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(dateStr)) return false;
  const d = new Date(dateStr + "T00:00:00");
  return !isNaN(d.getTime());
}

// Format a YYYY-MM-DD string to "12 Jan 2025"
export function formatShortDate(dateStr) {
  if (!isValidDateStr(dateStr)) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    day:   "numeric",
    month: "short",
    year:  "numeric",
  });
}
