"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    // Log the actual error object details to console
    console.error("[GlobalError]", error);
    if (error && typeof error === "object") {
      console.error("[GlobalError] keys:", Object.keys(error));
      console.error("[GlobalError] toString:", error.toString?.());
      console.error("[GlobalError] message:", error.message);
      console.error("[GlobalError] stack:", error.stack);
    }
  }, [error]);

  return (
    <html>
      <body style={{ padding: 24, fontFamily: "Inter, sans-serif", background: "#fcf9f8", color: "#1b1c1c" }}>
        <h2 style={{ color: "#ba1a1a" }}>Something went wrong</h2>
        <pre style={{ background: "#f0eded", padding: 16, borderRadius: 8, overflow: "auto" }}>
          {error?.message || error?.toString?.() || String(error)}
        </pre>
        <button
          onClick={() => reset?.()}
          style={{
            marginTop: 16,
            padding: "12px 24px",
            background: "#000666",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
