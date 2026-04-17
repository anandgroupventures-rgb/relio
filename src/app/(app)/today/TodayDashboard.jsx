"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { usePaginatedLeads } from "@/lib/hooks/useLeads";
import { localLeads } from "@/lib/firebase/offlineDB";
import { calculateLeadScore, getSuggestedAction, getTemperatureFromScore } from "@/lib/utils/leadScoring";
import { format, isToday, isTomorrow, formatDistanceToNow, startOfDay, endOfDay } from "date-fns";
import { 
  Calendar, Clock, MapPin, Phone, MessageCircle, Navigation,
  Sun, Star, AlertTriangle, TrendingUp, ChevronRight, Plus,
  Mic, Flame, CheckCircle2, MoreHorizontal
} from "lucide-react";
import BottomSheet from "@/components/shared/BottomSheet";
import LeadForm from "@/components/leads/LeadForm";
import styles from "./TodayDashboard.module.css";

// Quick stats card component
function StatCard({ icon: Icon, label, value, color, onClick }) {
  return (
    <button 
      className={`${styles.statCard} press-effect`}
      style={{ borderLeftColor: color }}
      onClick={onClick}
    >
      <div className={styles.statIcon} style={{ color }}>
        <Icon size={20} />
      </div>
      <div className={styles.statContent}>
        <span className={styles.statValue}>{value}</span>
        <span className={styles.statLabel}>{label}</span>
      </div>
    </button>
  );
}

// Agenda item component
function AgendaItem({ lead, time, type, onCall, onWhatsApp, onNavigate }) {
  const score = lead.score || calculateLeadScore(lead);
  const temperature = getTemperatureFromScore(score);
  const initials = lead.name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";

  return (
    <div className={`${styles.agendaItem} hover-lift`}>
      <div className={styles.agendaTime}>
        <Clock size={14} />
        <span>{time}</span>
      </div>
      
      <div className={styles.agendaCard}>
        <div className={styles.agendaHeader}>
          <div 
            className={styles.agendaAvatar}
            style={{ background: temperature.color + '20', color: temperature.color }}
          >
            {initials}
          </div>
          <div className={styles.agendaInfo}>
            <h4 className={styles.agendaName}>{lead.name}</h4>
            <p className={styles.agendaDetail}>
              {type === "visit" ? (
                <><MapPin size={12} /> {lead.projectInterest || "Site Visit"}</>
              ) : (
                <><Phone size={12} /> Follow-up call</>
              )}
            </p>
          </div>
          <div 
            className={styles.agendaTemp}
            style={{ color: temperature.color, background: temperature.color + '15' }}
          >
            {temperature.label.split(' ')[0]}
          </div>
        </div>

        <div className={styles.agendaActions}>
          {type === "visit" && (
            <button 
              className={`${styles.agendaBtn} ${styles.navigateBtn}`}
              onClick={() => onNavigate?.(lead)}
            >
              <Navigation size={14} /> Directions
            </button>
          )}
          <button 
            className={`${styles.agendaBtn} ${styles.callBtn}`}
            onClick={() => onCall?.(lead)}
          >
            <Phone size={14} /> Call
          </button>
          <button 
            className={`${styles.agendaBtn} ${styles.whatsAppBtn}`}
            onClick={() => onWhatsApp?.(lead)}
          >
            <MessageCircle size={14} /> WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}

// Priority lead card
function PriorityCard({ lead, onClick }) {
  const score = lead.score || calculateLeadScore(lead);
  const temperature = getTemperatureFromScore(score);
  const suggestion = getSuggestedAction(lead, score);
  const initials = lead.name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  
  const isOverdue = lead.followUpDate && new Date(lead.followUpDate) < new Date();
  
  return (
    <button 
      className={`${styles.priorityCard} hover-lift press-effect`}
      onClick={onClick}
    >
      <div className={styles.priorityHeader}>
        <div 
          className={styles.priorityAvatar}
          style={{ background: temperature.color + '20', color: temperature.color }}
        >
          {initials}
        </div>
        <div className={styles.priorityInfo}>
          <h4 className={styles.priorityName}>{lead.name}</h4>
          <p className={styles.priorityDetail}>{lead.projectInterest || lead.bhk}</p>
        </div>
        <div className={styles.priorityScore} style={{ color: temperature.color }}>
          <TrendingUp size={12} />
          <span>{Math.round((score + 100) / 2)}</span>
        </div>
      </div>
      
      {isOverdue && (
        <div className={styles.overdueBadge}>
          <AlertTriangle size={12} />
          <span>{formatDistanceToNow(new Date(lead.followUpDate), { addSuffix: true })}</span>
        </div>
      )}
      
      <div className={styles.priorityAction}>
        <span className={styles.suggestion}>💡 {suggestion.action}</span>
        <ChevronRight size={16} className={styles.chevron} />
      </div>
    </button>
  );
}

export default function TodayDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { leads, loading } = usePaginatedLeads();
  const [showAddLead, setShowAddLead] = useState(false);
  const [showVoiceNote, setShowVoiceNote] = useState(false);

  // Get today's date
  const today = useMemo(() => new Date(), []);
  const formattedDate = format(today, "EEEE, d MMMM yyyy");

  // Calculate stats
  const stats = useMemo(() => {
    const activeLeads = leads.filter(l => !l.isArchived);
    
    return {
      total: activeLeads.length,
      newToday: activeLeads.filter(l => {
        const created = new Date(l.createdAt);
        return isToday(created);
      }).length,
      hot: activeLeads.filter(l => (l.score || 50) >= 75).length,
      followUpToday: activeLeads.filter(l => {
        if (!l.followUpDate) return false;
        const fuDate = new Date(l.followUpDate);
        return isToday(fuDate);
      }).length,
      overdue: activeLeads.filter(l => {
        if (!l.followUpDate) return false;
        const fuDate = new Date(l.followUpDate);
        return fuDate < today && !isToday(fuDate);
      }).length,
    };
  }, [leads, today]);

  // Get today's agenda
  const agenda = useMemo(() => {
    const items = [];
    
    leads.forEach(lead => {
      if (lead.isArchived) return;
      
      // Site visits scheduled for today
      if (lead.stage === "visit_scheduled" && lead.visitDate) {
        const visitDate = new Date(lead.visitDate);
        if (isToday(visitDate)) {
          items.push({
            lead,
            time: lead.visitTime || "10:00 AM",
            type: "visit",
            priority: 1
          });
        }
      }
      
      // Follow-ups due today
      if (lead.followUpDate) {
        const fuDate = new Date(lead.followUpDate);
        if (isToday(fuDate)) {
          items.push({
            lead,
            time: "2:00 PM", // Default time if not specified
            type: "followup",
            priority: lead.score >= 75 ? 1 : 2
          });
        }
      }
    });
    
    return items.sort((a, b) => {
      // Sort by time
      const timeA = parseInt(a.time);
      const timeB = parseInt(b.time);
      return timeA - timeB;
    });
  }, [leads]);

  // Get priority leads (hot or overdue)
  const priorityLeads = useMemo(() => {
    return leads
      .filter(l => {
        if (l.isArchived) return false;
        const score = l.score || 50;
        const isHot = score >= 75;
        const isOverdue = l.followUpDate && new Date(l.followUpDate) < today;
        return isHot || isOverdue;
      })
      .slice(0, 5);
  }, [leads, today]);

  // Action handlers
  const handleCall = (lead) => {
    window.open(`tel:${lead.mobile}`, "_self");
  };

  const handleWhatsApp = (lead) => {
    window.open(`https://wa.me/91${lead.mobile?.replace(/\D/g, "")}`, "_blank");
  };

  const handleNavigate = (lead) => {
    if (lead.projectInterest) {
      window.open(`https://maps.google.com/?q=${encodeURIComponent(lead.projectInterest)}`, "_blank");
    }
  };

  const handleLeadClick = (leadId) => {
    router.push(`/leads/${leadId}`);
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={`${styles.spinner} spinner`} />
        <p>Loading your day...</p>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      {/* Header with Date */}
      <header className={styles.header}>
        <div className={styles.dateSection}>
          <Sun size={24} className={styles.sunIcon} />
          <div>
            <h1 className={styles.greeting}>Good morning</h1>
            <p className={styles.date}>{formattedDate}</p>
          </div>
        </div>
        <div className={styles.quickActions}>
          <button 
            className={`${styles.voiceBtn} press-effect`}
            onClick={() => setShowVoiceNote(true)}
            title="Add voice note"
          >
            <Mic size={20} />
          </button>
          <button 
            className={`${styles.addBtn} press-effect`}
            onClick={() => setShowAddLead(true)}
          >
            <Plus size={20} />
          </button>
        </div>
      </header>

      {/* Quick Stats */}
      <section className={styles.statsSection}>
        <div className={styles.statsGrid}>
          <StatCard 
            icon={Star} 
            label="Hot Leads" 
            value={stats.hot} 
            color="#dc2626"
            onClick={() => router.push("/leads?temperature=hot")}
          />
          <StatCard 
            icon={Calendar} 
            label="Today" 
            value={stats.followUpToday} 
            color="#ea580c"
            onClick={() => {}}
          />
          <StatCard 
            icon={AlertTriangle} 
            label="Overdue" 
            value={stats.overdue} 
            color="#991b1b"
            onClick={() => router.push("/leads")}
          />
          <StatCard 
            icon={CheckCircle2} 
            label="New Today" 
            value={stats.newToday} 
            color="#16a34a"
            onClick={() => router.push("/leads")}
          />
        </div>
      </section>

      {/* Today's Agenda */}
      {agenda.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Calendar size={18} />
            Today's Agenda
            <span className={styles.count}>{agenda.length}</span>
          </h2>
          <div className={styles.agendaList}>
            {agenda.map((item, index) => (
              <AgendaItem
                key={`${item.lead.id}-${index}`}
                lead={item.lead}
                time={item.time}
                type={item.type}
                onCall={handleCall}
                onWhatsApp={handleWhatsApp}
                onNavigate={handleNavigate}
              />
            ))}
          </div>
        </section>
      )}

      {/* Priority Leads */}
      {priorityLeads.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Flame size={18} />
            Priority Leads
            <span className={styles.count}>{priorityLeads.length}</span>
          </h2>
          <div className={styles.priorityList}>
            {priorityLeads.map(lead => (
              <PriorityCard
                key={lead.id}
                lead={lead}
                onClick={() => handleLeadClick(lead.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty State - No Agenda */}
      {agenda.length === 0 && priorityLeads.length === 0 && (
        <section className={styles.emptySection}>
          <div className={styles.emptyState}>
            <Sun size={48} className={styles.emptyIcon} />
            <h3>All caught up!</h3>
            <p>No follow-ups or visits scheduled for today.</p>
            <div className={styles.emptyActions}>
              <button 
                className="relio-btn relio-btn-accent"
                onClick={() => setShowAddLead(true)}
              >
                <Plus size={18} /> Add New Lead
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Add Lead Bottom Sheet */}
      <BottomSheet 
        open={showAddLead} 
        onClose={() => setShowAddLead(false)} 
        title="Add Lead" 
        tall
      >
        <LeadForm 
          leads={leads}
          quickMode
          onDone={() => setShowAddLead(false)}
          onCancel={() => setShowAddLead(false)}
        />
      </BottomSheet>
    </div>
  );
}
