"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./BottomNav.module.css";

const NAV = [
  { href: "/today",     icon: "☀️",  label: "Today"     },
  { href: "/leads",     icon: "👤",  label: "Leads"     },
  { href: "/inventory", icon: "🏠",  label: "Inventory" },
  { href: "/calendar",  icon: "📅",  label: "Calendar"  },
  { href: "/settings",  icon: "⚙️",  label: "Settings"  },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className={styles.nav}>
      {NAV.map(({ href, icon, label }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link key={href} href={href}
            className={`${styles.item} ${active ? styles.active : ""}`}>
            <span className={styles.icon}>{icon}</span>
            <span className={styles.label}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
