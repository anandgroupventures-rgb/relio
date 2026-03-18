"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import BottomNav from "@/components/layout/BottomNav";
import ThemeLoader from "@/components/shared/ThemeLoader";
import styles from "./app-layout.module.css";

export default function AppLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingLogo}>R</div>
        <div className="spinner" style={{ marginTop: 24 }} />
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
