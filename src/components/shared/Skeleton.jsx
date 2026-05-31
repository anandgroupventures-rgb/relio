"use client";
import styles from "./Skeleton.module.css";

export function SkeletonCard() {
  return (
    <div className={styles.card} aria-hidden="true">
      <div className={styles.cardTop}>
        <div className={styles.avatar} />
        <div className={styles.lines}>
          <div className={styles.line} style={{ width: "60%" }} />
          <div className={styles.line} style={{ width: "40%" }} />
        </div>
      </div>
      <div className={styles.meta}>
        <div className={styles.line} style={{ width: "80%" }} />
        <div className={styles.tags}>
          <div className={styles.tag} />
          <div className={styles.tag} />
        </div>
      </div>
      <div className={styles.bottom}>
        <div className={styles.badge} />
        <div className={styles.line} style={{ width: "30%" }} />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 5 }) {
  return (
    <div className={styles.list} aria-label="Loading…" role="status">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonKpi() {
  return (
    <div className={styles.kpi} aria-hidden="true">
      <div className={styles.line} style={{ width: "40%" }} />
      <div className={styles.line} style={{ width: "60%", height: 28 }} />
      <div className={styles.line} style={{ width: "30%" }} />
    </div>
  );
}
