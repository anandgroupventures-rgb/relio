"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import BottomNav from "@/components/layout/BottomNav";
import ThemeLoader from "@/components/shared/ThemeLoader";
import styles from "./app-layout.module.css";

export default function AppLayout({ children }) {
  const { user, loading, error } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  // Global window error logging for debugging
  useEffect(() => {
    const handleError = (event) => {
      console.error("[Window Error]", event.error || event.message || event);
      if (event.error && typeof event.error === "object") {
        console.error("[Window Error] keys:", Object.keys(event.error));
        console.error("[Window Error] toString:", event.error.toString?.());
        console.error("[Window Error] message:", event.error.message);
        console.error("[Window Error] stack:", event.error.stack);
      }
    };
    const handleRejection = (event) => {
      console.error("[Unhandled Rejection]", event.reason);
    };
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingLogo}>R</div>
        <div className="spinner" style={{ marginTop: 24 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingLogo}>R</div>
        <p style={{ marginTop: 16, color: "var(--r-error)" }}>Auth initialization failed</p>
        <p style={{ marginTop: 8, fontSize: 12, color: "var(--r-outline)" }}>
          {error.message || String(error)}
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingLogo}>R</div>
        <p style={{ marginTop: 16 }}>Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      {/* ThemeLoader runs on every mount and restores the saved theme from
          localStorage — fixes theme resetting on session end */}
      <ThemeLoader />
      <main className={styles.main}>
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
