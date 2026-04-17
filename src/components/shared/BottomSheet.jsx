"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import styles from "./BottomSheet.module.css";

// FIX #6: Swipe-down-to-close now works from the ENTIRE header area
// (drag handle + title bar), not just the tiny drag handle bar.
// Also lowered the close threshold from 100px to 80px for easier closing.
// Mouse drag support added so it also works on desktop.

export default function BottomSheet({ open, onClose, title, children, tall = false }) {
  const sheetRef   = useRef(null);
  const startY     = useRef(0);
  const currentY   = useRef(0);
  const isDragging = useRef(false);
  const [dragOffset, setDragOffset] = useState(0);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      setDragOffset(0);
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // ── Touch handlers ──────────────────────────────────────────────────────────
  function onTouchStart(e) {
    startY.current   = e.touches[0].clientY;
    currentY.current = e.touches[0].clientY;
    isDragging.current = true;
  }

  function onTouchMove(e) {
    if (!isDragging.current) return;
    currentY.current = e.touches[0].clientY;
    const delta = currentY.current - startY.current;
    if (delta > 0) setDragOffset(delta);
  }

  function onTouchEnd() {
    isDragging.current = false;
    if (dragOffset > 80) {       // 80px threshold (was 100px — easier to close)
      setDragOffset(0);
      onClose();
    } else {
      setDragOffset(0);
    }
  }

  // ── Mouse drag handlers (for desktop / emulator) ────────────────────────────
  function onMouseDown(e) {
    startY.current   = e.clientY;
    isDragging.current = true;
    // Capture mouse outside element
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onMouseUp);
  }

  function onMouseMove(e) {
    if (!isDragging.current) return;
    const delta = e.clientY - startY.current;
    if (delta > 0) setDragOffset(delta);
  }

  function onMouseUp() {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup",   onMouseUp);
    if (!isDragging.current) return;
    isDragging.current = false;
    if (dragOffset > 80) {
      setDragOffset(0);
      onClose();
    } else {
      setDragOffset(0);
    }
  }

  if (!open) return null;

  // Shared drag props — applied to both the handle area AND the title bar
  const dragProps = {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onMouseDown,
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={sheetRef}
        className={`${styles.sheet} ${tall ? styles.tall : ""}`}
        onClick={e => e.stopPropagation()}
        style={{
          transform:  `translateY(${dragOffset}px)`,
          transition: isDragging.current ? "none" : "transform 0.22s ease",
        }}
      >
        {/* Drag handle — visible pill at the top */}
        <div
          className={styles.handleWrap}
          {...dragProps}
          style={{ userSelect: "none" }}
        >
          <div className={styles.handle} />
        </div>

        {/* Title bar — also swipeable (FIX: was not draggable before) */}
        {title && (
          <div
            className={styles.header}
            {...dragProps}
            style={{ userSelect: "none", cursor: "grab" }}
          >
            <h3 className={styles.title}>{title}</h3>
            <button
              className={styles.closeBtn}
              onClick={e => { e.stopPropagation(); onClose(); }}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
