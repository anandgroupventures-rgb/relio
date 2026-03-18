"use client";
import { useEffect } from "react";

// Matches the THEMES array in settings/page.jsx
const THEMES = [
  { id: "default", gold: "#C49A2A", bg: "#F7F3ED" },
  { id: "blue",    gold: "#1E5FA8", bg: "#EDF2FA" },
  { id: "green",   gold: "#1A7842", bg: "#EDF5F0" },
  { id: "rose",    gold: "#C42A6A", bg: "#FAEDF3" },
  { id: "slate",   gold: "#4A5568", bg: "#F0F2F5" },
  { id: "dark",    gold: "#C49A2A", bg: "#1A1612" },
];

// FIX #4: This component reads the saved theme from localStorage on every
// app load and applies it to the CSS variables immediately.
// Without this, the CSS variables always reset to their defaults from
// globals.css when the session ends — even though the theme was saved.
// This component lives in the app layout so it runs on every page.
export default function ThemeLoader() {
  useEffect(() => {
    try {
      const savedId = localStorage.getItem("relio_theme");
      if (!savedId || savedId === "default") return; // globals.css already has defaults
      const t = THEMES.find(x => x.id === savedId);
      if (!t) return;

      const r = document.documentElement;
      r.style.setProperty("--relio-gold",        t.gold);
      r.style.setProperty("--relio-bg",           t.bg);
      r.style.setProperty("--relio-gold-light",   t.id === "dark" ? "#2A2520" : t.bg);

      if (t.id === "dark") {
        r.style.setProperty("--relio-bg-card",    "#2A2520");
        r.style.setProperty("--relio-text",       "#F5F0EA");
        r.style.setProperty("--relio-text-mid",   "#C0A888");
        r.style.setProperty("--relio-border",     "#3A3228");
      } else {
        r.style.setProperty("--relio-bg-card",    "#FFFFFF");
        r.style.setProperty("--relio-text",       "#1A1612");
        r.style.setProperty("--relio-text-mid",   "#6B5F53");
        r.style.setProperty("--relio-border",     "#E8DDD0");
      }
    } catch {
      // localStorage unavailable (private browsing, etc.) — use defaults
    }
  }, []); // runs once on mount, before first paint

  return null; // renders nothing
}
