"use client";

import { useEffect } from "react";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("[App Error]", error);
    if (error && typeof error === "object") {
      console.error("[App Error] keys:", Object.keys(error));
      console.error("[App Error] toString:", error.toString?.());
      console.error("[App Error] message:", error.message);
      console.error("[App Error] stack:", error.stack);
    }
  }, [error]);

  return (
    <div style={{ padding: 24, textAlign: "center" }}>
      <h2 style={{ color: "var(--r-error)" }}>Something went wrong</h2>
      <pre style={{ background: "var(--r-surface-container)", padding: 16, borderRadius: 8, overflow: "auto", textAlign: "left" }}>
        {error?.message || error?.toString?.() || String(error)}
      </pre>
      <button
        onClick={() => reset?.()}
        className="r-btn r-btn-primary"
        style={{ marginTop: 16 }}
      >
        Try again
      </button>
    </div>
  );
}
