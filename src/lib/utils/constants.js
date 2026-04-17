// ─── Lead Stages (Pipeline) ───────────────────────────────────────────────────
// Stages flow: New → Contacted → Qualified → Visit Scheduled → Visited → Booked → Closed
export const LEAD_STAGES = [
  // Active Pipeline
  { value: "new",               label: "New",                  color: "#6b7280", icon: "sparkles", order: 1 },
  { value: "contacted",         label: "Contacted",            color: "#3b82f6", icon: "phone", order: 2 },
  { value: "qualified",         label: "Qualified",            color: "#8b5cf6", icon: "check-circle", order: 3 },
  { value: "visit_scheduled",   label: "Visit Scheduled",      color: "#f59e0b", icon: "calendar", order: 4 },
  { value: "visited",           label: "Site Visited",         color: "#10b981", icon: "home", order: 5 },
  { value: "call_back",         label: "Call Back",            color: "#f97316", icon: "phone-call", order: 6 },
  { value: "follow_up",         label: "Follow Up Required",   color: "#84cc16", icon: "refresh-cw", order: 7 },
  
  // Closed States (Outcome)
  { value: "booked",            label: "Deal Booked ✓",        color: "#16a34a", icon: "party-popper", order: 8, isClosed: true },
  { value: "closed_won",        label: "Closed - Won",       color: "#15803d", icon: "trophy", order: 9, isClosed: true },
  { value: "disqualified",      label: "Disqualified",       color: "#dc2626", icon: "x-circle", order: 10, isClosed: true },
];

// For backward compatibility, map old statuses to new stages
export const LEAD_STATUSES = LEAD_STAGES;

// ─── Archive Reasons (for disqualified/archived leads) ──────────────────────────
export const ARCHIVE_REASONS = [
  { value: "not_interested",     label: "Not Interested",       description: "Lead not interested in buying/renting" },
  { value: "budget_mismatch",    label: "Budget Mismatch",      description: "Budget doesn't match available properties" },
  { value: "not_responding",     label: "Not Responding",       description: "No response after multiple attempts" },
  { value: "wrong_number",       label: "Wrong Number",         description: "Invalid or incorrect phone number" },
  { value: "already_bought",     label: "Already Bought",       description: "Lead already purchased elsewhere" },
  { value: "location_issue",     label: "Location Issue",       description: "Wants different location/area" },
  { value: "time_waster",        label: "Time Waster",          description: "Not serious, just browsing" },
  { value: "duplicate",          label: "Duplicate Lead",       description: "Same person, already in system" },
  { value: "other",              label: "Other",                description: "Other reason" },
];

// ─── Lead Categories (Lead Quality/Source Type) ────────────────────────────────
export const LEAD_CATEGORIES = [
  { value: "primary",           label: "⭐ Primary",          color: "#fbbf24", description: "Direct inquiry, serious buyer" },
  { value: "referral",          label: "🤝 Referral",         color: "#8b5cf6", description: "Referred by existing client" },
  { value: "portal",            label: "🌐 Portal Lead",      color: "#3b82f6", description: "From 99acres, MagicBricks, etc." },
  { value: "walkin",            label: "🚶 Walk-in",          color: "#10b981", description: "Came to office directly" },
  { value: "cold",              label: "📞 Cold Call",        color: "#6b7280", description: "You called them first" },
  { value: "nurture",           label: "🌱 Nurture",          color: "#84cc16", description: "Long-term potential (6+ months)" },
];

// ─── Call Outcomes ────────────────────────────────────────────────────────────
export const CALL_OUTCOMES = [
  { value: "interested",        label: "Interested — wants more info", score: +20 },
  { value: "details_shared",    label: "Sent details / brochure",      score: +15 },
  { value: "visit_confirmed",   label: "Site visit confirmed",         score: +30 },
  { value: "call_back",         label: "Call back later",                score: +10 },
  { value: "not_interested",    label: "Not interested",                 score: -30 },
  { value: "not_responding",    label: "Not answering calls",           score: -20 },
  { value: "busy",              label: "Busy - try later",             score: +5 },
  { value: "wrong_number",      label: "Wrong number",                 score: -50 },
  { value: "other",             label: "Other",                        score: 0 },
];

// ─── Lead Sources ─────────────────────────────────────────────────────────────
export const LEAD_SOURCES = [
  "99acres", 
  "Housing.com", 
  "MagicBricks", 
  "Meta Ads",
  "Google Ads", 
  "Referral", 
  "Cold Call", 
  "WhatsApp",
  "Site Visit", 
  "Builder Event", 
  "OLX", 
  "Facebook",
  "Instagram", 
  "JustDial", 
  "Sulekha",
  "Other",
];

// ─── Lead Types ───────────────────────────────────────────────────────────────
export const LEAD_TYPES = ["Buy", "Rent"];

// ─── BHK/Configuration Options (Updated) ─────────────────────────────────────
export const BHK_OPTIONS = [
  "Studio",
  "1 BHK",
  "2 BHK", 
  "3 BHK",
  "4 BHK",
  "5 BHK",
  "Villa",
  "Plot / Land",
  "Commercial Shop",
  "Office Space",
  "Warehouse",
  "Other",
];

// ─── Property Types (Additional categorization) ───────────────────────────────
export const PROPERTY_TYPES = [
  { value: "builder_floor",    label: "Builder Floor" },
  { value: "apartment",        label: "Apartment" },
  { value: "villa",            label: "Villa / Independent House" },
  { value: "plot",             label: "Plot / Land" },
  { value: "commercial",       label: "Commercial" },
  { value: "office",           label: "Office Space" },
  { value: "shop",             label: "Retail Shop" },
  { value: "warehouse",        label: "Warehouse/Godown" },
  { value: "other",            label: "Other" },
];

// ─── Budget Ranges (for Indian market - in Lakhs/Crores) ─────────────────────
export const BUDGET_RANGES = [
  { value: "under_50l",     label: "Under ₹50 Lac",       max: 50 },
  { value: "50l_to_1cr",    label: "₹50 Lac - ₹1 Cr",     max: 100 },
  { value: "1cr_to_2cr",    label: "₹1 Cr - ₹2 Cr",       max: 200 },
  { value: "2cr_to_3cr",    label: "₹2 Cr - ₹3 Cr",       max: 300 },
  { value: "3cr_to_5cr",    label: "₹3 Cr - ₹5 Cr",       max: 500 },
  { value: "5cr_to_10cr",   label: "₹5 Cr - ₹10 Cr",      max: 1000 },
  { value: "above_10cr",    label: "Above ₹10 Cr",        max: null },
  { value: "custom",        label: "Custom Budget",       max: null },
];

// ─── Timeline/Purchase Urgency ───────────────────────────────────────────────
export const PURCHASE_TIMELINE = [
  { value: "immediate",       label: "Immediate (0-1 month)",       score: +25 },
  { value: "short_term",    label: "Short Term (1-3 months)",     score: +20 },
  { value: "medium_term",   label: "Medium Term (3-6 months)",  score: +10 },
  { value: "long_term",     label: "Long Term (6+ months)",     score: +5 },
  { value: "just_browsing", label: "Just Browsing",             score: -10 },
];

// ─── Inventory Types ──────────────────────────────────────────────────────────
export const INVENTORY_TYPES = ["Sale", "Rent"];

// ─── Inventory Availability ───────────────────────────────────────────────────
export const AVAILABILITY = [
  { value: "available",       label: "Available",          color: "#1A7842", bg: "#E8F5EE" },
  { value: "negotiating",     label: "Under Negotiation",  color: "#B06020", bg: "#FBF0E5" },
  { value: "sold",            label: "Sold",               color: "#C43018", bg: "#FCEAE8" },
  { value: "rented",          label: "Rented",             color: "#5C3A8C", bg: "#F2EBFB" },
];

// ─── Follow-up Quick Options ──────────────────────────────────────────────────
export const FOLLOWUP_QUICK = [
  { label: "Tomorrow",        days: 1 },
  { label: "In 2 Days",       days: 2 },
  { label: "In 3 Days",       days: 3 },
  { label: "1 Week",          days: 7 },
  { label: "2 Weeks",         days: 14 },
  { label: "1 Month",         days: 30 },
];

// ─── Auto-Archive Settings ───────────────────────────────────────────────────
export const AUTO_ARCHIVE_CONFIG = {
  enabled: true,
  daysOfInactivity: 90,           // Archive after 90 days of no activity
  stagesToAutoArchive: ["new", "contacted", "call_back"],  // Only archive these stages
  excludeIfHot: true,             // Don't archive Hot leads even if inactive
  deletePermanentlyAfterDays: 365, // Delete archived leads after 1 year
};

// ─── Lead Scoring Configuration ────────────────────────────────────────────
export const LEAD_SCORING = {
  // Base scores
  NEW_LEAD: 10,
  
  // Positive factors
  CALL_BACK: 20,
  SPECIFIC_BUDGET: 15,
  SPECIFIC_TIMELINE: 25,
  SITE_VISIT_COMPLETED: 30,
  INTERESTED: 20,
  DETAILS_SHARED: 15,
  VISIT_CONFIRMED: 30,
  REFERRAL_SOURCE: 10,
  
  // Negative factors
  NO_RESPONSE: -20,
  NOT_INTERESTED: -30,
  WRONG_NUMBER: -50,
  TIME_WASTER: -40,
  
  // Thresholds
  HOT_THRESHOLD: 75,
  WARM_THRESHOLD: 50,
  COLD_THRESHOLD: 25,
  UNRESPONSIVE_THRESHOLD: -25,
};

// ─── Temperature Display (Auto-calculated) ────────────────────────────────────
export const TEMPERATURE_LEVELS = [
  { min: 75,   label: "🔥 Hot",        color: "#dc2626", action: "Call within 2 hours" },
  { min: 50,   label: "☀️ Warm",       color: "#ea580c", action: "Follow up today" },
  { min: 25,   label: "❄️ Cold",       color: "#3b82f6", action: "Weekly follow-up" },
  { min: -25,  label: "💤 Dormant",    color: "#6b7280", action: "Check after 2 weeks" },
  { min: -100, label: "🚫 Unresponsive", color: "#991b1b", action: "Suggest archive" },
];

// ─── Temperature Colors (legacy support) ──────────────────────────────────────
export const TEMP_COLORS = {
  hot:     { border: "#dc2626", bg: "#fef2f2", text: "#dc2626", label: "Hot" },
  warm:    { border: "#ea580c", bg: "#fff7ed", text: "#ea580c", label: "Warm" },
  cold:    { border: "#3b82f6", bg: "#eff6ff", text: "#3b82f6", label: "Cold" },
  dormant: { border: "#6b7280", bg: "#f3f4f6", text: "#6b7280", label: "Dormant" },
};

// ─── Stage → Color Map ──────────────────────────────────────────────────────
export const STAGE_COLOR = Object.fromEntries(
  LEAD_STAGES.map((s) => [s.value, s.color])
);

// ─── Suggested Next Actions by Stage ────────────────────────────────────────
export const STAGE_ACTIONS = {
  new:                ["Call within 24 hours", "Send welcome message"],
  contacted:          ["Qualify the lead", "Understand requirements"],
  qualified:          ["Share matching properties", "Schedule site visit"],
  visit_scheduled:    ["Send location/address", "Confirm 1 day before"],
  visited:            ["Follow up for feedback", "Discuss pricing"],
  call_back:          ["Call at scheduled time", "Reschedule if needed"],
  follow_up:          ["Follow up on previous discussion", "Send new options"],
  booked:             ["Complete documentation", "Schedule agreement signing"],
  closed_won:         ["Ask for referral", "Maintain relationship"],
  disqualified:       ["Archive with reason", "Remove from active list"],
};
