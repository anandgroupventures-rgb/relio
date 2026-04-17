"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { Mail, User, Lock, Palette, LayoutGrid, FormInput, LogOut, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useToast } from "@/components/shared/Toast";
import { logOut } from "@/lib/firebase/auth";
import { auth } from "@/lib/firebase/config";
import styles from "./settings.module.css";

const THEMES = [
  { id: "default", label: "Gold",      gold: "#C49A2A", bg: "#F7F3ED" },
  { id: "blue",    label: "Navy Blue", gold: "#1E5FA8", bg: "#EDF2FA" },
  { id: "green",   label: "Forest",    gold: "#1A7842", bg: "#EDF5F0" },
  { id: "rose",    label: "Rose",      gold: "#C42A6A", bg: "#FAEDF3" },
  { id: "slate",   label: "Slate",     gold: "#4A5568", bg: "#F0F2F5" },
  { id: "dark",    label: "Dark",      gold: "#C49A2A", bg: "#1A1612"  },
];

const LEAD_FIELDS = [
  { key: "type",             label: "Type (Buy/Rent)"      },
  { key: "bhk",              label: "Configuration (BHK)"  },
  { key: "projectInterest",  label: "Project / Area"       },
  { key: "budget",           label: "Budget"               },
  { key: "source",           label: "Lead Source"          },
  { key: "followUpDate",     label: "Follow-up Date"       },
  { key: "email",            label: "Email"                },
  { key: "referredBy",       label: "Referred By"          },
  { key: "remarks",          label: "Remarks"              },
];

const LEAD_CARD_FIELDS = [
  { key: "temperature",      label: "Temperature badge"    },
  { key: "mobile",           label: "Mobile number"        },
  { key: "projectInterest",  label: "Project / Area"       },
  { key: "budget",           label: "Budget"               },
  { key: "status",           label: "Status"               },
  { key: "followUpDate",     label: "Follow-up date"       },
  { key: "source",           label: "Lead source"          },
];

function loadPref(key, def) {
  if (typeof window === "undefined") return def;
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; }
}
function savePref(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

export default function SettingsPage() {
  const { user }  = useAuth();
  const router    = useRouter();
  const toast = useToast();

  // Password change
  const [curPass,  setCurPass]  = useState("");
  const [newPass,  setNewPass]  = useState("");
  const [confPass, setConfPass] = useState("");
  const [pwBusy,   setPwBusy]   = useState(false);
  const [pwMsg,    setPwMsg]    = useState({ type:"", text:"" });

  // Theme
  const [theme, setThemeState] = useState(() => loadPref("relio_theme", "default"));

  // Lead card fields
  const [cardFields, setCardFields] = useState(() =>
    loadPref("relio_card_fields", ["temperature","mobile","projectInterest","followUpDate","status"])
  );

  // Lead form fields visibility
  const [leadFields, setLeadFields] = useState(() =>
    loadPref("relio_lead_fields", LEAD_FIELDS.map(f => f.key))
  );

  function applyTheme(id) {
    const t = THEMES.find(x => x.id === id) || THEMES[0];
    document.documentElement.style.setProperty("--relio-gold",    t.gold);
    document.documentElement.style.setProperty("--relio-gold-light",  t.id === "dark" ? "#2A2520" : t.bg);
    document.documentElement.style.setProperty("--relio-bg",      t.bg);
    if (t.id === "dark") {
      document.documentElement.style.setProperty("--relio-bg-card",   "#2A2520");
      document.documentElement.style.setProperty("--relio-text",      "#F5F0EA");
      document.documentElement.style.setProperty("--relio-text-mid",  "#C0A888");
      document.documentElement.style.setProperty("--relio-border",    "#3A3228");
    } else {
      document.documentElement.style.setProperty("--relio-bg-card",   "#FFFFFF");
      document.documentElement.style.setProperty("--relio-text",      "#1A1612");
      document.documentElement.style.setProperty("--relio-text-mid",  "#6B5F53");
      document.documentElement.style.setProperty("--relio-border",    "#E8DDD0");
    }
    setThemeState(id);
    savePref("relio_theme", id);
  }

  function toggleCardField(key) {
    setCardFields(prev => {
      const next = prev.includes(key) ? prev.filter(k=>k!==key) : [...prev, key];
      savePref("relio_card_fields", next);
      return next;
    });
  }

  function toggleLeadField(key) {
    setLeadFields(prev => {
      const next = prev.includes(key) ? prev.filter(k=>k!==key) : [...prev, key];
      savePref("relio_lead_fields", next);
      return next;
    });
  }

  async function handleChangePassword() {
    setPwMsg({ type:"", text:"" });
    if (!curPass)               { 
      toast.error("Enter your current password.");
      setPwMsg({ type:"error", text:"Enter your current password." }); 
      return; 
    }
    if (newPass.length < 6)     { 
      toast.error("New password must be at least 6 characters.");
      setPwMsg({ type:"error", text:"New password must be at least 6 characters." }); 
      return; 
    }
    if (newPass !== confPass)   { 
      toast.error("New passwords do not match.");
      setPwMsg({ type:"error", text:"New passwords do not match." }); 
      return; 
    }
    setPwBusy(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, curPass);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updatePassword(auth.currentUser, newPass);
      toast.success("Password changed successfully");
      setPwMsg({ type:"success", text:"Password changed successfully." });
      setCurPass(""); setNewPass(""); setConfPass("");
    } catch (err) {
      const map = {
        "auth/wrong-password":   "Current password is incorrect.",
        "auth/weak-password":    "New password is too weak.",
        "auth/too-many-requests":"Too many attempts. Try again later.",
      };
      const errorMsg = map[err.code] || "Failed. Try again.";
      toast.error(errorMsg);
      setPwMsg({ type:"error", text: errorMsg });
    } finally {
      setPwBusy(false);
    }
  }

  async function handleLogout() {
    await logOut();
    toast.success("Signed out successfully");
    router.replace("/login");
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
      </header>

      <div className={styles.content}>

        {/* Account info */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <User size={18} /> Account
          </h2>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>
              <Mail size={14} /> Email
            </span>
            <span className={styles.infoValue}>{user?.email}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>
              <User size={14} /> Name
            </span>
            <span className={styles.infoValue}>{user?.displayName || "—"}</span>
          </div>
        </div>

        {/* Change password */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Lock size={18} /> Change Password
          </h2>
          <div className={styles.formGroup}>
            <label className={styles.fieldLabel}>Current Password</label>
            <input className="relio-input" type="password" placeholder="••••••••"
              value={curPass} onChange={e => setCurPass(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.fieldLabel}>New Password</label>
            <input className="relio-input" type="password" placeholder="Min. 6 characters"
              value={newPass} onChange={e => setNewPass(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.fieldLabel}>Confirm New Password</label>
            <input className="relio-input" type="password" placeholder="Repeat new password"
              value={confPass} onChange={e => setConfPass(e.target.value)} />
          </div>
          {pwMsg.text && (
            <p className={pwMsg.type === "error" ? styles.error : styles.success}>{pwMsg.text}</p>
          )}
          <button className="relio-btn relio-btn-primary" onClick={handleChangePassword}
            disabled={pwBusy} style={{ width:"100%", marginTop:4 }}>
            {pwBusy ? <><Loader2 size={18} className="spinner" /> Updating…</> : "Update Password"}
          </button>
        </div>

        {/* Appearance / theme */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Palette size={18} /> App Theme
          </h2>
          <p className={styles.hint}>Changes apply immediately to this session.</p>
          <div className={styles.themeGrid}>
            {THEMES.map(t => (
              <button key={t.id}
                className={`${styles.themeBtn} ${theme === t.id ? styles.themeBtnActive : ""}`}
                onClick={() => applyTheme(t.id)}
                style={{ "--t-gold": t.gold, "--t-bg": t.bg }}>
                <span className={styles.themeCircle}
                  style={{ background: t.gold }} />
                <span className={styles.themeLabel}>{t.label}</span>
                {theme === t.id && <span className={styles.themeCheck}><Check size={14} /></span>}
              </button>
            ))}
          </div>
        </div>

        {/* Lead card fields */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <LayoutGrid size={18} /> Lead Card — Visible Fields
          </h2>
          <p className={styles.hint}>Choose what information shows on each lead card.</p>
          {LEAD_CARD_FIELDS.map(f => (
            <label key={f.key} className={styles.toggleRow}>
              <span className={styles.toggleLabel}>{f.label}</span>
              <div className={`${styles.toggle} ${cardFields.includes(f.key) ? styles.toggleOn : ""}`}
                onClick={() => toggleCardField(f.key)}>
                <div className={styles.toggleThumb} />
              </div>
            </label>
          ))}
        </div>

        {/* Lead form fields */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <FormInput size={18} /> Lead Form — Visible Fields
          </h2>
          <p className={styles.hint}>Hide fields you never use to keep the form minimal.</p>
          {LEAD_FIELDS.map(f => (
            <label key={f.key} className={styles.toggleRow}>
              <span className={styles.toggleLabel}>{f.label}</span>
              <div className={`${styles.toggle} ${leadFields.includes(f.key) ? styles.toggleOn : ""}`}
                onClick={() => toggleLeadField(f.key)}>
                <div className={styles.toggleThumb} />
              </div>
            </label>
          ))}
        </div>

        {/* Sign out */}
        <button className="relio-btn relio-btn-ghost" onClick={handleLogout}
          style={{ width:"100%", color:"var(--relio-danger)", borderColor:"var(--relio-danger)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          <LogOut size={18} /> Sign Out
        </button>

      </div>
    </div>
  );
}
