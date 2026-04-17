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
