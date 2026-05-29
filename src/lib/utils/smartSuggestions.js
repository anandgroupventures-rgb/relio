/** Smart Suggestions Engine for Relio
 *  Combines: Auto-followup suggestions, property-lead matching alerts, best call time
 */

import { daysSince, todayStr, addDays } from "./dateHelpers";

// ─── 4.3: Auto-Followup Suggestions ───────────────────────────────────────────
// "You haven't called Priya Sharma in 5 days — she was hot last week."
export function getFollowupSuggestions(leads) {
  const suggestions = [];
  const today = todayStr();

  for (const lead of leads) {
    if (["converted", "lost", "disqualified", "invalid_number"].includes(lead.status)) continue;

    const days = daysSince(lead.lastContactedAt);
    const wasHot = lead.temperature === "hot" || lead.lastTemperature === "hot";
    const hasFollowUp = lead.followUpDate && lead.followUpDate >= today;
    const daysSinceCreated = daysSince(lead.createdAt);

    // Priority 1: Hot leads not contacted in 3+ days
    if (wasHot && days >= 3 && days < 14) {
      suggestions.push({
        type: "followup_urgent",
        priority: 1,
        leadId: lead.id,
        leadName: lead.name,
        message: `${lead.name} was hot — no contact in ${days} days`,
        subtext: hasFollowUp ? `Follow-up: ${lead.followUpDate}` : "No follow-up set",
        action: "call",
        days,
      });
      continue;
    }

    // Priority 2: Warm leads not contacted in 7+ days
    if (days >= 7 && days < 21 && !wasHot) {
      suggestions.push({
        type: "followup",
        priority: 2,
        leadId: lead.id,
        leadName: lead.name,
        message: `${lead.name} — no contact in ${days} days`,
        subtext: lead.projectInterest || "Check status",
        action: "call",
        days,
      });
      continue;
    }

    // Priority 3: New leads (created < 7 days) never contacted
    if (!lead.lastContactedAt && daysSinceCreated < 7) {
      suggestions.push({
        type: "new_lead",
        priority: 3,
        leadId: lead.id,
        leadName: lead.name,
        message: `First call: ${lead.name}`,
        subtext: lead.projectInterest || "New lead — reach out",
        action: "call",
        days: daysSinceCreated,
      });
    }
  }

  return suggestions.sort((a, b) => a.priority - b.priority).slice(0, 5);
}

// ─── 4.1: Property-Lead Matching Score ──────────────────────────────────────
// Score 0-100 based on BHK, area, budget match
export function scorePropertyMatch(lead, property) {
  let score = 0;
  let reasons = [];

  // BHK match (30 pts)
  if (lead.bhk && property.bhk) {
    if (lead.bhk === property.bhk) {
      score += 30;
      reasons.push("Exact BHK match");
    } else if (lead.bhk.includes("BHK") && property.bhk.includes("BHK")) {
      const leadN = parseInt(lead.bhk);
      const propN = parseInt(property.bhk);
      if (!isNaN(leadN) && !isNaN(propN) && Math.abs(leadN - propN) <= 1) {
        score += 15;
        reasons.push("Similar BHK");
      }
    }
  }

  // Area/location match (30 pts)
  if (lead.projectInterest && property.area) {
    const leadArea = lead.projectInterest.toLowerCase();
    const propArea = property.area.toLowerCase();
    if (propArea.includes(leadArea) || leadArea.includes(propArea)) {
      score += 30;
      reasons.push("Location match");
    }
  }
  if (lead.projectInterest && property.projectName) {
    const leadProj = lead.projectInterest.toLowerCase();
    const propProj = property.projectName.toLowerCase();
    if (propProj.includes(leadProj) || leadProj.includes(propProj)) {
      score += 25;
      reasons.push("Project match");
    }
  }

  // Budget match (25 pts)
  if (lead.budget && property.totalPrice) {
    const leadBudget = parseBudget(lead.budget);
    const propPrice = parsePrice(property.totalPrice);
    if (leadBudget && propPrice) {
      const ratio = propPrice / leadBudget;
      if (ratio >= 0.8 && ratio <= 1.2) {
        score += 25;
        reasons.push("Budget match");
      } else if (ratio >= 0.6 && ratio <= 1.4) {
        score += 12;
        reasons.push("Near budget");
      }
    }
  }

  // Property type match (15 pts)
  if (lead.type && property.type) {
    const leadType = lead.type.toLowerCase();
    const propType = property.type.toLowerCase();
    if (leadType === propType || (leadType === "buy" && propType === "sale") || (leadType === "rent" && propType === "rent")) {
      score += 15;
      reasons.push("Type match");
    }
  }

  return { score: Math.min(score, 100), reasons };
}

// ─── 4.2: Find Matching Properties for a Lead ───────────────────────────────
export function findMatchingProperties(lead, inventory, minScore = 40) {
  if (!lead || !inventory || inventory.length === 0) return [];
  const matches = inventory
    .map(prop => ({ ...prop, match: scorePropertyMatch(lead, prop) }))
    .filter(prop => prop.match.score >= minScore && prop.availability === "available")
    .sort((a, b) => b.match.score - a.match.score);
  return matches.slice(0, 5);
}

// ─── 4.2: Find Leads that Match a New Property ──────────────────────────────
export function findMatchingLeads(property, leads, minScore = 40) {
  if (!property || !leads || leads.length === 0) return [];
  const matches = leads
    .filter(l => !["converted", "lost", "disqualified", "invalid_number"].includes(l.status))
    .map(lead => ({ ...lead, match: scorePropertyMatch(lead, property) }))
    .filter(lead => lead.match.score >= minScore)
    .sort((a, b) => b.match.score - a.match.score);
  return matches.slice(0, 5);
}

// ─── 4.4: Best Time to Call Prediction ──────────────────────────────────────
// Simple heuristic: extract hour from call interactions, return most common hour range
export function predictBestCallTime(interactions) {
  if (!interactions || interactions.length === 0) return null;

  const callHours = interactions
    .filter(i => i.type === "call" && i.createdAt)
    .map(i => {
      const d = i.createdAt.toDate ? i.createdAt.toDate() : new Date(i.createdAt);
      return d.getHours();
    });

  if (callHours.length === 0) return null;

  // Count by hour
  const hourCounts = {};
  for (const h of callHours) {
    hourCounts[h] = (hourCounts[h] || 0) + 1;
  }

  // Find peak hour
  const peakHour = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])[0];

  if (!peakHour) return null;

  const hour = parseInt(peakHour[0]);
  const count = peakHour[1];
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;

  return {
    hour,
    display: `${displayHour}:00 ${ampm}`,
    confidence: Math.min((count / callHours.length) * 100, 95),
    sampleSize: callHours.length,
    range: `${displayHour}-${displayHour + 1} ${ampm}`,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseBudget(budgetStr) {
  if (!budgetStr) return null;
  const str = budgetStr.toString().toLowerCase().replace(/,/g, "");
  const crore = str.match(/(\d+\.?\d*)\s*cr/i);
  if (crore) return parseFloat(crore[1]) * 10000000;
  const lakh = str.match(/(\d+\.?\d*)\s*l/i);
  if (lakh) return parseFloat(lakh[1]) * 100000;
  const num = str.match(/(\d+)/);
  if (num) return parseFloat(num[1]);
  return null;
}

function parsePrice(priceStr) {
  if (!priceStr) return null;
  if (typeof priceStr === "number") return priceStr;
  return parseBudget(priceStr);
}
