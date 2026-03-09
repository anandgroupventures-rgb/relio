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

  function reset() {
    setStep(1); setAnswered(null); setOutcome("");
    setFollowUp(""); setCustomDate(""); setNote("");
  }

  function handleClose() { reset(); onClose(); }

  async function handleDone() {
    setBusy(true);
    try {
      const fuDate = followUp === "custom" ? customDate : followUp;

      // Build interaction
      const interaction = {
        type:      answered ? "call_answered" : "call_missed",
        outcome:   answered ? outcome : "not_answered",
        notes:     note,
        followUpSet: fuDate || null,
      };

      // Map outcome to status
      const statusMap = {
        interested:       "interested",
        details_shared:   "details_shared",
        visit_confirmed:  "visit_scheduled",
        call_back:        "call_back",
        not_interested:   "not_interested",
        negotiating:      "negotiating",
        converted:        "converted",
      };

      const updates = {
        lastContactedAt: new Date(),
        ...(answered && statusMap[outcome] ? { status: statusMap[outcome] } : {}),
        ...(!answered ? { status: "not_answering" } : {}),
        ...(fuDate ? { followUpDate: fuDate } : {}),
      };

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
