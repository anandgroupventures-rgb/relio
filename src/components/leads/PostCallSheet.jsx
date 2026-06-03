"use client";
import { useState } from "react";
import { updateLead, addInteraction } from "@/lib/firebase/leads";
import { useAuth } from "@/lib/hooks/useAuth";
import { addDays, todayStr } from "@/lib/utils/dateHelpers";
import { CALL_OUTCOMES, FOLLOWUP_QUICK } from "@/lib/utils/constants";
import BottomSheet from "@/components/shared/BottomSheet";
import styles from "./PostCallSheet.module.css";

export default function PostCallSheet({ lead, open, onClose, onDone }) {
  const { user } = useAuth();
  const [step,      setStep]      = useState(1); // 1 | 2 | 3
  const [answered,  setAnswered]  = useState(null);
  const [outcome,   setOutcome]   = useState("");
  const [followUp,  setFollowUp]  = useState("");
  const [customDate,setCustomDate]= useState("");
  const [note,      setNote]      = useState("");
  const [busy,      setBusy]      = useState(false);

  const attempts = (lead?.callAttempts || 0) + 1;
  const isDeadWarning = !answered && attempts >= 5;

  function reset() {
    setStep(1); setAnswered(null); setOutcome("");
    setFollowUp(""); setCustomDate(""); setNote("");
  }

  function handleClose() { reset(); onClose(); }

  async function handleDone() {
    if (!user || !lead) return;
    setBusy(true);
    try {
      const fuDate = followUp === "custom" ? customDate : followUp;

      // Build interaction
      const interaction = {
        type:      answered ? "call_answered" : "call_missed",
        outcome:   answered ? outcome : "not_answered",
        notes:     note,
        followUpSet: fuDate || null,
        callAttempt: attempts,
      };

      // Map outcome to status / callStatus and qualification
      const pipelineMap = {
        interested:       "qualified",
        details_shared:   "details_shared",
        visit_confirmed:  "visit_scheduled",
        negotiating:      "deal_meeting_awaited",
        converted:        "won",
      };

      let newStatus = lead.status;
      let newCallStatus = lead.callStatus;
      let isQualified = lead.isQualified;
      let isArchived = lead.isArchived || lead.archived;

      if (answered) {
        if (outcome === "not_interested") {
          newCallStatus = "disqualified";
          isQualified = false;
          isArchived = true;
        } else if (outcome === "call_back") {
          newCallStatus = "call_back";
          isQualified = false;
        } else if (outcome === "other") {
          newCallStatus = "not_answering";
          isQualified = false;
        } else if (pipelineMap[outcome]) {
          newStatus = pipelineMap[outcome];
          isQualified = true;
        }
      } else {
        // Not answered
        if (attempts >= 5) {
          newCallStatus = "disqualified";
          isArchived = true;
        } else {
          newCallStatus = "not_answering";
        }
        isQualified = false;
      }

      const updates = {
        lastContactedAt: new Date(),
        callAttempts: attempts,
        isQualified,
        ...(fuDate ? { followUpDate: fuDate } : {}),
      };

      if (isQualified) {
        updates.status = newStatus;
        updates.callStatus = "qualified";
        updates.isArchived = false;
        updates.archived = false;
      } else {
        updates.callStatus = newCallStatus;
        updates.status = "new";
        updates.isArchived = isArchived;
        updates.archived = isArchived;
      }

      await updateLead(user.uid, lead.id, updates);
      await addInteraction(user.uid, lead.id, interaction);

      reset();
      onDone?.();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  const title = step === 1 ? "Log Call" : step === 2 ? "What happened?" : "Next follow-up?";

  return (
    <BottomSheet open={open} onClose={handleClose} title={title}>
      <div className={styles.content}>

        {/* ── Step 1: Answered? ── */}
        {step === 1 && (
          <div className={styles.step}>
            <p className={styles.question}>Did <strong>{lead?.name}</strong> answer?</p>
            <div className={styles.bigBtns}>
              <button className={`${styles.bigBtn} ${styles.yes}`}
                onClick={() => { setAnswered(true);  setStep(2); }}>
                ✅ Yes, answered
              </button>
              <button className={`${styles.bigBtn} ${styles.no}`}
                onClick={() => { setAnswered(false); setStep(3); }}>
                ❌ No answer
              </button>
            </div>
            {attempts > 1 && (
              <p className={styles.attemptNote}>Attempt #{attempts}</p>
            )}
          </div>
        )}

        {/* ── Step 2: Outcome (answered only) ── */}
        {step === 2 && (
          <div className={styles.step}>
            <div className={styles.outcomeList}>
              {CALL_OUTCOMES.map(o => (
                <button key={o.value}
                  className={`${styles.outcomeBtn} ${outcome === o.value ? styles.outcomeBtnActive : ""}`}
                  onClick={() => { setOutcome(o.value); setStep(3); }}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 3: Follow-up + note ── */}
        {step === 3 && (
          <div className={styles.step}>
            {isDeadWarning && (
              <div className={styles.deadWarning}>
                <span>⚠</span>
                <span>5th unanswered call. Consider marking as <strong>Lost</strong> or <strong>Invalid Number</strong>.</span>
              </div>
            )}

            <p className={styles.sectionLabel}>Set next follow-up</p>
            <div className={styles.fuOptions}>
              {FOLLOWUP_QUICK.map(q => (
                <button key={q.days}
                  className={`${styles.fuBtn} ${followUp === addDays(q.days) ? styles.fuBtnActive : ""}`}
                  onClick={() => setFollowUp(f => f === addDays(q.days) ? "" : addDays(q.days))}>
                  {q.label}
                </button>
              ))}
              <button
                className={`${styles.fuBtn} ${followUp === "custom" ? styles.fuBtnActive : ""}`}
                onClick={() => setFollowUp("custom")}>
                Custom
              </button>
              <button
                className={`${styles.fuBtn} ${followUp === "" && !customDate ? styles.fuBtnActive : ""}`}
                onClick={() => { setFollowUp(""); setCustomDate(""); }}>
                Not needed
              </button>
            </div>
            {followUp === "custom" && (
              <input className="relio-input" type="date" min={todayStr()}
                value={customDate} onChange={e => setCustomDate(e.target.value)}
                style={{ marginTop: 10 }} />
            )}

            <p className={styles.sectionLabel} style={{ marginTop: 16 }}>Add a note (optional)</p>
            <textarea
              className="relio-input"
              placeholder="What did you discuss…"
              rows={3}
              value={note}
              onChange={e => setNote(e.target.value)}
              style={{ resize: "none" }}
            />

            <button
              className="relio-btn relio-btn-primary"
              style={{ width: "100%", marginTop: 16 }}
              onClick={handleDone}
              disabled={busy}
            >
              {busy ? "Saving…" : "Done ✓"}
            </button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
