"use client";

import { useState } from "react";
import { useToast } from "./Toast";
import { ARCHIVE_REASONS } from "@/lib/utils/constants";
import { Archive, X, AlertTriangle } from "lucide-react";
import styles from "./ArchiveLead.module.css";

export default function ArchiveLeadModal({ lead, isOpen, onClose, onArchive }) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  if (!isOpen || !lead) return null;

  const handleArchive = async () => {
    if (!reason) {
      toast.error("Please select a reason for archiving");
      return;
    }

    setBusy(true);
    try {
      await onArchive(lead.id, { reason, notes, archivedAt: new Date().toISOString() });
      toast.success("Lead archived successfully");
      onClose();
    } catch (err) {
      console.error("Archive failed:", err);
      toast.error("Failed to archive lead");
    } finally {
      setBusy(false);
    }
  };

  const selectedReason = ARCHIVE_REASONS.find(r => r.value === reason);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            <Archive size={20} /> Archive Lead
          </h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.leadInfo}>
            <p className={styles.leadName}>{lead.name}</p>
            <p className={styles.leadMobile}>{lead.mobile}</p>
          </div>

          <div className={styles.warning}>
            <AlertTriangle size={16} />
            <span>Archived leads will be removed from your main list but kept for 1 year.</span>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Why are you archiving this lead?</label>
            <div className={styles.reasonsGrid}>
              {ARCHIVE_REASONS.map(r => (
                <button
                  key={r.value}
                  type="button"
                  className={`${styles.reasonBtn} ${reason === r.value ? styles.reasonActive : ""}`}
                  onClick={() => setReason(r.value)}
                >
                  <span className={styles.reasonLabel}>{r.label}</span>
                  <span className={styles.reasonDesc}>{r.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Additional Notes (optional)</label>
            <textarea
              className={styles.textarea}
              placeholder="Any other details about why this lead is being archived..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {selectedReason && (
            <div className={styles.summary}>
              <p>Archiving <strong>{lead.name}</strong> as <strong>{selectedReason.label}</strong></p>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button 
            className={styles.archiveBtn} 
            onClick={handleArchive}
            disabled={busy || !reason}
          >
            {busy ? "Archiving..." : "Archive Lead"}
          </button>
        </div>
      </div>
    </div>
  );
}
