"use client";

import { useEffect } from "react";

export default function AuthError({ error, reset }) {
  useEffect(() => {
    console.error("[Auth Error]", error);
    if (error && typeof error === "object") {
      console.error("[Auth Error] keys:", Object.keys(error));
      console.error("[Auth Error] toString:", error.toString?.());
      console.error("[Auth Error] message:", error.message);
      console.error("[Auth Error] stack:", error.stack);
    }
  }, [error]);

  return (
    <div style={{ padding: 24, textAlign: "center" }}>
      <h2 style={{ color: "var(--r-error)" }}>Auth Error</h2>
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
