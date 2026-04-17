import styles from "./EmptyState.module.css";

export default function EmptyState({ icon, title, body, action }) {
  return (
    <div className={styles.container}>
      <div className={styles.icon}>{icon}</div>
      <p className={styles.title}>{title}</p>
      {body && <p className={styles.body}>{body}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
