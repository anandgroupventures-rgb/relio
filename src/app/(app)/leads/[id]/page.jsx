"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { useInventory } from "@/lib/hooks/useInventory";
import { getLead, getInteractions, addInteraction, updateLead, deleteInteraction, updateInteraction, uploadVoiceNote, uploadDocument } from "@/lib/firebase/leads";
import { getTempStyle, getStatusLabel, getStatusColor } from "@/lib/utils/leadHelpers";
import { formatTimelineDate, formatFollowUp, isOverdue } from "@/lib/utils/dateHelpers";
import { predictBestCallTime } from "@/lib/utils/smartSuggestions";
import BottomSheet from "@/components/shared/BottomSheet";
import LeadForm from "@/components/leads/LeadForm";
import {
  ArrowLeft, Bell, Phone, MessageCircle, Mail, Calendar, Check, Edit,
  MapPin, Building, Wallet, Clock, Mic, StopCircle, Play, Trash2,
  Home as HomeIcon, ChevronRight, FileText, Upload, Paperclip, Zap, Send,
  X
} from "lucide-react";
import styles from "./detail.module.css";

const PIPELINE = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "interested", label: "Interested" },
  { value: "details_shared", label: "Details Shared" },
  { value: "visit_scheduled", label: "Visit Scheduled" },
  { value: "visit_done", label: "Visited" },
  { value: "negotiating", label: "Negotiation" },
  { value: "converted", label: "Won" },
];

function loadTemplates() {
  if (typeof window === "undefined") return [];
  try { const v = localStorage.getItem("relio_wa_templates"); return v ? JSON.parse(v) : []; } catch { return []; }
}

export default function LeadDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const { user } = useAuth();
  const { inventory } = useInventory();

  const [lead, setLead] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("activity");
  const [showEdit, setShowEdit] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [showStatusSheet, setShowStatusSheet] = useState(false);

  // Edit / Delete interaction
  const [editingInt, setEditingInt] = useState(null);
  const [editIntText, setEditIntText] = useState("");

  // Log Visit
  const [showLogVisit, setShowLogVisit] = useState(false);
  const [logVisitProject, setLogVisitProject] = useState("");

  // Schedule Visit
  const [showScheduleVisit, setShowScheduleVisit] = useState(false);
  const [visitDate, setVisitDate] = useState("");
  const [visitTime, setVisitTime] = useState("");
  const [visitLocation, setVisitLocation] = useState("");

  // WhatsApp templates
  const [templates, setTemplates] = useState(loadTemplates);
  const [showWASheet, setShowWASheet] = useState(false);

  // SMS templates
  const [smsTemplates, setSmsTemplates] = useState(() => {
    if (typeof window === "undefined") return [];
    try { const v = localStorage.getItem("relio_sms_templates"); return v ? JSON.parse(v) : []; } catch { return []; }
  });
  const [showSmsSheet, setShowSmsSheet] = useState(false);

  // Voice notes
  const [recording, setRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [voiceNotes, setVoiceNotes] = useState([]);
  const mediaRecorder = useRef(null);
  const recordInterval = useRef(null);
  const chunks = useRef([]);

  // Documents
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!user || !id) return;
    async function load() {
      const l = await getLead(user.uid, id);
      setLead(l);
      const ints = await getInteractions(user.uid, id);
      setInteractions(ints);
      setLoading(false);
    }
    load();
    setTemplates(loadTemplates());
  }, [user, id]);

  async function handleStatusChange(status) {
    if (!user || !lead) return;
    const currentLabel = getStatusLabel(lead.status);
    const newLabel = getStatusLabel(status);
    if (status === lead.status) return;
    if (!window.confirm(`Move lead from "${currentLabel}" to "${newLabel}"?`)) return;
    await updateLead(user.uid, lead.id, { status });
    await addInteraction(user.uid, lead.id, {
      type: "status_change", note: `Status changed to ${newLabel}`, from: lead.status, to: status,
    });
    setLead(prev => ({ ...prev, status }));
    setInteractions(prev => [{ id: Date.now().toString(), type: "status_change", note: `Status changed to ${newLabel}`, createdAt: { toDate: () => new Date() } }, ...prev]);
  }

  async function handleAddNote() {
    if (!noteText.trim() || !user || !lead) return;
    await addInteraction(user.uid, lead.id, { type: "note", note: noteText.trim() });
    setNoteText(""); setNoteOpen(false);
    const ints = await getInteractions(user.uid, lead.id);
    setInteractions(ints);
  }

  async function handleScheduleFollowUp() {
    if (!followUpDate || !user || !lead) return;
    await updateLead(user.uid, lead.id, { followUpDate });
    await addInteraction(user.uid, lead.id, { type: "follow_up", note: `Follow-up scheduled for ${followUpDate}` });
    setLead(prev => ({ ...prev, followUpDate }));
    setInteractions(prev => [{ id: Date.now().toString(), type: "follow_up", note: `Follow-up scheduled for ${followUpDate}`, createdAt: { toDate: () => new Date() } }, ...prev]);
    setShowFollowUp(false);
    setFollowUpDate("");
  }

  async function handleLogVisit() {
    if (!user || !lead) return;
    const project = logVisitProject.trim() || lead.projectInterest || "Site visit";
    await updateLead(user.uid, lead.id, { status: "visit_done", lastVisitDate: new Date().toISOString().split("T")[0] });
    await addInteraction(user.uid, lead.id, { type: "visit", note: `Visit completed — ${project}`, visitProject: project });
    setLead(prev => ({ ...prev, status: "visit_done", lastVisitDate: new Date().toISOString().split("T")[0] }));
    setInteractions(prev => [{ id: Date.now().toString(), type: "visit", note: `Visit completed — ${project}`, visitProject: project, createdAt: { toDate: () => new Date() } }, ...prev]);
    setShowLogVisit(false);
    setLogVisitProject("");
  }

  async function handleDeleteInteraction(intId) {
    if (!user || !lead || !intId) return;
    if (!window.confirm("Delete this activity? This cannot be undone.")) return;
    await deleteInteraction(user.uid, lead.id, intId);
    setInteractions(prev => prev.filter(i => i.id !== intId));
  }

  async function handleSaveEditInteraction() {
    if (!user || !lead || !editingInt) return;
    if (!editIntText.trim()) return;
    await updateInteraction(user.uid, lead.id, editingInt.id, { note: editIntText.trim() });
    setInteractions(prev => prev.map(i => i.id === editingInt.id ? { ...i, note: editIntText.trim() } : i));
    setEditingInt(null);
    setEditIntText("");
  }

  function handleCall() {
    if (!lead) return;
    window.open(`tel:${lead.mobile}`, "_self");
    addInteraction(user.uid, lead.id, { type: "call", note: "Call attempted" });
  }

  async function handleWA(template = null) {
    if (!lead) return;
    let msg = `Hi ${lead.name}, following up on ${lead.projectInterest || "your property inquiry"}.`;
    let templateName = null;
    if (template) {
      msg = template.message
        .replace(/{name}/g, lead.name || "")
        .replace(/{project}/g, lead.projectInterest || "")
        .replace(/{date}/g, new Date().toLocaleDateString("en-IN"))
        .replace(/{time}/g, new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
      templateName = template.name;
    }
    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/91${lead.mobile?.replace(/\D/g, "")}?text=${encoded}`, "_blank");
    // Log to timeline
    if (user) {
      await addInteraction(user.uid, lead.id, {
        type: "whatsapp",
        note: templateName ? `Sent "${templateName}" template` : "Sent WhatsApp message",
        templateName,
      });
      setInteractions(prev => [{
        id: Date.now().toString(),
        type: "whatsapp",
        note: templateName ? `Sent "${templateName}" template` : "Sent WhatsApp message",
        templateName,
        createdAt: { toDate: () => new Date() }
      }, ...prev]);
    }
    setShowWASheet(false);
  }

  async function handleSMS(template = null) {
    if (!lead) return;
    let msg = `Hi ${lead.name}, following up on your property inquiry.`;
    if (template) {
      msg = template.message
        .replace(/{name}/g, lead.name || "")
        .replace(/{project}/g, lead.projectInterest || "")
        .replace(/{date}/g, new Date().toLocaleDateString("en-IN"));
    }
    const encoded = encodeURIComponent(msg);
    window.open(`sms:+91${lead.mobile?.replace(/\D/g, "")}?body=${encoded}`, "_blank");
    if (user) {
      await addInteraction(user.uid, lead.id, {
        type: "sms",
        note: template ? `Sent "${template.name}" SMS template` : "Sent SMS",
        templateName: template?.name,
      });
      setInteractions(prev => [{
        id: Date.now().toString(),
        type: "sms",
        note: template ? `Sent "${template.name}" SMS template` : "Sent SMS",
        templateName: template?.name,
        createdAt: { toDate: () => new Date() }
      }, ...prev]);
    }
    setShowSmsSheet(false);
  }

  async function handleScheduleVisit() {
    if (!visitDate || !user || !lead) return;
    const visitData = {
      visitDate,
      visitTime: visitTime || "",
      visitLocation: visitLocation || "",
      status: "visit_scheduled",
    };
    await updateLead(user.uid, lead.id, visitData);
    await addInteraction(user.uid, lead.id, {
      type: "visit_scheduled",
      note: `Site visit scheduled${visitTime ? ` at ${visitTime}` : ""}${visitLocation ? ` — ${visitLocation}` : ""}`,
    });
    setLead(prev => ({ ...prev, ...visitData }));
    setInteractions(prev => [{
      id: Date.now().toString(),
      type: "visit_scheduled",
      note: `Site visit scheduled${visitTime ? ` at ${visitTime}` : ""}${visitLocation ? ` — ${visitLocation}` : ""}`,
      createdAt: { toDate: () => new Date() }
    }, ...prev]);
    setShowScheduleVisit(false);
    setVisitDate("");
    setVisitTime("");
    setVisitLocation("");
  }

  // Voice recording
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setVoiceNotes(prev => [...prev, { id: Date.now().toString(), url, duration: recordTime, date: new Date() }]);
        setRecordTime(0);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRecorder.current = mr;
      setRecording(true);
      recordInterval.current = setInterval(() => setRecordTime(t => t + 1), 1000);
    } catch (e) {
      alert("Microphone access denied or not available.");
    }
  }

  async function handleUploadDocument(files) {
    if (!files || files.length === 0 || !user || !lead) return;
    setUploadingDoc(true);
    for (const file of files) {
      try {
        const result = await uploadDocument(user.uid, lead.id, file);
        await addInteraction(user.uid, lead.id, {
          type: "document",
          note: `Uploaded ${file.name}`,
          docUrl: result.url,
          docName: result.name,
          docType: result.type,
          docSize: result.size,
        });
      } catch (e) {
        console.error("Document upload failed:", e);
        alert(`Failed to upload ${file.name}. Check Firebase config.`);
      }
    }
    const ints = await getInteractions(user.uid, lead.id);
    setInteractions(ints);
    setUploadingDoc(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function stopRecording() {
    const duration = recordTime; // capture before state resets
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
    }
    setRecording(false);
    clearInterval(recordInterval.current);
    // Wait for onstop to fire and create blob
    await new Promise(r => setTimeout(r, 300));
    if (!user || !lead || chunks.current.length === 0) return;
    const blob = new Blob(chunks.current, { type: "audio/webm" });
    try {
      const { url } = await uploadVoiceNote(user.uid, lead.id, blob);
      await addInteraction(user.uid, lead.id, {
        type: "voice_note",
        note: `Voice note (${duration}s)`,
        voiceUrl: url,
        duration,
      });
      const ints = await getInteractions(user.uid, lead.id);
      setInteractions(ints);
    } catch (e) {
      console.error("Voice note upload failed:", e);
      alert("Voice note saved locally but failed to upload. Check Firebase config.");
    }
  }

  // Property matching
  const matchedProperties = useMemo(() => {
    if (!lead || !inventory) return [];
    return inventory.filter(item => {
      const bhkMatch = !lead.bhk || !item.bhk || item.bhk === lead.bhk;
      const areaMatch = !lead.projectInterest || !item.area || item.area.toLowerCase().includes(lead.projectInterest.toLowerCase()) || lead.projectInterest.toLowerCase().includes(item.area.toLowerCase());
      return bhkMatch || areaMatch;
    }).slice(0, 3);
  }, [lead, inventory]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="spinner spinner-large" />
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className={styles.page}>
        <div style={{ padding: 40, textAlign: "center" }}>
          <p>Lead not found.</p>
          <button className="r-btn r-btn-primary" onClick={() => router.push("/leads")} style={{ marginTop: 16 }}>Back to Leads</button>
        </div>
      </div>
    );
  }

  const temp = getTempStyle(lead.temperature || "warm");
  const fu = formatFollowUp(lead.followUpDate);
  const overdue = isOverdue(lead.followUpDate);
  const initials = lead.name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  const pipelineIndex = PIPELINE.findIndex(p => p.value === lead.status);
  const bestCall = predictBestCallTime(interactions);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <button className={styles.backBtn} onClick={() => router.push("/leads")}>
              <ArrowLeft size={22} color="var(--r-primary)" />
            </button>
            <h1 className="text-headline-md" style={{ color: "var(--r-primary)" }}>Relio</h1>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.headerIcon}>
              <Bell size={20} color="var(--r-on-surface-variant)" />
            </button>
            <div className={styles.headerAvatar}>{(user?.displayName?.[0] || "U").toUpperCase()}</div>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {/* Profile */}
        <section className={`r-card ${styles.profileCard}`}>
          <div className={styles.profileTop}>
            <div className={styles.profileAvatar} style={{ background: temp.bg, color: temp.text }}>{initials}</div>
            <div className={styles.profileInfo}>
              <h2 className="text-headline-md" style={{ color: "var(--r-primary)" }}>{lead.name}</h2>
              <p className="text-body-md" style={{ color: "var(--r-on-surface-variant)", display: "flex", alignItems: "center", gap: 4 }}>
                <Phone size={14} /> +91 {lead.mobile}
              </p>
              {bestCall && (
                <p className="text-label-md" style={{ color: "var(--r-secondary)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                  <Zap size={12} /> Best time to call: {bestCall.display}
                </p>
              )}
            </div>
          </div>
          <div className={styles.profileBadges}>
            <span className="r-badge" style={{ background: getStatusColor(lead.status) + "15", color: getStatusColor(lead.status) }}>{getStatusLabel(lead.status)}</span>
            <span className={`r-badge r-badge-${lead.temperature || "warm"}`}>{lead.temperature || "warm"}</span>
            {lead.source && <span className="r-badge" style={{ background: "var(--r-primary-fixed)", color: "var(--r-on-primary-fixed)" }}>{lead.source}</span>}
          </div>
          <div className={styles.actionBar}>
            <button className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} onClick={handleCall}><Phone size={16} /> Call</button>
            <button className={styles.waBtn} onClick={() => templates.length > 0 ? setShowWASheet(true) : handleWA()}><MessageCircle size={16} /> WhatsApp</button>
            <button className={styles.smsBtn} onClick={() => smsTemplates.length > 0 ? setShowSmsSheet(true) : handleSMS()}><Send size={16} /> SMS</button>
            <button className={styles.actionBtnSecondary} onClick={() => setShowFollowUp(true)}><Calendar size={16} /> Follow-up</button>
            <button className={styles.actionBtnSecondary} onClick={() => setShowScheduleVisit(true)}><MapPin size={16} /> Visit</button>
            <button className={styles.actionBtnSecondary} onClick={() => setNoteOpen(true)}><Edit size={16} /> Note</button>
          </div>
        </section>

        {/* Pipeline — Current Stage Only */}
        <section className={`r-card ${styles.pipelineCard}`}>
          <h3 className="text-headline-md" style={{ marginBottom: 12 }}>Pipeline Status</h3>
          <div className={styles.currentStageCard} onClick={() => setShowStatusSheet(true)}>
            <div className={styles.currentStageLeft}>
              <div className={styles.currentStageDot} />
              <div>
                <p className="text-body-md" style={{ fontWeight: 700, color: "var(--r-on-surface)" }}>
                  {PIPELINE.find(p => p.value === lead.status)?.label || getStatusLabel(lead.status)}
                </p>
                <p className="text-label-md" style={{ color: "var(--r-outline)", marginTop: 2 }}>Current stage</p>
              </div>
            </div>
            <ChevronRight size={20} color="var(--r-outline)" />
          </div>
        </section>

        {/* Requirement */}
        <section className={`r-card ${styles.reqCard}`}>
          <h3 className="text-headline-md" style={{ marginBottom: 16 }}>Requirement</h3>
          <div className={styles.reqList}>
            <ReqItem icon={<Building size={18} />} label="Property Type" value={lead.bhk || "—"} />
            <ReqItem icon={<MapPin size={18} />} label="Location" value={lead.projectInterest || "—"} />
            <ReqItem icon={<Wallet size={18} />} label="Budget" value={lead.budget || "—"} />
            <ReqItem icon={<Clock size={18} />} label="Timeline" value={fu ? (overdue ? `Overdue: ${fu}` : fu) : "—"} />
          </div>
          {lead.email && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--r-outline-variant)" }}>
              <p className="text-label-md" style={{ color: "var(--r-outline)", marginBottom: 8 }}>Contact</p>
              <p className="text-body-md">{lead.email}</p>
            </div>
          )}
        </section>

        {/* Tabs */}
        <section className={`r-card ${styles.tabsCard}`}>
          <div className={styles.tabsBar}>
            {["activity", "documents", "visits", "payments"].map(tab => (
              <button key={tab} className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ""}`} onClick={() => setActiveTab(tab)}>{tab[0].toUpperCase() + tab.slice(1)}</button>
            ))}
          </div>
          <div className={styles.tabContent}>
            {activeTab === "activity" && (
              <div className={styles.activityFeed}>
                <div className={styles.activityActions}>
                  <button className={styles.addNoteBtn} onClick={() => setNoteOpen(true)}><Edit size={14} /> Add Note</button>
                  <button className={styles.addNoteBtn} onClick={() => { setLogVisitProject(lead.projectInterest || ""); setShowLogVisit(true); }} style={{ background: "var(--r-secondary-container)", color: "var(--r-on-secondary-container)" }}><MapPin size={14} /> Log Visit</button>
                  <button className={`${styles.addNoteBtn} ${recording ? styles.recordingBtn : ""}`} onClick={recording ? stopRecording : startRecording}>
                    {recording ? <><StopCircle size={14} /> Stop ({recordTime}s)</> : <><Mic size={14} /> Voice Note</>}
                  </button>
                </div>

                {interactions.length === 0 && voiceNotes.length === 0 && (
                  <p className="text-body-md" style={{ color: "var(--r-outline)", textAlign: "center", padding: 24 }}>No activity yet. Start by calling or adding a note.</p>
                )}

                {voiceNotes.map(vn => (
                  <div key={vn.id} className={styles.activityItem}>
                    <div className={styles.activityDot} style={{ background: "var(--r-secondary-fixed)", color: "var(--r-secondary)" }}><Mic size={14} /></div>
                    <div className={styles.activityBody}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <p className="text-body-md" style={{ fontWeight: 600 }}>Voice Note</p>
                        <span className="text-label-md" style={{ color: "var(--r-outline)" }}>{vn.duration}s</span>
                      </div>
                      <audio controls src={vn.url} style={{ width: "100%", marginTop: 8, height: 36 }} />
                    </div>
                  </div>
                ))}

                {interactions.map((int, i) => {
                  const typeMap = {
                    call: { label: "Call", icon: <Phone size={14} />, bg: "var(--r-primary-fixed)", color: "var(--r-primary)" },
                    status_change: { label: "Status Update", icon: <Check size={14} />, bg: "var(--r-secondary-fixed)", color: "var(--r-secondary)" },
                    follow_up: { label: "Follow-up", icon: <Calendar size={14} />, bg: "var(--r-primary-fixed)", color: "var(--r-primary)" },
                    visit: { label: "Visit", icon: <MapPin size={14} />, bg: "var(--r-success-bg)", color: "var(--r-success)" },
                    visit_scheduled: { label: "Visit Scheduled", icon: <Clock size={14} />, bg: "var(--r-warning-bg)", color: "var(--r-warning)" },
                    whatsapp: { label: "WhatsApp", icon: <MessageCircle size={14} />, bg: "#dcfce7", color: "#16a34a" },
                    sms: { label: "SMS", icon: <Send size={14} />, bg: "var(--r-primary-fixed)", color: "var(--r-primary)" },
                    voice_note: { label: "Voice Note", icon: <Mic size={14} />, bg: "var(--r-secondary-fixed)", color: "var(--r-secondary)" },
                    document: { label: "Document", icon: <FileText size={14} />, bg: "var(--r-primary-fixed)", color: "var(--r-primary)" },
                    note: { label: "Note", icon: <Edit size={14} />, bg: "var(--r-surface-container-high)", color: "var(--r-on-surface-variant)" },
                  };
                  const meta = typeMap[int.type] || typeMap.note;
                  return (
                    <div key={int.id || i} className={styles.activityItem}>
                      <div className={styles.activityDot} style={{ background: meta.bg, color: meta.color }}>
                        {meta.icon}
                      </div>
                      <div className={styles.activityBody}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <p className="text-body-md" style={{ fontWeight: 600 }}>{meta.label}</p>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span className="text-label-md" style={{ color: "var(--r-outline)" }}>{formatTimelineDate(int.createdAt)}</span>
                            {(int.type === "note" || int.type === "visit") && int.id && (
                              <div style={{ display: "flex", gap: 4 }}>
                                <button
                                  className={styles.intActionBtn}
                                  onClick={() => { setEditingInt(int); setEditIntText(int.note || ""); }}
                                  title="Edit"
                                >
                                  <Edit size={12} />
                                </button>
                                <button
                                  className={styles.intActionBtn}
                                  onClick={() => handleDeleteInteraction(int.id)}
                                  title="Delete"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        {int.type === "voice_note" && int.voiceUrl ? (
                          <audio controls src={int.voiceUrl} style={{ width: "100%", marginTop: 8, height: 36 }} />
                        ) : int.type === "document" && int.docUrl ? (
                          <a
                            href={int.docUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-body-md"
                            style={{ color: "var(--r-primary)", marginTop: 4, display: "inline-flex", alignItems: "center", gap: 4 }}
                          >
                            <Paperclip size={14} /> {int.docName || "View document"}
                          </a>
                        ) : (
                          <p className="text-body-md" style={{ color: "var(--r-on-surface-variant)", marginTop: 4 }}>{int.note}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {activeTab === "documents" && (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    onChange={e => handleUploadDocument(e.target.files)}
                    style={{ display: "none" }}
                  />
                  <button
                    className="r-btn r-btn-primary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingDoc}
                    style={{ width: "100%" }}
                  >
                    <Upload size={16} /> {uploadingDoc ? "Uploading…" : "Upload Document / Photo"}
                  </button>
                </div>
                {interactions.filter(i => i.type === "document").length === 0 ? (
                  <p className="text-body-md" style={{ color: "var(--r-outline)", textAlign: "center", padding: 24 }}>
                    No documents yet. Upload agreements, ID proofs, or site photos.
                  </p>
                ) : (
                  <div className={styles.docList}>
                    {interactions.filter(i => i.type === "document").map((doc, i) => (
                      <a
                        key={doc.id || i}
                        href={doc.docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.docItem}
                      >
                        <div className={styles.docIcon}>
                          <FileText size={20} />
                        </div>
                        <div className={styles.docInfo}>
                          <p className="text-body-md" style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.docName}</p>
                          <p className="text-label-md" style={{ color: "var(--r-outline)" }}>
                            {doc.docType?.startsWith("image/") ? "Image" : doc.docType || "File"} · {formatTimelineDate(doc.createdAt)}
                          </p>
                        </div>
                        <Paperclip size={16} color="var(--r-outline)" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
            {activeTab === "visits" && (
              <div className={styles.activityFeed}>
                {/* Upcoming scheduled visit */}
                {lead.visitDate && (
                  <div className={styles.activityItem}>
                    <div className={styles.activityDot} style={{ background: "var(--r-warning-bg)", color: "var(--r-warning)" }}>
                      <Clock size={14} />
                    </div>
                    <div className={styles.activityBody}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <p className="text-body-md" style={{ fontWeight: 600 }}>Upcoming Visit</p>
                      </div>
                      <p className="text-body-md" style={{ color: "var(--r-on-surface-variant)", marginTop: 4 }}>
                        {lead.visitDate}{lead.visitTime ? ` at ${lead.visitTime}` : ""}
                      </p>
                      {lead.visitLocation && (
                        <a
                          className="text-body-md"
                          style={{ color: "var(--r-primary)", marginTop: 4, display: "inline-flex", alignItems: "center", gap: 4 }}
                          href={`https://maps.google.com/?q=${encodeURIComponent(lead.visitLocation)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MapPin size={14} /> {lead.visitLocation}
                        </a>
                      )}
                    </div>
                  </div>
                )}
                {/* Past visit interactions */}
                {interactions.filter(i => i.type === "visit" || i.type === "visit_scheduled").length === 0 && !lead.visitDate && (
                  <p className="text-body-md" style={{ color: "var(--r-outline)", textAlign: "center", padding: 24 }}>No visits recorded yet.</p>
                )}
                {interactions.filter(i => i.type === "visit" || i.type === "visit_scheduled").map((int, i) => (
                  <div key={int.id || i} className={styles.activityItem}>
                    <div className={styles.activityDot} style={{
                      background: int.type === "visit" ? "var(--r-success-bg)" : "var(--r-warning-bg)",
                      color: int.type === "visit" ? "var(--r-success)" : "var(--r-warning)"
                    }}>
                      {int.type === "visit" ? <MapPin size={14} /> : <Clock size={14} />}
                    </div>
                    <div className={styles.activityBody}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <p className="text-body-md" style={{ fontWeight: 600 }}>{int.type === "visit" ? "Completed Visit" : "Scheduled Visit"}</p>
                        <span className="text-label-md" style={{ color: "var(--r-outline)" }}>{formatTimelineDate(int.createdAt)}</span>
                      </div>
                      <p className="text-body-md" style={{ color: "var(--r-on-surface-variant)", marginTop: 4 }}>{int.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeTab === "payments" && <div style={{ padding: 24, textAlign: "center" }}><p className="text-body-md" style={{ color: "var(--r-outline)" }}>Payment tracking coming soon</p></div>}
          </div>
        </section>

        {/* Suggested Properties */}
        {matchedProperties.length > 0 && (
          <section className={`r-card ${styles.matchCard}`}>
            <h3 className="text-headline-md" style={{ marginBottom: 12 }}>Suggested Properties</h3>
            <div className={styles.matchList}>
              {matchedProperties.map(item => (
                <div key={item.id} className={styles.matchItem} onClick={() => router.push("/inventory")}>
                  <div className={styles.matchAvatar}><HomeIcon size={18} /></div>
                  <div className={styles.matchInfo}>
                    <p className="text-body-md" style={{ fontWeight: 600 }}>{item.projectName}</p>
                    <p className="text-body-md" style={{ color: "var(--r-on-surface-variant)" }}>{item.bhk} {item.area && `· ${item.area}`}</p>
                  </div>
                  <ChevronRight size={16} color="var(--r-outline)" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Quick Stats */}
        <section className={styles.quickStats}>
          <div className={`r-card ${styles.statItem}`}>
            <p className="text-label-md" style={{ color: "var(--r-outline)", marginBottom: 4 }}>Total Visits</p>
            <p className="text-headline-md" style={{ color: "var(--r-primary)" }}>{interactions.filter(i => i.type === "visit").length}</p>
          </div>
          <div className={`r-card ${styles.statItem}`}>
            <p className="text-label-md" style={{ color: "var(--r-outline)", marginBottom: 4 }}>Interactions</p>
            <p className="text-headline-md" style={{ color: "var(--r-primary)" }}>{interactions.length + voiceNotes.length}</p>
          </div>
        </section>
      </main>

      {/* Edit Sheet */}
      <BottomSheet open={showEdit} onClose={() => setShowEdit(false)} title="Edit Lead" tall>
        <LeadForm lead={lead} leads={[]} onDone={() => { setShowEdit(false); window.location.reload(); }} onCancel={() => setShowEdit(false)} />
      </BottomSheet>

      {/* Note Sheet */}
      <BottomSheet open={noteOpen} onClose={() => setNoteOpen(false)} title="Add Note">
        <div style={{ padding: 16 }}>
          <textarea className="r-input" rows={4} placeholder="Write a note..." value={noteText} onChange={e => setNoteText(e.target.value)} />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="r-btn r-btn-ghost" onClick={() => setNoteOpen(false)}>Cancel</button>
            <button className="r-btn r-btn-primary" onClick={handleAddNote} disabled={!noteText.trim()}>Save Note</button>
          </div>
        </div>
      </BottomSheet>

      {/* Follow-up Date Sheet */}
      <BottomSheet open={showFollowUp} onClose={() => setShowFollowUp(false)} title="Schedule Follow-up">
        <div style={{ padding: 16 }}>
          <p className="text-body-md" style={{ color: "var(--r-on-surface-variant)", marginBottom: 12 }}>Pick a date for the next follow-up</p>
          <input
            type="date"
            className="r-input"
            value={followUpDate}
            onChange={e => setFollowUpDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            style={{ marginBottom: 16 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="r-btn r-btn-ghost" onClick={() => setShowFollowUp(false)} style={{ flex: 1 }}>Cancel</button>
            <button className="r-btn r-btn-primary" onClick={handleScheduleFollowUp} disabled={!followUpDate} style={{ flex: 1 }}>Schedule</button>
          </div>
        </div>
      </BottomSheet>

      {/* Status Update Sheet */}
      <BottomSheet open={showStatusSheet} onClose={() => setShowStatusSheet(false)} title="Update Status">
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {PIPELINE.map(step => (
            <button
              key={step.value}
              className={`r-btn ${lead?.status === step.value ? "r-btn-primary" : "r-btn-ghost"}`}
              onClick={() => { handleStatusChange(step.value); setShowStatusSheet(false); }}
              style={{ justifyContent: "flex-start", width: "100%" }}
            >
              <Check size={16} style={{ opacity: lead?.status === step.value ? 1 : 0 }} /> {step.label}
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* Schedule Visit Sheet */}
      <BottomSheet open={showScheduleVisit} onClose={() => setShowScheduleVisit(false)} title="Schedule Site Visit">
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <p className="text-body-md" style={{ color: "var(--r-on-surface-variant)" }}>Set date, time and location for the site visit</p>
          <input
            type="date"
            className="r-input"
            value={visitDate}
            onChange={e => setVisitDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
          />
          <input
            type="time"
            className="r-input"
            value={visitTime}
            onChange={e => setVisitTime(e.target.value)}
          />
          <input
            type="text"
            className="r-input"
            placeholder="Site address or location..."
            value={visitLocation}
            onChange={e => setVisitLocation(e.target.value)}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="r-btn r-btn-ghost" onClick={() => setShowScheduleVisit(false)} style={{ flex: 1 }}>Cancel</button>
            <button className="r-btn r-btn-primary" onClick={handleScheduleVisit} disabled={!visitDate} style={{ flex: 1 }}>Schedule Visit</button>
          </div>
        </div>
      </BottomSheet>

      {/* WhatsApp Template Sheet */}
      <BottomSheet open={showWASheet} onClose={() => setShowWASheet(false)} title="Send WhatsApp">
        <div style={{ padding: 16 }}>
          <p className="text-body-md" style={{ color: "var(--r-on-surface-variant)", marginBottom: 12 }}>Choose a template or send a quick message</p>
          <button className="r-btn r-btn-primary" onClick={() => handleWA()} style={{ width: "100%", marginBottom: 12 }}>Quick Message</button>
          {templates.map(t => (
            <button key={t.id} className="r-btn r-btn-ghost" onClick={() => handleWA(t)} style={{ width: "100%", marginBottom: 8, justifyContent: "flex-start" }}>
              <MessageCircle size={16} /> {t.name}
            </button>
          ))}
          {templates.length === 0 && <p className="text-body-md" style={{ color: "var(--r-outline)", textAlign: "center" }}>No templates yet. Create them in Settings.</p>}
        </div>
      </BottomSheet>

      {/* Log Visit Sheet */}
      <BottomSheet open={showLogVisit} onClose={() => setShowLogVisit(false)} title="Log Site Visit">
        <div style={{ padding: 16 }}>
          <p className="text-body-md" style={{ color: "var(--r-on-surface-variant)", marginBottom: 12 }}>Enter the project or property where the visit was done</p>
          <input
            type="text"
            className="r-input"
            placeholder="e.g. Smartworld Gems, Dwarka..."
            value={logVisitProject}
            onChange={e => setLogVisitProject(e.target.value)}
            style={{ marginBottom: 16 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="r-btn r-btn-ghost" onClick={() => setShowLogVisit(false)} style={{ flex: 1 }}>Cancel</button>
            <button className="r-btn r-btn-primary" onClick={handleLogVisit} disabled={!logVisitProject.trim()} style={{ flex: 1 }}>Log Visit</button>
          </div>
        </div>
      </BottomSheet>

      {/* Edit Interaction Sheet */}
      <BottomSheet open={!!editingInt} onClose={() => { setEditingInt(null); setEditIntText(""); }} title="Edit Activity">
        <div style={{ padding: 16 }}>
          <textarea className="r-input" rows={3} value={editIntText} onChange={e => setEditIntText(e.target.value)} />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="r-btn r-btn-ghost" onClick={() => { setEditingInt(null); setEditIntText(""); }} style={{ flex: 1 }}>Cancel</button>
            <button className="r-btn r-btn-primary" onClick={handleSaveEditInteraction} disabled={!editIntText.trim()} style={{ flex: 1 }}>Save</button>
          </div>
        </div>
      </BottomSheet>

      {/* SMS Template Sheet */}
      <BottomSheet open={showSmsSheet} onClose={() => setShowSmsSheet(false)} title="Send SMS">
        <div style={{ padding: 16 }}>
          <p className="text-body-md" style={{ color: "var(--r-on-surface-variant)", marginBottom: 12 }}>Choose a template or send a quick SMS</p>
          <button className="r-btn r-btn-primary" onClick={() => handleSMS()} style={{ width: "100%", marginBottom: 12 }}>Quick SMS</button>
          {smsTemplates.map(t => (
            <button key={t.id} className="r-btn r-btn-ghost" onClick={() => handleSMS(t)} style={{ width: "100%", marginBottom: 8, justifyContent: "flex-start" }}>
              <Send size={16} /> {t.name}
              <span className="text-label-md" style={{ color: "var(--r-outline)", marginLeft: "auto" }}>{t.message.length} chars</span>
            </button>
          ))}
          {smsTemplates.length === 0 && <p className="text-body-md" style={{ color: "var(--r-outline)", textAlign: "center" }}>No SMS templates yet. Create them in Settings.</p>}
        </div>
      </BottomSheet>

      {/* Floating Edit FAB */}
      <button className={styles.editFab} onClick={() => setShowEdit(true)} title="Edit lead">
        <Edit size={24} />
      </button>
    </div>
  );
}

function ReqItem({ icon, label, value }) {
  return (
    <div className={styles.reqItem}>
      <span style={{ color: "var(--r-secondary-container)" }}>{icon}</span>
      <div>
        <p className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>{label}</p>
        <p className="text-body-lg" style={{ fontWeight: 600 }}>{value}</p>
      </div>
    </div>
  );
}
