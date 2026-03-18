// ─── Lead Statuses ────────────────────────────────────────────────────────────
export const LEAD_STATUSES = [
  { value: "new",               label: "New",                  color: "#8A8070" },
  { value: "contacted",         label: "Contacted",            color: "#3A6EA8" },
  { value: "interested",        label: "Interested",           color: "#1A7842" },
  { value: "details_shared",    label: "Details Shared",       color: "#0E7490" },
  { value: "visit_scheduled",   label: "Visit Scheduled",      color: "#5C3A8C" },
  { value: "visit_done",        label: "Visit Done",           color: "#3A208C" },
  { value: "negotiating",       label: "Negotiating",          color: "#B06020" },
  { value: "converted",         label: "Converted ✓",          color: "#1A7842" },
  { value: "call_back",         label: "Call Back",            color: "#3A6EA8" },
  { value: "not_answering",     label: "Not Answering",        color: "#C49A2A" },
  { value: "busy",              label: "Busy",                 color: "#C49A2A" },
  { value: "switched_off",      label: "Switched Off",         color: "#8A8070" },
  { value: "not_interested",    label: "Not Interested",       color: "#C43018" },
  { value: "lost",              label: "Lost",                 color: "#C43018" },
  { value: "invalid_number",    label: "Invalid Number",       color: "#8A8070" },
];

export const CALL_OUTCOMES = [
  { value: "interested",        label: "Interested — wants more info" },
  { value: "details_shared",    label: "Sent details / brochure"      },
  { value: "visit_confirmed",   label: "Site visit confirmed"         },
  { value: "call_back",         label: "Call back later"              },
  { value: "not_interested",    label: "Not interested"               },
  { value: "negotiating",       label: "In negotiation"               },
  { value: "converted",         label: "Deal closed 🎉"              },
  { value: "other",             label: "Other"                        },
];

export const LEAD_SOURCES = [
  "99acres", "Housing.com", "MagicBricks", "Meta Ads",
  "Google Ads", "Referral", "Cold Call", "WhatsApp",
  "Site Visit", "Builder Event", "Other",
];

export const LEAD_TYPES = ["Buy", "Rent"];

export const PRIORITIES = ["Hot", "Warm", "Cold"];

// FIX #7: Renamed "Plot" → "Plot / Land" for clarity.
// All options now visible in forms (previously .slice(0,6) was hiding the last 4).
export const BHK_OPTIONS = [
  "Studio", "1 BHK", "2 BHK", "3 BHK", "4 BHK",
  "5 BHK", "Villa", "Plot / Land", "Commercial", "Other",
];

export const INVENTORY_TYPES = ["Sale", "Rent"];

export const AVAILABILITY = [
  { value: "available",       label: "Available",          color: "#1A7842", bg: "#E8F5EE" },
  { value: "negotiating",     label: "Under Negotiation",  color: "#B06020", bg: "#FBF0E5" },
  { value: "sold",            label: "Sold",               color: "#C43018", bg: "#FCEAE8" },
  { value: "rented",          label: "Rented",             color: "#5C3A8C", bg: "#F2EBFB" },
];

// Quick follow-up date options
export const FOLLOWUP_QUICK = [
  { label: "Tomorrow",    days: 1  },
  { label: "3 Days",      days: 3  },
  { label: "1 Week",      days: 7  },
  { label: "2 Weeks",     days: 14 },
  { label: "1 Month",     days: 30 },
];

// Temperature colours
export const TEMP_COLORS = {
  hot:     { border: "#D64018", bg: "#FCEAE5", text: "#D64018", label: "Hot"     },
  warm:    { border: "#C49A2A", bg: "#FBF3DC", text: "#C49A2A", label: "Warm"    },
  cold:    { border: "#3A6EA8", bg: "#E8F0FA", text: "#3A6EA8", label: "Cold"    },
  dormant: { border: "#8A8070", bg: "#F0EBE3", text: "#8A8070", label: "Dormant" },
};

// Status → colour map for quick lookup
export const STATUS_COLOR = Object.fromEntries(
  LEAD_STATUSES.map((s) => [s.value, s.color])
);
