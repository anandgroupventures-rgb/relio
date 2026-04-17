import { LEAD_SCORING, TEMPERATURE_LEVELS } from "./constants";
import { formatDistanceToNow, parseISO } from "./dateHelpers";

/**
 * Calculate lead score based on various factors
 * Returns score from -100 to 100
 */
export function calculateLeadScore(lead, interactions = []) {
  let score = LEAD_SCORING.NEW_LEAD;

  // 1. Source quality
  if (lead.source === "Referral") {
    score += LEAD_SCORING.REFERRAL_SOURCE;
  }

  // 2. Budget clarity
  if (lead.budget && lead.budget.trim().length > 0) {
    score += LEAD_SCORING.SPECIFIC_BUDGET;
  }

  // 3. Timeline urgency
  if (lead.purchaseTimeline) {
    switch (lead.purchaseTimeline) {
      case "immediate":
        score += 25;
        break;
      case "short_term":
        score += 20;
        break;
      case "medium_term":
        score += 10;
        break;
      case "long_term":
        score += 5;
        break;
      case "just_browsing":
        score -= 10;
        break;
    }
  }

  // 4. Analyze interactions
  if (interactions && interactions.length > 0) {
    const sortedInteractions = [...interactions].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    // Recent positive interactions
    const recentPositive = sortedInteractions
      .slice(0, 5)
      .filter(
        (i) =>
          i.outcome === "interested" ||
          i.outcome === "visit_confirmed" ||
          i.outcome === "details_shared"
      ).length;

    score += recentPositive * 10;

    // Recent negative interactions
    const recentNegative = sortedInteractions
      .slice(0, 5)
      .filter(
        (i) =>
          i.outcome === "not_interested" ||
          i.outcome === "not_responding" ||
          i.outcome === "wrong_number"
      ).length;

    // Check for multiple no-responses
    const noResponses = sortedInteractions.filter(
      (i) => i.outcome === "not_responding"
    ).length;

    if (noResponses >= 3) {
      score -= 30; // Multiple no-responses = very cold
    } else if (noResponses >= 1) {
      score -= 20;
    }

    // Check for wrong number
    if (sortedInteractions.some((i) => i.outcome === "wrong_number")) {
      score -= 50;
    }

    // Site visit completed = very positive
    if (sortedInteractions.some((i) => i.outcome === "visit_confirmed")) {
      score += LEAD_SCORING.SITE_VISIT_COMPLETED;
    }

    // Check response time (if last interaction was a call)
    const lastCall = sortedInteractions.find((i) => i.type === "call_answered");
    if (lastCall) {
      score += 15; // They answered a call
    }
  } else {
    // No interactions yet - neutral
    score += 0;
  }

  // 5. Stage-based adjustments
  switch (lead.stage || lead.status) {
    case "visited":
    case "visit_done":
      score += 25;
      break;
    case "booked":
      score += 50;
      break;
    case "closed_won":
      score += 100;
      break;
    case "disqualified":
    case "not_interested":
      score -= 30;
      break;
    case "call_back":
      score += 10;
      break;
  }

  // 6. Last contact recency
  if (lead.lastContactDate) {
    const daysSinceContact = Math.floor(
      (new Date() - new Date(lead.lastContactDate)) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceContact > 30) {
      score -= 15; // No contact for a month
    } else if (daysSinceContact > 14) {
      score -= 5; // No contact for 2 weeks
    } else if (daysSinceContact <= 3) {
      score += 10; // Recent contact
    }
  }

  // 7. Follow-up date urgency
  if (lead.followUpDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const followUp = new Date(lead.followUpDate);
    followUp.setHours(0, 0, 0, 0);

    if (followUp < today) {
      score -= 10; // Overdue follow-up
    } else if (followUp.getTime() === today.getTime()) {
      score += 5; // Follow-up is today
    }
  }

  // Cap the score
  return Math.max(-100, Math.min(100, score));
}

/**
 * Get temperature label and color based on score
 */
export function getTemperatureFromScore(score) {
  for (const level of TEMPERATURE_LEVELS) {
    if (score >= level.min) {
      return {
        label: level.label,
        color: level.color,
        action: level.action,
        score: score,
      };
    }
  }

  // Default to lowest
  const lowest = TEMPERATURE_LEVELS[TEMPERATURE_LEVELS.length - 1];
  return {
    label: lowest.label,
    color: lowest.color,
    action: lowest.action,
    score: score,
  };
}

/**
 * Get suggested action based on lead stage and temperature
 */
export function getSuggestedAction(lead, score) {
  const stage = lead.stage || lead.status || "new";

  // High priority actions first
  if (score >= 75) {
    return {
      priority: "high",
      action: "🔥 Hot Lead - Call within 2 hours",
      icon: "flame",
    };
  }

  if (lead.followUpDate) {
    const today = new Date().toISOString().split("T")[0];
    if (lead.followUpDate < today) {
      return {
        priority: "urgent",
        action: `⚠️ Follow-up overdue (${formatDistanceToNow(
          parseISO(lead.followUpDate)
        )})`,
        icon: "alert-triangle",
      };
    } else if (lead.followUpDate === today) {
      return {
        priority: "high",
        action: "📅 Follow-up is today",
        icon: "calendar",
      };
    }
  }

  // Stage-based suggestions
  switch (stage) {
    case "new":
      return {
        priority: "medium",
        action: "📞 Call within 24 hours",
        icon: "phone",
      };
    case "contacted":
      return {
        priority: "medium",
        action: "❓ Qualify requirements",
        icon: "help-circle",
      };
    case "qualified":
      return {
        priority: "medium",
        action: "🏠 Share matching properties",
        icon: "home",
      };
    case "visit_scheduled":
      return {
        priority: "high",
        action: "📍 Send location details",
        icon: "map-pin",
      };
    case "visited":
      return {
        priority: "high",
        action: "💬 Ask for visit feedback",
        icon: "message-circle",
      };
    case "call_back":
      return {
        priority: "high",
        action: "📞 Call at scheduled time",
        icon: "phone-call",
      };
    case "disqualified":
      return {
        priority: "low",
        action: "📦 Archive this lead",
        icon: "archive",
      };
    default:
      return {
        priority: "low",
        action: "📝 Add interaction note",
        icon: "file-text",
      };
  }
}

/**
 * Check if lead should be auto-archived
 */
export function shouldAutoArchive(lead, config = { daysOfInactivity: 90 }) {
  // Don't archive certain stages
  const nonArchivableStages = ["booked", "closed_won", "visit_scheduled"];
  if (nonArchivableStages.includes(lead.stage || lead.status)) {
    return false;
  }

  // Don't archive hot leads
  if (lead.temperature === "hot" || (lead.score && lead.score >= 75)) {
    return false;
  }

  // Check last activity
  const lastActivity = lead.lastContactDate || lead.updatedAt || lead.createdAt;
  if (!lastActivity) return false;

  const daysSinceActivity = Math.floor(
    (new Date() - new Date(lastActivity)) / (1000 * 60 * 60 * 24)
  );

  return daysSinceActivity >= config.daysOfInactivity;
}

/**
 * Get archive recommendation with reason
 */
export function getArchiveRecommendation(lead, interactions = []) {
  const recommendations = [];

  // Check for wrong number
  if (
    interactions.some(
      (i) => i.outcome === "wrong_number" || i.outcome === "invalid_number"
    )
  ) {
    recommendations.push({
      reason: "wrong_number",
      confidence: "high",
      description: "Invalid phone number",
    });
  }

  // Check for not responding
  const noResponseCount = interactions.filter(
    (i) => i.outcome === "not_responding" || i.outcome === "not_answering"
  ).length;
  if (noResponseCount >= 3) {
    recommendations.push({
      reason: "not_responding",
      confidence: "high",
      description: `Not responding after ${noResponseCount} attempts`,
    });
  }

  // Check for not interested
  if (interactions.some((i) => i.outcome === "not_interested")) {
    recommendations.push({
      reason: "not_interested",
      confidence: "high",
      description: "Explicitly not interested",
    });
  }

  // Check for inactivity
  if (shouldAutoArchive(lead)) {
    recommendations.push({
      reason: "inactive",
      confidence: "medium",
      description: "No activity for 90+ days",
    });
  }

  return recommendations;
}

/**
 * Format score for display (0-100 scale for UI)
 */
export function formatScoreForDisplay(score) {
  // Convert -100 to 100 range to 0 to 100 range
  const normalized = Math.round((score + 100) / 2);
  return Math.max(0, Math.min(100, normalized));
}

/**
 * Get lead health status
 */
export function getLeadHealth(lead, score) {
  if (lead.isArchived || lead.stage === "disqualified") {
    return { status: "archived", color: "#6b7280", label: "Archived" };
  }

  if (lead.stage === "booked" || lead.stage === "closed_won") {
    return { status: "won", color: "#16a34a", label: "Closed Won" };
  }

  if (score >= 75) {
    return { status: "excellent", color: "#dc2626", label: "Hot Lead" };
  } else if (score >= 50) {
    return { status: "good", color: "#ea580c", label: "Warm Lead" };
  } else if (score >= 25) {
    return { status: "fair", color: "#3b82f6", label: "Cold Lead" };
  } else if (score >= -25) {
    return { status: "poor", color: "#6b7280", label: "Dormant" };
  } else {
    return { status: "critical", color: "#991b1b", label: "Unresponsive" };
  }
}
