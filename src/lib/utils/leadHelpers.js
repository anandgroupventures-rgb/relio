import { todayStr, addDays, daysSince } from "./dateHelpers";
import { TEMP_COLORS, STATUS_COLOR } from "./constants";

// Auto-calculate temperature from lead data
export function calcTemperature(lead) {
  const dead = ["converted", "lost", "disqualified", "invalid_number"];
  if (dead.includes(lead.status)) return "dormant";

  const lastContact = daysSince(lead.lastContactedAt || lead.updatedAt || lead.createdAt);
  const followUp    = lead.followUpDate;
  const today       = todayStr();
  const in7         = addDays(7);

  // Hot: follow-up is today, overdue, or within 7 days
  if (followUp && followUp <= in7) return "hot";
  // Hot: contacted recently
  if (lastContact <= 3) return "hot";
  // Warm: contacted within 14 days or follow-up within 30 days
  if (lastContact <= 14) return "warm";
  if (followUp && followUp <= addDays(30)) return "warm";
  // Cold: no contact 30+ days
  if (lastContact <= 60) return "cold";
  // Dormant: 60+ days
  return "dormant";
}

export function getTempStyle(temp) {
  return TEMP_COLORS[temp] || TEMP_COLORS.cold;
}

export function getStatusColor(status) {
  return STATUS_COLOR[status] || "#8A8070";
}

export function getStatusLabel(status) {
  return status?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "";
}

// Check if mobile number already exists in leads array
export function findDuplicate(leads, mobile, excludeId = null) {
  const clean = mobile.replace(/\D/g, "");
  return leads.find(l =>
    l.id !== excludeId &&
    l.mobile?.replace(/\D/g, "") === clean &&
    clean.length >= 10
  );
}

// Sort leads
export function sortLeads(leads, sortBy, sortDir) {
  return [...leads].sort((a, b) => {
    let va, vb;
    switch (sortBy) {
      case "name":       va = a.name?.toLowerCase();     vb = b.name?.toLowerCase();     break;
      case "followUp":   va = a.followUpDate || "9999";  vb = b.followUpDate || "9999";  break;
      case "status":     va = a.status || "";            vb = b.status || "";            break;
      case "priority":   va = ["hot","warm","cold","dormant"].indexOf(a.temperature||"cold");
                         vb = ["hot","warm","cold","dormant"].indexOf(b.temperature||"cold"); break;
      case "source":     va = a.source || "";            vb = b.source || "";            break;
      default:           va = a.createdAt?.seconds || 0; vb = b.createdAt?.seconds || 0; break;
    }
    if (va < vb) return sortDir === "asc" ? -1 :  1;
    if (va > vb) return sortDir === "asc" ?  1 : -1;
    return 0;
  });
}

// Filter leads
export function filterLeads(leads, { search, status, source, type, priority }) {
  return leads.filter(l => {
    if (search) {
      const q = search.toLowerCase();
      const match = [l.name, l.mobile, l.projectInterest, l.remarks, l.source]
        .some(v => v?.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (status   && l.status   !== status)   return false;
    if (source   && l.source   !== source)   return false;
    if (type     && l.type     !== type)     return false;
    if (priority && (l.temperature || calcTemperature(l)) !== priority.toLowerCase()) return false;
    return true;
  });
}
