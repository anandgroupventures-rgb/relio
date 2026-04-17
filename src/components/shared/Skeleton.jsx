import styles from "./Skeleton.module.css";

export function SkeletonCard() {
  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <div className={styles.avatar} />
        <div className={styles.info}>
          <div className={styles.name} />
          <div className={styles.project} />
        </div>
        <div className={styles.actions}>
          <div className={styles.actionBtn} />
          <div className={styles.actionBtn} />
        </div>
      </div>
      <div className={styles.tagsRow}>
        <div className={styles.tag} />
        <div className={styles.tag} />
        <div className={styles.tempBadge} />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 5 }) {
  return (
    <div className={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
