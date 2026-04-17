"use client";
import { useRouter } from "next/navigation";
import { memo, useMemo } from "react";
import { 
  Sparkles, Phone, CheckCircle, FileText, Calendar, Home, 
  PartyPopper, PhoneCall, VolumeX, Clock, 
  PowerOff, XCircle, Trophy, RefreshCw,
  DollarSign, Phone as PhoneIcon, MessageCircle, AlertTriangle, 
  Flame, Snowflake, Moon, Archive, Star, TrendingUp
} from "lucide-react";
import { getTempStyle, getStatusColor, getStatusLabel } from "@/lib/utils/leadHelpers";
import { getTemperatureFromScore, formatScoreForDisplay } from "@/lib/utils/leadScoring";
import { LEAD_STAGES, LEAD_CATEGORIES, STAGE_ACTIONS } from "@/lib/utils/constants";
import { formatFollowUp, isOverdue, isToday } from "@/lib/utils/dateHelpers";
import styles from "./LeadCard.module.css";

// Stage icons map using Lucide
const STAGE_ICONS = {
  new:              Sparkles,
  contacted:        Phone,
  qualified:        CheckCircle,
  visit_scheduled:  Calendar,
  visited:          Home,
  call_back:        PhoneCall,
  follow_up:        RefreshCw,
  booked:           PartyPopper,
  closed_won:       Trophy,
  disqualified:     XCircle,
};

// Temperature icons
const TEMP_ICONS = {
  "🔥 Hot": Flame,
  "☀️ Warm": Sparkles,
  "❄️ Cold": Snowflake,
  "💤 Dormant": Moon,
  "🚫 Unresponsive": VolumeX,
};

// Get stage label
function getStageLabel(stageValue) {
  const stage = LEAD_STAGES.find(s => s.value === stageValue);
  return stage?.label || stageValue;
}

// Get stage color
function getStageColor(stageValue) {
  const stage = LEAD_STAGES.find(s => s.value === stageValue);
  return stage?.color || "#6b7280";
}

// Get category label and color
function getCategoryInfo(categoryValue) {
  const cat = LEAD_CATEGORIES.find(c => c.value === categoryValue);
  return cat || { label: "⭐ Lead", color: "#fbbf24" };
}

const LeadCard = memo(function LeadCard({ 
  lead, 
  onCall, 
  onWhatsApp, 
  onArchive,
  selected, 
  onLongPress, 
  onSelect, 
  selectionMode,
  showScore = true 
}) {
  const router = useRouter();
  
  // Calculate score and temperature (auto-calculated)
  const scoreData = useMemo(() => {
    const score = lead.score ?? 50; // Default to warm if no score
    return {
      score,
      normalizedScore: formatScoreForDisplay(score),
      temperature: getTemperatureFromScore(score)
    };
  }, [lead.score]);
  
  const fuStr = formatFollowUp(lead.followUpDate);
  const overdue = isOverdue(lead.followUpDate);
  const dueToday = isToday(lead.followUpDate);
  const initials = lead.name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  
  const StageIconComponent = STAGE_ICONS[lead.stage || lead.status] || STAGE_ICONS.new;
  const TempIconComponent = TEMP_ICONS[scoreData.temperature.label] || Snowflake;
  const categoryInfo = getCategoryInfo(lead.category);
  
  // Get suggested action
  const suggestedAction = useMemo(() => {
    const actions = STAGE_ACTIONS[lead.stage || lead.status];
    if (actions && actions.length > 0) {
      return actions[0];
    }
    return scoreData.temperature.action;
  }, [lead.stage, lead.status, scoreData.temperature.action]);

  // Long press detection
  let pressTimer;
  function handleTouchStart() {
    pressTimer = setTimeout(() => {
      onLongPress?.(lead.id);
    }, 500);
  }
  function handleTouchEnd() {
    clearTimeout(pressTimer);
  }

  function handleClick() {
    if (selectionMode) {
      onSelect?.(lead.id);
    } else {
      router.push(`/leads/${lead.id}`);
    }
  }

  const stageColor = getStageColor(lead.stage || lead.status);
  const isClosed = lead.isArchived || 
    LEAD_STAGES.find(s => s.value === (lead.stage || lead.status))?.isClosed;

  return (
    <div
      className={`${styles.card} ${selected ? styles.selected : ""} ${isClosed ? styles.closed : ""}`}
      style={{ borderLeftColor: scoreData.temperature.color }}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
    >
      {/* Selection checkbox (shown in selection mode) */}
      {selectionMode && (
        <div className={`${styles.checkbox} ${selected ? styles.checkboxChecked : ""}`}>
          {selected && <CheckCircle size={14} />}
        </div>
      )}

      {/* Lead Score Badge (top right) */}
      {showScore && (
        <div 
          className={styles.scoreBadge}
          style={{ 
            background: scoreData.temperature.color + '20',
            color: scoreData.temperature.color,
            borderColor: scoreData.temperature.color
          }}
          title={`Score: ${scoreData.normalizedScore}/100 - ${scoreData.temperature.label}`}
        >
          <TrendingUp size={12} />
          <span>{scoreData.normalizedScore}</span>
        </div>
      )}

      {/* Top: Avatar + Name + Project */}
      <div className={styles.top}>
        <div 
          className={styles.avatar} 
          style={{ 
            background: scoreData.temperature.color + '15', 
            color: scoreData.temperature.color 
          }}
        >
          {initials}
        </div>
        <div className={styles.info}>
          <span className={styles.name}>{lead.name}</span>
          {(lead.projectInterest || lead.bhk || lead.propertyType) && (
            <div className={styles.project}>
              {lead.bhk && <span>{lead.bhk}</span>}
              {lead.bhk && lead.propertyType && <span className={styles.sep}>·</span>}
              {lead.propertyType && (
                <span>{lead.propertyType.replace('_', ' ')}</span>
              )}
              {(lead.bhk || lead.propertyType) && lead.projectInterest && (
                <span className={styles.sep}>·</span>
              )}
              {lead.projectInterest && <span>{lead.projectInterest}</span>}
            </div>
          )}
        </div>

        {/* Action buttons — always visible, top-right */}
        {!selectionMode && !isClosed && (
          <div className={styles.actions} onClick={e => e.stopPropagation()}>
            <button className={styles.actionBtn} onClick={() => onCall?.(lead)} aria-label="Call">
              <PhoneIcon size={16} />
            </button>
            <button className={styles.actionBtn} onClick={() => onWhatsApp?.(lead)} aria-label="WhatsApp">
              <MessageCircle size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Tags row: Category · Stage · Source · Follow-up · Temperature */}
      <div className={styles.tagsRow}>
        {/* Category chip */}
        <span 
          className={styles.categoryChip} 
          style={{ 
            color: categoryInfo.color, 
            background: categoryInfo.color + '15',
            borderColor: categoryInfo.color + '40'
          }}
        >
          {categoryInfo.label}
        </span>

        {/* Stage chip */}
        <span 
          className={styles.stageChip} 
          style={{ 
            color: stageColor, 
            borderColor: stageColor + '40', 
            background: stageColor + '12' 
          }}
        >
          <StageIconComponent size={12} /> {getStageLabel(lead.stage || lead.status)}
        </span>

        {/* Source */}
        {lead.source && (
          <span className={styles.sourceTag}>{lead.source}</span>
        )}

        {/* Follow-up date */}
        {fuStr && !isClosed && (
          <span 
            className={styles.followUpTag} 
            style={{
              color: overdue ? "var(--relio-danger)" : dueToday ? "var(--relio-gold)" : "var(--relio-text-muted)",
              fontWeight: (overdue || dueToday) ? 700 : 500,
              background: overdue ? "var(--relio-danger-bg)" : dueToday ? "var(--relio-gold-light)" : "transparent",
            }}
          >
            {overdue ? <AlertTriangle size={12} /> : <Calendar size={12} />} {fuStr}
          </span>
        )}

        {/* Temperature badge */}
        <span 
          className={styles.tempBadge} 
          style={{ 
            background: scoreData.temperature.color + '15', 
            color: scoreData.temperature.color 
          }}
        >
          <TempIconComponent size={12} /> {scoreData.temperature.label}
        </span>
      </div>

      {/* Suggested Action */}
      {!isClosed && (
        <div className={styles.suggestedAction}>
          <span className={styles.actionHint}>💡 {suggestedAction}</span>
        </div>
      )}

      {/* Bottom row: Budget + Referred by + Archive button */}
      <div className={styles.bottomRow}>
        {lead.budget && (
          <span className={styles.budget}>
            <DollarSign size={14} /> {lead.budget}
          </span>
        )}
        {lead.referredBy && (
          <span className={styles.referral}>via {lead.referredBy}</span>
        )}
        
        {/* Archive button (if not already archived and score is low) */}
        {!isClosed && scoreData.score < 0 && onArchive && (
          <button 
            className={styles.archiveBtn}
            onClick={(e) => {
              e.stopPropagation();
              onArchive(lead);
            }}
            title="Archive this lead"
          >
            <Archive size={14} /> Archive
          </button>
        )}
      </div>
    </div>
  );
});

export default LeadCard;
