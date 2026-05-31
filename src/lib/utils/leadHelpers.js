import { todayStr, addDays, daysSince } from "./dateHelpers";

import { TEMP_COLORS, STATUS_COLOR } from "./constants";

// Auto-calculate temperature from lead data
// FIX #2: Previously, brand-new leads always showed as "Hot" because
// calcTemperature used createdAt as fallback → daysSince = 0 ≤ 3 → "hot".
// Now we only mark "hot" based on lastContactedAt (an actual interaction),
// or a follow-up date that is very soon. A fresh lead with no calls
// starts as "warm" until there is real engagement.
export function calcTemperature(lead) {
  const dead = ["converted", "lost", "disqualified", "invalid_number"];
  if (dead.includes(lead.status)) return "dormant";

  const followUp   = lead.followUpDate;
  const today      = todayStr();
  const in7        = addDays(7);
  const in30       = addDays(30);

  // Use ONLY lastContactedAt for recency — not createdAt / updatedAt.
  // lastContactedAt is only set when the broker actually calls / logs an interaction.
  const lastContact = daysSince(lead.lastContactedAt);   // 9999 if never contacted

  // Hot: follow-up is overdue, today, or within 7 days  AND  was contacted at least once
  if (followUp && followUp <= in7 && lead.lastContactedAt) return "hot";

  // Hot: actual recent contact in last 3 days
  if (lastContact <= 3) return "hot";

  // Warm: follow-up coming within 30 days (even if not yet contacted)
  if (followUp && followUp <= in30) return "warm";

  // Warm: contacted within 14 days
  if (lastContact <= 14) return "warm";

  // Cold: contacted before but fading (15–60 days)
  if (lastContact <= 60) return "cold";

  // If never contacted (lastContact = 9999) and no follow-up set → warm (new lead, give benefit of doubt)
  if (!lead.lastContactedAt) return "warm";

  // Dormant: 60+ days since last contact
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

// ─── 4.6: AI Lead Scoring v2 ────────────────────────────────────────────────
// Learns from actual conversion outcomes across the broker's lead base.
// Returns a score 0-100 and a breakdown of factors.
export function calcLeadScore(lead, allLeads = []) {
  if (!lead) return { score: 0, breakdown: {} };

  // Build historical stats from all leads
  const stats = buildConversionStats(allLeads);
  const breakdown = {};

  // 1. Source quality (0-25 pts) — based on actual conversion rate of that source
  let sourceScore = 12; // neutral default
  if (lead.source && stats.sourceConversion[lead.source]) {
    const rate = stats.sourceConversion[lead.source];
    sourceScore = Math.round(rate * 25); // 100% conversion = 25 pts
  }
  breakdown.source = sourceScore;

  // 2. Status progression (0-25 pts)
  const statusWeights = {
    new: 5, contacted: 10, interested: 15, details_shared: 18,
    visit_scheduled: 20, visit_done: 22, negotiating: 24, converted: 25,
  };
  const statusScore = statusWeights[lead.status] || 5;
  breakdown.status = statusScore;

  // 3. Interaction recency & frequency (0-25 pts)
  const days = daysSince(lead.lastContactedAt);
  let recencyScore = 0;
  if (days <= 1) recencyScore = 25;
  else if (days <= 3) recencyScore = 20;
  else if (days <= 7) recencyScore = 15;
  else if (days <= 14) recencyScore = 10;
  else if (days <= 30) recencyScore = 5;
  else recencyScore = 2;
  // Interaction count bonus
  const interactionCount = lead.interactionCount || 0;
  if (interactionCount >= 5) recencyScore += 0; // capped
  else if (interactionCount >= 3) recencyScore = Math.min(recencyScore + 3, 25);
  else if (interactionCount >= 1) recencyScore = Math.min(recencyScore + 1, 25);
  breakdown.recency = recencyScore;

  // 4. Requirement clarity (0-15 pts)
  let clarityScore = 0;
  if (lead.bhk) clarityScore += 4;
  if (lead.budget) clarityScore += 4;
  if (lead.projectInterest) clarityScore += 4;
  if (lead.type) clarityScore += 3;
  breakdown.clarity = clarityScore;

  // 5. Follow-up discipline (0-10 pts)
  let followupScore = 0;
  if (lead.followUpDate) {
    const fu = lead.followUpDate;
    const today = todayStr();
    const in3 = addDays(3);
    if (fu === today) followupScore = 10;
    else if (fu <= in3) followupScore = 8;
    else followupScore = 5;
  } else {
    followupScore = 2; // no follow-up set = low discipline
  }
  breakdown.followup = followupScore;

  const total = sourceScore + statusScore + recencyScore + clarityScore + followupScore;
  const score = Math.min(total, 100);

  // Derive temperature from score
  let temp = "cold";
  if (score >= 75) temp = "hot";
  else if (score >= 50) temp = "warm";
  else if (score >= 25) temp = "cold";
  else temp = "dormant";

  return { score, temp, breakdown, stats };
}

function buildConversionStats(leads) {
  const sourceStats = {};
  for (const l of leads) {
    const src = l.source || "Unknown";
    if (!sourceStats[src]) sourceStats[src] = { total: 0, converted: 0 };
    sourceStats[src].total += 1;
    if (l.status === "converted") sourceStats[src].converted += 1;
  }

  const sourceConversion = {};
  for (const [src, data] of Object.entries(sourceStats)) {
    sourceConversion[src] = data.total > 0 ? data.converted / data.total : 0;
  }

  return { sourceConversion };
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
      case "leadDate":   va = a.leadDate || "9999";       vb = b.leadDate || "9999";       break;
      case "followUp":   va = a.followUpDate || "9999";  vb = b.followUpDate || "9999";  break;
      case "status":     va = a.status || "";            vb = b.status || "";            break;
      case "priority":   va = ["hot","warm","cold","dormant"].indexOf(a.temperature||"warm");
                         vb = ["hot","warm","cold","dormant"].indexOf(b.temperature||"warm"); break;
      case "source":     va = a.source || "";            vb = b.source || "";            break;
      default:           va = a.createdAt?.seconds || 0; vb = b.createdAt?.seconds || 0; break;
    }
    if (va < vb) return sortDir === "asc" ? -1 :  1;
    if (va > vb) return sortDir === "asc" ?  1 : -1;
    return 0;
  });
}

// Filter leads
export function filterLeads(leads, { search, status, source, type, priority, archived, dateFrom, dateTo }) {
  return leads.filter(l => {
    // By default, hide archived leads unless explicitly viewing archived
    if (archived) {
      if (!l.isArchived) return false;
    } else {
      if (l.isArchived) return false;
    }
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
    // Date range filter on leadDate
    if (dateFrom && l.leadDate) {
      if (l.leadDate < dateFrom) return false;
    }
    if (dateTo && l.leadDate) {
      if (l.leadDate > dateTo) return false;
    }
    return true;
  });
}
