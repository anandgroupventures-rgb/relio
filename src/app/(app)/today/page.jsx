"use client";
import { useAuth } from "@/lib/hooks/useAuth";
import { logOut } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";
import styles from "./today.module.css";

export default function TodayPage() {
  const { user } = useAuth();
  const router   = useRouter();

  const firstName = user?.displayName?.split(" ")[0] || "there";

  async function handleLogout() {
    await logOut();
    router.replace("/login");
  }

  return (
    <div className={styles.page}>

      {/* Header */}
      <header className={styles.header}>
        <div>
          <p className={styles.greeting}>Good morning,</p>
          <h1 className={styles.name}>{firstName} 👋</h1>
        </div>
        <button className={styles.avatarBtn} onClick={handleLogout} title="Sign out">
          {firstName[0].toUpperCase()}
        </button>
      </header>

      {/* Phase 0 status card */}
      <div className={styles.statusCard}>
        <div className={styles.statusIcon}>✅</div>
        <h2 className={styles.statusTitle}>Phase 0 Complete</h2>
        <p className={styles.statusBody}>
          Relio is live. Firebase connected. Auth working.
          Your data is private and secure.
        </p>
        <div className={styles.statusMeta}>
          <span>{user?.email}</span>
        </div>
      </div>

      {/* Coming soon cards */}
      <div className={styles.comingSoon}>
        <p className={styles.comingSoonLabel}>Building next in Phase 1 →</p>
        {[
          { icon:"☀️", title:"Today Screen",      desc:"Your daily agenda. Follow-ups. Alerts." },
          { icon:"👤", title:"Leads",              desc:"Fast capture. Timeline. Voice notes."   },
          { icon:"🏠", title:"Inventory",          desc:"Smart staleness. Owner contacts."       },
          { icon:"🔔", title:"Notifications",      desc:"Morning briefing. Never miss a follow-up." },
        ].map(({ icon, title, desc }) => (
          <div key={title} className={styles.comingCard}>
            <span className={styles.comingIcon}>{icon}</span>
            <div>
              <p className={styles.comingTitle}>{title}</p>
              <p className={styles.comingDesc}>{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
