"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, Users, Home, Calendar, Settings } from "lucide-react";
import styles from "./BottomNav.module.css";

const NAV = [
  { href: "/today",     icon: Sun,      label: "Today"     },
  { href: "/leads",     icon: Users,    label: "Leads"     },
  { href: "/inventory", icon: Home,     label: "Inventory" },
  { href: "/calendar",  icon: Calendar, label: "Calendar"  },
  { href: "/settings",  icon: Settings, label: "Settings"  },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className={styles.nav}>
      {NAV.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link key={href} href={href}
            className={`${styles.item} ${active ? styles.active : ""}`}>
            {/* Active indicator bar at top */}
            <span className={`${styles.indicator} ${active ? styles.indicatorVisible : ""}`} />
            <span className={styles.icon}>
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
            </span>
            <span className={styles.label}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
