# Relio Development Plan

> **Target Market**: Solo real estate brokers in India  
> **Version**: V1 (All features free)  
> **Core Philosophy**: Offline-first, mobile-native, WhatsApp-centric

---

## 📊 Project Status

### Phase 1: Foundation (In Progress)
| Item | Status | Completion |
|------|--------|------------|
| 1.1 Offline-First Architecture | ✅ **COMPLETED** | Apr 2026 |
| 1.2 Lead Management System | ✅ **COMPLETED** | Apr 2026 |
| 1.3 Pagination & Performance | ⏳ Pending | - |
| 1.4 UI Foundation (New Design System) | ⏳ Pending | - |

### Phase 2: Core Features (Not Started)
| Item | Status | Completion |
|------|--------|------------|
| 2.1 WhatsApp Integration | 🔲 Not Started | - |
| 2.2 Property Portal Imports | 🔲 Not Started | - |
| 2.3 Today's Agenda View | 🔲 Not Started | - |

### Phase 3: Power Features (Not Started)
### Phase 4: Polish & Analytics (Not Started)

**Last Updated**: April 17, 2026  
**Current Focus**: Phase 1 - Foundation

---

## Current State Analysis

### What's Working
- ✅ Mobile-first responsive design
- ✅ Firebase authentication & Firestore
- ✅ **Lead management with auto-scoring system (COMPLETED)**
- ✅ **Smart lead stages pipeline (COMPLETED)**
- ✅ **Archive system with auto-archive (COMPLETED)**
- ✅ Basic inventory tracking
- ✅ Timeline for interactions
- ✅ Dark mode support
- ✅ Toast notifications
- ✅ Lucide icons
- ✅ **Offline-first architecture (COMPLETED)** - IndexedDB, service worker, sync queue

### What's Missing for India Market
- ✅ ~~No offline support (critical for site visits)~~ **COMPLETED**
- ❌ No WhatsApp integration (primary communication channel)
- ❌ No property portal imports (99acres, MagicBricks)
- ❌ No pagination (will crash with 1000+ leads)
- ❌ Generic "AI template" UI feel
- ❌ No voice notes (brokers prefer speaking over typing)
- ❌ No commission tracking
- ❌ No push notifications for follow-ups

---

## UI/UX Redesign Strategy

### Problem: Current UI Looks "AI-Generated"
The app currently has a generic SaaS template feel:
- Boring card-based layout
- Standard gold/brown color scheme
- No personality or localization
- Feels like a CRM, not a broker's daily companion

### Solution: "The Broker's Pocket Diary" Aesthetic

#### 1. Visual Identity Overhaul
```
Current: Generic corporate gold → Target: Desi Professional

New Direction:
- Primary: Deep Indigo (#4338ca) - trustworthy, Indian favorite
- Accent: Saffron/Orange (#ea580c) - action buttons, urgency
- Background: Warm off-white (#fefcf8) - paper diary feel
- Cards: Subtle shadow with rounded corners (16px radius)
- Font: Inter or Plus Jakarta Sans (modern, readable)
```

#### 2. Layout Changes

**Current (Generic List)**:
```
[Header]
[Search Bar]
[Filter Chips]
[Lead Card 1]
[Lead Card 2]
[Lead Card 3]
[Bottom Nav]
```

**Proposed (Contextual Dashboard)**:
```
[Today's Agenda - Expandable]
  → "3 follow-ups today"
  → "2 site visits scheduled"
  → Tap to expand full list

[Quick Stats Row]
  → New leads this week: 12
  → Hot leads: 5
  → Pending follow-ups: 8

[Lead Stream - Grouped by Date]
  → TODAY
    [Lead Card with actions]
    [Lead Card with actions]
  → TOMORROW
    [Lead Card]
  → THIS WEEK
    [Lead Card]

[Floating Action Button - Add Lead]
[Bottom Nav - Icons with Labels]
```

#### 3. Lead Card Redesign

**Current**: Static card with all info visible
**Proposed**: Smart card with progressive disclosure

```
┌─────────────────────────────────────┐
│ 🟢 Ankit Sharma          📞    💬   │  ← Always visible
│ 3BHK | Smartworld | Dwarka            │
│ 🔥 HOT    📱 98XXXXXXXX               │
│                                     │
│ [Tap to see full details]           │  ← Expand on tap
│                                     │
│ Budget: 1.5cr | Source: 99acres     │  ← Hidden by default
│ Follow-up: Tomorrow                 │
│ [Add Note] [Schedule Visit] [Mark   │
│  Converted]                        │
└─────────────────────────────────────┘
```

#### 4. Home Screen (Today View) Redesign

**Current**: Just a list of leads with "Today" filter
**Proposed**: Daily agenda dashboard

```
┌─────────────────────────────────────┐
│     Tuesday, 17 April 2026          │
│                                     │
│  📅 TODAY'S AGENDA                  │
│  ┌──────────────────────────────┐   │
│  │ 🕘 10:00 AM - Rajesh Kumar   │   │
│  │    Site visit - Palm Gardens  │   │
│  │    [Directions] [Call]        │   │
│  ├──────────────────────────────┤   │
│  │ 🕘 2:00 PM - Priya Sharma    │   │
│  │    Follow-up call             │   │
│  │    [WhatsApp] [Call]          │   │
│  └──────────────────────────────┘   │
│                                     │
│  [+ Add to Today's Agenda]          │
│                                     │
│  🔥 PRIORITY LEADS (Follow-up       │
│     overdue)                        │
│  ┌──────────────────────────────┐   │
│  │ ⚠️ Vikram (2 days overdue)   │   │
│  │    Tap to call now            │   │
│  └──────────────────────────────┘   │
│                                     │
│  📊 TODAY'S STATS                   │
│  Calls made: 5 | Leads added: 2    │
└─────────────────────────────────────┘
```

#### 5. WhatsApp-First Communication

Since WhatsApp is the primary channel for Indian brokers:

```
Replace "Call" and "WhatsApp" buttons with:

[📱 WhatsApp Template]  → Dropdown with:
  - "Hi {name}, following up on {project}. Available for a call?"
  - "Site visit confirmed for {date} at {time}"
  - "New inventory matching your requirements!"
  - "Price drop alert - {project} now {price}"
  - Custom message

[📞 Quick Call] → Direct dial
```

#### 6. Voice-First Input

```
Replace all "Add Note" text areas with:

[🎙️ Tap to record voice note]
[⌨️ Or type note]

Voice notes transcribed automatically (Firebase ML)
Original audio saved alongside transcription
```

#### 7. Indian Context Localization

```
- Date format: DD/MM/YYYY (17/04/2026)
- Currency: ₹ (Rs. 1.5 Cr, Rs. 45,000/month)
- Mobile: Auto-format Indian numbers (+91)
- Area units: Sq. ft. (not sq. meters)
- Common Indian property types: 
  - Plot/Land
  - Builder Floor
  - Independent House
  - Villa
  - Commercial Shop
  - Office Space
```

---

## Phase 1: Foundation (Weeks 1-2)

### ✅ 1.1 Offline-First Architecture - COMPLETED
**Why First**: Everything else depends on this

**Implementation**:
- ✅ Integrate service worker (`public/sw.js`) for caching & background sync
- ✅ Setup IndexedDB with `dexie.js` for local storage
- ✅ Sync queue system: Local changes → Sync when online
- ✅ Conflict resolution: Local pending changes preserved
- ✅ Network status indicator component
- ✅ Offline indicator UI with sync status

**Files Created**:
- `src/lib/firebase/offlineDB.js` - IndexedDB operations
- `src/lib/hooks/useNetwork.js` - Network status hooks
- `src/lib/hooks/ServiceWorkerProvider.js` - SW context
- `src/components/shared/OfflineIndicator.jsx` - UI component
- `public/sw.js` - Service worker
- `public/offline.html` - Fallback page

**User Experience**:
```
[🟢 Online] → [🟡 Syncing...] → [✅ Synced]
[🔴 Offline Mode - Changes saved locally]
```

### ⏳ 1.2 Pagination & Performance - PENDING
**Critical for Scale**

**Implementation**:
- Cursor-based pagination (Firestore `startAfter`)
- Virtualized list using `react-window` or `react-virtuoso`
- Load 20 leads at a time
- Preload next page on scroll

### ⏳ 1.3 UI Foundation (New Design System) - PENDING

**New Color Palette**:
```css
:root {
  /* Primary - Trust & Professional */
  --relio-primary: #4338ca;        /* Indigo */
  --relio-primary-light: #e0e7ff;
  --relio-primary-dark: #3730a3;
  
  /* Accent - Action & Urgency */
  --relio-accent: #ea580c;         /* Saffron */
  --relio-accent-light: #ffedd5;
  
  /* Background - Warm Paper Feel */
  --relio-bg: #fefcf8;
  --relio-bg-card: #ffffff;
  --relio-bg-elevated: #f9fafb;
  
  /* Status - Clear Semantics */
  --relio-hot: #dc2626;            /* Red */
  --relio-warm: #ea580c;           /* Orange */
  --relio-cold: #2563eb;           /* Blue */
  --relio-closed: #16a34a;         /* Green */
  
  /* Text */
  --relio-text: #111827;
  --relio-text-secondary: #6b7280;
  --relio-text-muted: #9ca3af;
}
```

---

## Phase 2: Core Features (Weeks 3-4)

### 2.1 WhatsApp Integration

**Features**:
1. **Quick WhatsApp** (one-tap with template)
2. **Template Manager** (create custom templates)
3. **Auto-fill Context** (pre-fill project name, budget)
4. **WhatsApp History** (track sent messages in timeline)

**Templates** (Default Set):
```
1. "Hi {name}, {brokerName} here. Following up on {project}. Free for a quick call?"
2. "Hi {name}, site visit confirmed for {date} at {time}. Address: {address}"
3. "Hi {name}, great news! Price drop in {project}. Now {newPrice} (was {oldPrice})"
4. "Hi {name}, new inventory matching your {bhk} requirement in {area}. Interested?"
```

### 2.2 Property Portal Imports

**Portals Supported**:
- 99acres
- MagicBricks
- Housing.com
- OLX Homes
- Facebook Marketplace (CSV export)

**Import Flow**:
```
1. User exports leads from portal as Excel/CSV
2. Upload in Relio "Import" section
3. Auto-map columns (Name, Mobile, Project, Budget)
4. Preview before import
5. Deduplicate against existing leads
6. Bulk import with source attribution
```

**CSV Format Support**:
```csv
Name,Mobile,Email,Project,Configuration,Budget,Source,Date
Rajesh Kumar,9876543210,,Smartworld,3BHK,1.5 Cr,99acres,17/04/2026
```

### 2.3 Today's Agenda View

**Redesign the "Today" screen**:
- Morning briefing: "You have 4 follow-ups today"
- Time-blocked agenda (10 AM, 2 PM, etc.)
- Quick actions per item (Call, WhatsApp, Directions)
- Mark as done → Auto-log interaction
- Add spontaneous tasks ("Called back - interested")

---

## Phase 3: Power Features (Weeks 5-6)

### 3.1 Voice Notes

**Implementation**:
- `react-media-recorder` for audio capture
- Store audio in Firebase Storage
- Transcription using Firebase ML or browser's Web Speech API
- Timeline shows: 🎙️ Voice Note (45s) + Transcription

**UI**:
```
[🎙️ Hold to record]
Recording... 00:12
[✓ Done] [✕ Cancel]
```

### 3.2 Lead Scoring (Simple Algorithm)

**Auto-calculate lead temperature** based on:
- Response time (replied within 1 hour = +10 points)
- Engagement (called back = +20 points)
- Budget clarity (specific amount = +15 points)
- Timeline (looking to buy within 3 months = +25 points)
- Site visit completed = +30 points

**Visual Indicator**:
```
[🔥 Hot - 85 points]  [Progress bar]
```

### 3.3 Advanced Search

**Search Capabilities**:
- Full-text search across name, mobile, project, notes
- Filter combinations: Hot + Buy + Dwarka
- Recent searches
- Saved filters ("My Hot Leads This Week")

---

## Phase 4: Polish & Analytics (Weeks 7-8)

### 4.1 Push Notifications

**Triggers**:
- Daily 9 AM: "You have 3 follow-ups today"
- 15 min before scheduled call
- Overdue follow-up: "Vikram's follow-up is 2 days overdue"
- Weekly summary: "You closed 2 deals this week!"

**Implementation**:
- Firebase Cloud Messaging
- Service worker for background sync
- Notification preferences in settings

### 4.2 Basic Analytics Dashboard

**Metrics**:
- Leads added this month
- Conversion funnel (New → Contacted → Site Visit → Closed)
- Response time average
- Best performing lead source
- Revenue this month (manual entry)

**Visual**:
- Simple bar charts (recharts library)
- Monthly trend lines
- Compare to last month

### 4.3 Commission Tracker

**Simple Deal Tracking**:
```
Lead: Rajesh Kumar
Project: Smartworld Gems
Deal Value: ₹1.5 Cr
Commission %: 1%
Commission Amount: ₹1.5 Lakhs
Status: [Received] [Pending] [Partial]
Payment Date: ___
Notes: ___
```

**Dashboard**:
- Monthly commission earned
- Pending commissions
- Total deals closed

---

## Technical Architecture

### Database Schema Additions

```javascript
// New collections needed

users/{uid}/
  ├── leads/{leadId}
  │   ├── ...existing fields
  │   ├── syncStatus: 'synced' | 'pending' | 'conflict'
  │   ├── localUpdatedAt: timestamp
  │   └── voiceNotes: [{url, duration, transcript}]
  │
  ├── syncQueue/{queueId}
  │   ├── action: 'create' | 'update' | 'delete'
  │   ├── collection: 'leads'
  │   ├── docId: string
  │   ├── data: object
  │   └── timestamp
  │
  ├── whatsappTemplates/{templateId}
  │   ├── name: string
  │   ├── message: string
  │   └── isDefault: boolean
  │
  ├── deals/{dealId}
  │   ├── leadId: reference
  │   ├── projectName: string
  │   ├── dealValue: number
  │   ├── commissionPercent: number
  │   ├── commissionAmount: number
  │   ├── status: 'pending' | 'received' | 'partial'
  │   └── closedDate: timestamp
  │
  └── settings/
      ├── notificationPrefs: object
      ├── whatsappTemplates: array
      └── defaultView: 'agenda' | 'list'
```

### Libraries to Add

```json
{
  "dependencies": {
    "workbox-cli": "^7.0.0",
    "dexie": "^3.2.4",
    "react-window": "^1.8.10",
    "react-media-recorder": "^1.6.6",
    "papaparse": "^5.4.1",
    "xlsx": "^0.18.5",
    "recharts": "^2.10.4"
  }
}
```

---

## Success Metrics

### V1 Launch Criteria
- [ ] App works seamlessly offline
- [ ] Can import 100 leads from CSV in < 30 seconds
- [ ] WhatsApp one-tap with templates working
- [ ] Voice notes recording & playback
- [ ] Push notifications delivered reliably
- [ ] Handles 1000+ leads without performance issues

### User Feedback KPIs
- Daily Active Users (target: 60% of registered)
- Avg. session duration (target: 8+ minutes)
- Leads added per user per week (target: 10+)
- WhatsApp sent per day (target: 5+)

---

## Post-V1 Roadmap

### V2 (Teams & Pro Features)
- Multi-agent support
- Manager dashboard
- Lead assignment
- Role-based permissions
- Pro subscription tier ($5/month/agent)

### V3 (AI & Integrations)
- AI-powered lead scoring
- Auto-followup suggestions
- Property portal API integrations (no CSV)
- Google Calendar sync
- Document scanning (agreements, IDs)

### V4 (Ecosystem)
- Broker marketplace
- Lender integrations (home loans)
- Builder tie-ups
- Referral network

---

## Notes

**Design Philosophy**:
- Every feature must work offline first
- WhatsApp is the primary UI, not secondary
- Voice > Text for data entry
- Zero learning curve - if a broker can't use it while driving, it's wrong

**Indian Market Considerations**:
- Low-end devices support (optimize for 2GB RAM phones)
- Slow network handling (2G/3G)
- Multiple languages (Hindi, Punjabi, Marathi...)
- UPI payment integration for commission tracking

---

## Changelog

### April 17, 2026 - v1.2
- ✅ Completed: Phase 1.2 - Lead Management System
- Added: Auto-calculated lead scoring (0-100 points)
- Added: Smart temperature system (Hot/Warm/Cold/Dormant/Unresponsive)
- Added: New lead stages pipeline (New → Contacted → Qualified → Visit Scheduled → Visited → Booked → Closed)
- Added: Lead categories (Primary, Referral, Portal, Walk-in, Cold Call, Nurture)
- Added: Property types (Builder Floor, Apartment, Villa, Plot, Commercial, etc.)
- Added: Purchase timeline tracking
- Added: Budget range selector (Lakhs to Crores)
- Added: Archive system with 8 archive reasons
- Added: Auto-archive after 90 days of inactivity
- Added: Archive modal UI component
- Updated: LeadForm with score display and new fields
- Updated: LeadCard with score badge and suggested actions
- Updated: Updated constants with all new lead parameters

### April 17, 2026 - v1.1
- ✅ Completed: Phase 1.1 - Offline-First Architecture
- Added: IndexedDB integration with Dexie.js
- Added: Service worker for background sync
- Added: Offline indicator UI component
- Added: Sync queue system for pending changes
- Added: Network status detection hooks
- Added: Sync queue system for pending changes
- Added: Network status detection hooks

### April 17, 2026 - v1.0
- Initial development plan created
- UI/UX redesign strategy defined
- 4-phase implementation roadmap

---

**Document Version**: 1.1  
**Last Updated**: April 17, 2026  
**Next Review**: After Phase 1.3 completion (UI Foundation)
