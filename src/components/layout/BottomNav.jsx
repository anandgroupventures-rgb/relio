"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Building2, CalendarDays } from "lucide-react";
import styles from "./BottomNav.module.css";

const NAV = [
  { href: "/today",     icon: LayoutDashboard,  label: "Dashboard" },
  { href: "/leads",     icon: Users,            label: "Leads"     },
  { href: "/inventory", icon: Building2,        label: "Inventory" },
  { href: "/calendar",  icon: CalendarDays,     label: "Calendar"  },
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
            <span className={styles.iconWrap}>
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
            </span>
            <span className={styles.label}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
