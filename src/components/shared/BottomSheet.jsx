"use client";
import { useEffect, useRef, useState } from "react";
import styles from "./BottomSheet.module.css";

export default function BottomSheet({ open, onClose, title, children, tall = false }) {
  const sheetRef  = useRef(null);
  const startY    = useRef(0);
  const currentY  = useRef(0);
  const [dragging, setDragging] = useState(false);
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

  // Touch handlers for swipe-down-to-close
  function onTouchStart(e) {
    startY.current   = e.touches[0].clientY;
    currentY.current = e.touches[0].clientY;
    setDragging(true);
  }

  function onTouchMove(e) {
    currentY.current = e.touches[0].clientY;
    const delta = currentY.current - startY.current;
    if (delta > 0) {
      setDragOffset(delta);
    }
  }

  function onTouchEnd() {
    setDragging(false);
    if (dragOffset > 100) {
      setDragOffset(0);
      onClose();
    } else {
      setDragOffset(0);
    }
  }

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={sheetRef}
        className={`${styles.sheet} ${tall ? styles.tall : ""}`}
        onClick={e => e.stopPropagation()}
        style={{
          transform: `translateY(${dragOffset}px)`,
          transition: dragging ? "none" : "transform 0.22s ease",
        }}
      >
        {/* Drag handle — touch target for swipe */}
        <div
          className={styles.handleWrap}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className={styles.handle} />
        </div>

        {title && (
          <div className={styles.header}>
            <h3 className={styles.title}>{title}</h3>
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
          </div>
        )}
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
