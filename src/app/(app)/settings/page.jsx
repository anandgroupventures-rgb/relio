"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { useAuth } from "@/lib/hooks/useAuth";
import { logOut } from "@/lib/firebase/auth";
import { getAuthInstance } from "@/lib/firebase/config";
import { usePushNotifications } from "@/lib/hooks/usePushNotifications";
import { useLeads } from "@/lib/hooks/useLeads";
import { useInventory } from "@/lib/hooks/useInventory";
import BottomSheet from "@/components/shared/BottomSheet";
import { ArrowLeft, Bell, Palette, MessageSquare, Download, Wallet, Eye, User, LogOut, ChevronRight, Plus, Trash2, Edit3, Mic, Save, X, Cloud, Smartphone, Send, Gauge } from "lucide-react";
import styles from "./settings.module.css";

const THEMES = [
  { id: "default", label: "Deep Blue", gold: "#000666", bg: "#fcf9f8" },
  { id: "navy", label: "Navy", gold: "#1E5FA8", bg: "#EDF2FA" },
  { id: "forest", label: "Forest", gold: "#1A7842", bg: "#EDF5F0" },
  { id: "rose", label: "Rose", gold: "#C42A6A", bg: "#FAEDF3" },
  { id: "slate", label: "Slate", gold: "#4A5568", bg: "#F0F2F5" },
  { id: "dark", label: "Dark", gold: "#C49A2A", bg: "#1A1612" },
];

const LEAD_FIELDS = [
  { key: "type", label: "Type (Buy/Rent)" },
  { key: "bhk", label: "Configuration (BHK)" },
  { key: "projectInterest", label: "Project / Area" },
  { key: "budget", label: "Budget" },
  { key: "source", label: "Lead Source" },
  { key: "followUpDate", label: "Follow-up Date" },
  { key: "email", label: "Email" },
  { key: "referredBy", label: "Referred By" },
  { key: "remarks", label: "Remarks" },
];

const LEAD_CARD_FIELDS = [
  { key: "temperature", label: "Temperature badge" },
  { key: "mobile", label: "Mobile number" },
  { key: "projectInterest", label: "Project / Area" },
  { key: "budget", label: "Budget" },
  { key: "status", label: "Status" },
  { key: "followUpDate", label: "Follow-up date" },
  { key: "source", label: "Lead source" },
];

function loadPref(key, def) {
  if (typeof window === "undefined") return def;
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; }
}
function savePref(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { leads } = useLeads();
  const { inventory } = useInventory();

  // Password
  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confPass, setConfPass] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState({ type: "", text: "" });

  // Theme
  const [theme, setThemeState] = useState(() => loadPref("relio_theme", "default"));

  // Card fields
  const [cardFields, setCardFields] = useState(() => loadPref("relio_card_fields", ["temperature", "mobile", "projectInterest", "followUpDate", "status"]));

  // Form fields
  const [leadFields, setLeadFields] = useState(() => loadPref("relio_lead_fields", LEAD_FIELDS.map(f => f.key)));

  // WhatsApp templates
  const [templates, setTemplates] = useState(() => loadPref("relio_wa_templates", [
    { id: "1", name: "Follow-up", message: "Hi {name}, following up on {project}. Available for a call?" },
    { id: "2", name: "Site Visit", message: "Hi {name}, site visit confirmed for {date} at {time}." },
    { id: "3", name: "Price Drop", message: "Hi {name}, great news! Price drop in {project}." },
    { id: "4", name: "New Inventory", message: "Hi {name}, new inventory matching your requirements!" },
  ]));
  const [showTemplateSheet, setShowTemplateSheet] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({ name: "", message: "" });

  // Data export
  const [exportBusy, setExportBusy] = useState(false);

  // Push notifications (FCM)
  const { permission: notifStatus, loading: notifLoading, requestPermission: requestPush, sendTestNotification } = usePushNotifications();

  // Google Drive backup
  const [driveBusy, setDriveBusy] = useState(false);

  // SMS templates
  const [smsTemplates, setSmsTemplates] = useState(() => loadPref("relio_sms_templates", [
    { id: "1", name: "Follow-up", message: "Hi {name}, following up on your property inquiry. Call me back when free." },
    { id: "2", name: "Site Visit", message: "Hi {name}, site visit confirmed for {date}. Address: {project}. See you there!" },
    { id: "3", name: "Price Drop", message: "Hi {name}, price drop alert! {project} now at a better rate. Interested?" },
  ]));
  const [showSmsSheet, setShowSmsSheet] = useState(false);
  const [editingSms, setEditingSms] = useState(null);
  const [smsForm, setSmsForm] = useState({ name: "", message: "" });

  function applyTheme(id) {
    const t = THEMES.find(x => x.id === id) || THEMES[0];
    document.documentElement.style.setProperty("--r-primary", t.gold);
    if (t.id === "dark") {
      document.documentElement.style.setProperty("--r-background", "#1A1612");
      document.documentElement.style.setProperty("--r-surface", "#2A2520");
      document.documentElement.style.setProperty("--r-on-surface", "#F5F0EA");
    } else {
      document.documentElement.style.setProperty("--r-background", t.bg);
      document.documentElement.style.setProperty("--r-surface", "#fcf9f8");
      document.documentElement.style.setProperty("--r-on-surface", "#1b1c1c");
    }
    setThemeState(id);
    savePref("relio_theme", id);
  }

  function toggleCardField(key) {
    setCardFields(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      savePref("relio_card_fields", next);
      return next;
    });
  }

  function toggleLeadField(key) {
    setLeadFields(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      savePref("relio_lead_fields", next);
      return next;
    });
  }

  async function handleChangePassword() {
    setPwMsg({ type: "", text: "" });
    if (!curPass) { setPwMsg({ type: "error", text: "Enter your current password." }); return; }
    if (newPass.length < 6) { setPwMsg({ type: "error", text: "New password must be at least 6 characters." }); return; }
    if (newPass !== confPass) { setPwMsg({ type: "error", text: "New passwords do not match." }); return; }
    setPwBusy(true);
    try {
      const realAuth = getAuthInstance();
      if (!realAuth || !realAuth.currentUser) throw new Error("Auth not initialized");
      const cred = EmailAuthProvider.credential(user.email, curPass);
      await reauthenticateWithCredential(realAuth.currentUser, cred);
      await updatePassword(realAuth.currentUser, newPass);
      setPwMsg({ type: "success", text: "Password changed successfully." });
      setCurPass(""); setNewPass(""); setConfPass("");
    } catch (err) {
      const map = {
        "auth/wrong-password": "Current password is incorrect.",
        "auth/weak-password": "New password is too weak.",
        "auth/too-many-requests": "Too many attempts. Try again later.",
      };
      setPwMsg({ type: "error", text: map[err.code] || "Failed. Try again." });
    } finally {
      setPwBusy(false);
    }
  }

  async function handleLogout() {
    await logOut();
    router.replace("/login");
  }

  function handleSaveTemplate() {
    if (!templateForm.name.trim() || !templateForm.message.trim()) return;
    if (editingTemplate) {
      setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? { ...t, ...templateForm } : t));
    } else {
      setTemplates(prev => [...prev, { id: Date.now().toString(), ...templateForm }]);
    }
    savePref("relio_wa_templates", editingTemplate ? templates.map(t => t.id === editingTemplate.id ? { ...t, ...templateForm } : t) : [...templates, { id: Date.now().toString(), ...templateForm }]);
    setShowTemplateSheet(false);
    setEditingTemplate(null);
    setTemplateForm({ name: "", message: "" });
  }

  function handleDeleteTemplate(id) {
    const next = templates.filter(t => t.id !== id);
    setTemplates(next);
    savePref("relio_wa_templates", next);
  }

  async function handleExportLeads() {
    setExportBusy(true);
    try {
      const XLSX = await import("xlsx");
      const rows = leads.map(l => ({
        Name: l.name,
        Mobile: l.mobile,
        Email: l.email || "",
        Type: l.type || "",
        BHK: l.bhk || "",
        Project: l.projectInterest || "",
        Budget: l.budget || "",
        Source: l.source || "",
        Status: l.status || "",
        Temperature: l.temperature || "",
        "Follow Up": l.followUpDate || "",
        Remarks: l.remarks || "",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Leads");
      XLSX.writeFile(wb, `relio-leads-${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch (e) {
      alert("Export failed: " + e.message);
    }
    setExportBusy(false);
  }

  async function handleExportInventory() {
    setExportBusy(true);
    try {
      const XLSX = await import("xlsx");
      const rows = inventory.map(i => ({
        Project: i.projectName,
        Area: i.area || "",
        BHK: i.bhk || "",
        Size: i.size || "",
        Price: i.price || "",
        Availability: i.availability || "",
        "Owner Name": i.ownerName || "",
        "Owner Mobile": i.ownerMobile || "",
        Remarks: i.remarks || "",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventory");
      XLSX.writeFile(wb, `relio-inventory-${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch (e) {
      alert("Export failed: " + e.message);
    }
    setExportBusy(false);
  }

  function handleSaveSmsTemplate() {
    if (!smsForm.name.trim() || !smsForm.message.trim()) return;
    let next;
    if (editingSms) {
      next = smsTemplates.map(t => t.id === editingSms.id ? { ...t, ...smsForm } : t);
    } else {
      next = [...smsTemplates, { id: Date.now().toString(), ...smsForm }];
    }
    setSmsTemplates(next);
    savePref("relio_sms_templates", next);
    setShowSmsSheet(false);
    setEditingSms(null);
    setSmsForm({ name: "", message: "" });
  }

  function handleDeleteSmsTemplate(id) {
    const next = smsTemplates.filter(t => t.id !== id);
    setSmsTemplates(next);
    savePref("relio_sms_templates", next);
  }

  async function handleDriveBackup() {
    setDriveBusy(true);
    try {
      const XLSX = await import("xlsx");
      // Create combined backup workbook
      const leadRows = leads.map(l => ({
        Name: l.name, Mobile: l.mobile, Email: l.email || "",
        Type: l.type || "", BHK: l.bhk || "", Project: l.projectInterest || "",
        Budget: l.budget || "", Source: l.source || "", Status: l.status || "",
        Temperature: l.temperature || "", "Follow Up": l.followUpDate || "",
        Remarks: l.remarks || "",
      }));
      const invRows = inventory.map(i => ({
        Project: i.projectName, Area: i.area || "", BHK: i.bhk || "",
        Size: i.size || "", Price: i.price || "", Availability: i.availability || "",
        "Owner Name": i.ownerName || "", "Owner Mobile": i.ownerMobile || "",
        Remarks: i.remarks || "",
      }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(leadRows), "Leads");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invRows), "Inventory");
      const fileName = `relio-backup-${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      alert(`Backup file "${fileName}" downloaded. Upload it to Google Drive for safekeeping.`);
    } catch (e) {
      alert("Backup failed: " + e.message);
    }
    setDriveBusy(false);
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <button className={styles.backBtn} onClick={() => router.push("/today")}>
              <ArrowLeft size={22} color="var(--r-primary)" />
            </button>
            <h1 className="text-headline-md" style={{ color: "var(--r-primary)" }}>Settings</h1>
          </div>
          <button className={styles.notifBtn}>
            <Bell size={20} color="var(--r-on-surface-variant)" />
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {/* Account */}
        <section className={`r-card ${styles.sectionCard}`}>
          <div className={styles.sectionHeader}>
            <User size={20} color="var(--r-primary)" />
            <h2 className="text-headline-md">Account</h2>
          </div>
          <div className={styles.infoRow}>
            <span className="text-body-md" style={{ color: "var(--r-on-surface-variant)" }}>Email</span>
            <span className="text-body-md" style={{ fontWeight: 600 }}>{user?.email}</span>
          </div>
          <div className={styles.infoRow}>
            <span className="text-body-md" style={{ color: "var(--r-on-surface-variant)" }}>Name</span>
            <span className="text-body-md" style={{ fontWeight: 600 }}>{user?.displayName || "—"}</span>
          </div>

          <div style={{ marginTop: 16 }}>
            <h3 className="text-label-md" style={{ color: "var(--r-outline)", marginBottom: 12 }}>CHANGE PASSWORD</h3>
            <div className={styles.formGroup}>
              <input className="r-input" type="password" placeholder="Current password" value={curPass} onChange={e => setCurPass(e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <input className="r-input" type="password" placeholder="New password" value={newPass} onChange={e => setNewPass(e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <input className="r-input" type="password" placeholder="Confirm new password" value={confPass} onChange={e => setConfPass(e.target.value)} />
            </div>
            {pwMsg.text && (
              <p className={pwMsg.type === "error" ? styles.error : styles.success}>{pwMsg.text}</p>
            )}
            <button className="r-btn r-btn-primary" onClick={handleChangePassword} disabled={pwBusy} style={{ width: "100%", marginTop: 4 }}>
              {pwBusy ? "Updating…" : "Update Password"}
            </button>
          </div>
        </section>

        {/* Appearance */}
        <section className={`r-card ${styles.sectionCard}`}>
          <div className={styles.sectionHeader}>
            <Palette size={20} color="var(--r-primary)" />
            <h2 className="text-headline-md">App Theme</h2>
          </div>
          <div className={styles.themeGrid}>
            {THEMES.map(t => (
              <button key={t.id} className={`${styles.themeBtn} ${theme === t.id ? styles.themeBtnActive : ""}`} onClick={() => applyTheme(t.id)}>
                <span className={styles.themeCircle} style={{ background: t.gold }} />
                <span className="text-label-md">{t.label}</span>
                {theme === t.id && <Check size={14} />}
              </button>
            ))}
          </div>
        </section>

        {/* WhatsApp Templates */}
        <section className={`r-card ${styles.sectionCard}`}>
          <div className={styles.sectionHeader}>
            <MessageSquare size={20} color="var(--r-primary)" />
            <h2 className="text-headline-md">WhatsApp Templates</h2>
          </div>
          <p className="text-body-md" style={{ color: "var(--r-on-surface-variant)", marginBottom: 12 }}>Manage your quick message templates</p>
          <div className={styles.templateList}>
            {templates.map(t => (
              <div key={t.id} className={styles.templateItem}>
                <div>
                  <p className="text-body-md" style={{ fontWeight: 600 }}>{t.name}</p>
                  <p className="text-body-md" style={{ color: "var(--r-on-surface-variant)", marginTop: 2 }}>{t.message}</p>
                </div>
                <div className={styles.templateActions}>
                  <button className={styles.templateAction} onClick={() => { setEditingTemplate(t); setTemplateForm({ name: t.name, message: t.message }); setShowTemplateSheet(true); }}>
                    <Edit3 size={14} />
                  </button>
                  <button className={styles.templateAction} onClick={() => handleDeleteTemplate(t.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button className="r-btn r-btn-ghost" onClick={() => { setEditingTemplate(null); setTemplateForm({ name: "", message: "" }); setShowTemplateSheet(true); }} style={{ width: "100%", marginTop: 12 }}>
            <Plus size={16} /> Add Template
          </button>
        </section>

        {/* Data Export */}
        <section className={`r-card ${styles.sectionCard}`}>
          <div className={styles.sectionHeader}>
            <Download size={20} color="var(--r-primary)" />
            <h2 className="text-headline-md">Data Export</h2>
          </div>
          <p className="text-body-md" style={{ color: "var(--r-on-surface-variant)", marginBottom: 12 }}>Download your data as Excel files</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button className="r-btn r-btn-primary" onClick={handleExportLeads} disabled={exportBusy}>
              <Download size={16} /> Export Leads ({leads.length})
            </button>
            <button className="r-btn r-btn-ghost" onClick={handleExportInventory} disabled={exportBusy}>
              <Download size={16} /> Export Inventory ({inventory.length})
            </button>
          </div>
        </section>

        {/* Push Notifications */}
        <section className={`r-card ${styles.sectionCard}`}>
          <div className={styles.sectionHeader}>
            <Smartphone size={20} color="var(--r-primary)" />
            <h2 className="text-headline-md">Push Notifications</h2>
          </div>
          <p className="text-body-md" style={{ color: "var(--r-on-surface-variant)", marginBottom: 12 }}>Daily briefings, follow-up reminders, and deal alerts via Firebase Cloud Messaging</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              className={`r-btn ${notifStatus === "granted" ? "r-btn-ghost" : "r-btn-primary"}`}
              onClick={requestPush}
              disabled={notifLoading || notifStatus === "granted"}
            >
              {notifStatus === "granted" ? "Notifications Enabled ✓" : notifLoading ? "Requesting…" : "Enable Push Notifications"}
            </button>
            {notifStatus === "granted" && (
              <button className="r-btn r-btn-sm r-btn-ghost" onClick={sendTestNotification} style={{ justifyContent: "center" }}>
                <Bell size={14} /> Send Test Notification
              </button>
            )}
            {notifStatus === "denied" && (
              <p className="text-body-md" style={{ color: "var(--r-error)", fontSize: 12 }}>Permission denied. Enable notifications in browser settings, then refresh.</p>
            )}
          </div>
        </section>

        {/* SMS Templates */}
        <section className={`r-card ${styles.sectionCard}`}>
          <div className={styles.sectionHeader}>
            <Send size={20} color="var(--r-primary)" />
            <h2 className="text-headline-md">SMS Templates</h2>
          </div>
          <p className="text-body-md" style={{ color: "var(--r-on-surface-variant)", marginBottom: 12 }}>Quick SMS for clients without WhatsApp</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {smsTemplates.map(t => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "var(--r-surface-container-low)", borderRadius: "var(--r-radius)" }}>
                <span className="text-body-md" style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                <button className={styles.iconBtn} onClick={() => { setEditingSms(t); setSmsForm({ name: t.name, message: t.message }); setShowSmsSheet(true); }}><Edit3 size={14} /></button>
                <button className={styles.iconBtn} onClick={() => handleDeleteSmsTemplate(t.id)}><Trash2 size={14} color="var(--r-error)" /></button>
              </div>
            ))}
            <button className="r-btn r-btn-sm r-btn-ghost" onClick={() => { setEditingSms(null); setSmsForm({ name: "", message: "" }); setShowSmsSheet(true); }} style={{ justifyContent: "center" }}>
              <Plus size={14} /> Add SMS Template
            </button>
          </div>
        </section>

        {/* Google Drive Backup */}
        <section className={`r-card ${styles.sectionCard}`}>
          <div className={styles.sectionHeader}>
            <Cloud size={20} color="var(--r-primary)" />
            <h2 className="text-headline-md">Backup to Drive</h2>
          </div>
          <p className="text-body-md" style={{ color: "var(--r-on-surface-variant)", marginBottom: 12 }}>Download a combined backup of all your data</p>
          <button className="r-btn r-btn-primary" onClick={handleDriveBackup} disabled={driveBusy}>
            <Cloud size={16} /> {driveBusy ? "Creating backup…" : "Download Backup"}
          </button>
        </section>

        {/* Performance */}
        <section className={`r-card ${styles.sectionCard}`}>
          <div className={styles.sectionHeader}>
            <Gauge size={20} color="var(--r-primary)" />
            <h2 className="text-headline-md">Performance</h2>
          </div>
          <p className="text-body-md" style={{ color: "var(--r-on-surface-variant)", marginBottom: 12 }}>Tips to keep Relio fast</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", background: "var(--r-surface-container-low)", borderRadius: "var(--r-radius)" }}>
              <Smartphone size={16} color="var(--r-secondary)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <p className="text-body-md" style={{ fontWeight: 600 }}>Add to Home Screen</p>
                <p className="text-label-md" style={{ color: "var(--r-outline)" }}>Install as PWA for fastest loading and offline access</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", background: "var(--r-surface-container-low)", borderRadius: "var(--r-radius)" }}>
              <Cloud size={16} color="var(--r-secondary)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <p className="text-body-md" style={{ fontWeight: 600 }}>Regular Backups</p>
                <p className="text-label-md" style={{ color: "var(--r-outline)" }}>Download monthly backups to keep data safe and app lean</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", background: "var(--r-surface-container-low)", borderRadius: "var(--r-radius)" }}>
              <Bell size={16} color="var(--r-secondary)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <p className="text-body-md" style={{ fontWeight: 600 }}>Enable Push Notifications</p>
                <p className="text-label-md" style={{ color: "var(--r-outline)" }}>Get reminders without opening the app — saves battery</p>
              </div>
            </div>
          </div>
        </section>

        {/* Commission Tracker */}
        <section className={`r-card ${styles.sectionCard}`}>
          <div className={styles.sectionHeader}>
            <Wallet size={20} color="var(--r-primary)" />
            <h2 className="text-headline-md">Commission Tracker</h2>
          </div>
          <p className="text-body-md" style={{ color: "var(--r-on-surface-variant)", marginBottom: 12 }}>Track deals and commissions</p>
          <button className="r-btn r-btn-secondary" onClick={() => router.push("/deals")} style={{ width: "100%" }}>
            Open Commission Tracker <ChevronRight size={16} />
          </button>
        </section>

        {/* Lead Card Fields */}
        <section className={`r-card ${styles.sectionCard}`}>
          <div className={styles.sectionHeader}>
            <Eye size={20} color="var(--r-primary)" />
            <h2 className="text-headline-md">Lead Card Fields</h2>
          </div>
          {LEAD_CARD_FIELDS.map(f => (
            <label key={f.key} className={styles.toggleRow}>
              <span className="text-body-md">{f.label}</span>
              <div className={`${styles.toggle} ${cardFields.includes(f.key) ? styles.toggleOn : ""}`} onClick={() => toggleCardField(f.key)}>
                <div className={styles.toggleThumb} />
              </div>
            </label>
          ))}
        </section>

        {/* Lead Form Fields */}
        <section className={`r-card ${styles.sectionCard}`}>
          <div className={styles.sectionHeader}>
            <Eye size={20} color="var(--r-primary)" />
            <h2 className="text-headline-md">Lead Form Fields</h2>
          </div>
          {LEAD_FIELDS.map(f => (
            <label key={f.key} className={styles.toggleRow}>
              <span className="text-body-md">{f.label}</span>
              <div className={`${styles.toggle} ${leadFields.includes(f.key) ? styles.toggleOn : ""}`} onClick={() => toggleLeadField(f.key)}>
                <div className={styles.toggleThumb} />
              </div>
            </label>
          ))}
        </section>

        {/* Sign Out */}
        <button className={`r-btn ${styles.logoutBtn}`} onClick={handleLogout}>
          <LogOut size={18} /> Sign Out
        </button>
      </main>

      {/* WhatsApp Template Sheet */}
      <BottomSheet open={showTemplateSheet} onClose={() => setShowTemplateSheet(false)} title={editingTemplate ? "Edit WhatsApp Template" : "Add WhatsApp Template"}>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <input className="r-input" placeholder="Template name" value={templateForm.name} onChange={e => setTemplateForm(f => ({ ...f, name: e.target.value }))} />
          <textarea className="r-input" rows={4} placeholder="Message... Use {name}, {project}, {date}, {time} as placeholders" value={templateForm.message} onChange={e => setTemplateForm(f => ({ ...f, message: e.target.value }))} />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="r-btn r-btn-ghost" onClick={() => setShowTemplateSheet(false)} style={{ flex: 1 }}>Cancel</button>
            <button className="r-btn r-btn-primary" onClick={handleSaveTemplate} disabled={!templateForm.name.trim() || !templateForm.message.trim()} style={{ flex: 1 }}>
              <Save size={16} /> Save
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* SMS Template Sheet */}
      <BottomSheet open={showSmsSheet} onClose={() => setShowSmsSheet(false)} title={editingSms ? "Edit SMS Template" : "Add SMS Template"}>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <input className="r-input" placeholder="Template name" value={smsForm.name} onChange={e => setSmsForm(f => ({ ...f, name: e.target.value }))} />
          <textarea className="r-input" rows={4} placeholder="SMS text... Use {name}, {project}, {date} as placeholders. Keep it short!" value={smsForm.message} onChange={e => setSmsForm(f => ({ ...f, message: e.target.value }))} />
          <p className="text-label-md" style={{ color: "var(--r-outline)", textAlign: "right" }}>{smsForm.message.length}/160 chars</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="r-btn r-btn-ghost" onClick={() => setShowSmsSheet(false)} style={{ flex: 1 }}>Cancel</button>
            <button className="r-btn r-btn-primary" onClick={handleSaveSmsTemplate} disabled={!smsForm.name.trim() || !smsForm.message.trim()} style={{ flex: 1 }}>
              <Save size={16} /> Save
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

function Check({ size }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
}
