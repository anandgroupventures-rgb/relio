export default function EmptyState({ icon, title, body, action }) {
  return (
    <div style={{
      textAlign:   "center",
      padding:     "48px 24px",
      color:       "var(--relio-text-muted)",
    }}>
      <div style={{ fontSize: 44, marginBottom: 14 }}>{icon}</div>
      <p style={{ fontSize: 17, fontWeight: 700, color: "var(--relio-text)", marginBottom: 8 }}>{title}</p>
      {body && <p style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>{body}</p>}
      {action}
    </div>
  );
}
