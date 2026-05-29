"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { logOut } from "@/lib/firebase/auth";
import {
  BarChart3, Wallet, Settings, LogOut, X, User, ChevronRight
} from "lucide-react";
import styles from "./NavMenu.module.css";

export default function NavMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  // Lock body scroll when menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function handleLogout() {
    logOut().then(() => {
      router.replace("/login");
    });
  }

  const initials = (user?.displayName?.[0] || "U").toUpperCase();
  const firstName = user?.displayName?.split(" ")[0] || "User";

  const MENU_ITEMS = [
    { icon: <BarChart3 size={20} />, label: "Reports",       href: "/stats",     color: "var(--r-primary)" },
    { icon: <Wallet size={20} />,     label: "Commission",   href: "/deals",     color: "var(--r-secondary)" },
    { icon: <Settings size={20} />,  label: "Settings",     href: "/settings",  color: "var(--r-on-surface-variant)" },
  ];

  return (
    <>
      {/* Hamburger Button */}
      <button
        className={styles.hamburgerBtn}
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <div className={styles.hamburgerLines}>
          <span />
          <span />
          <span />
        </div>
      </button>

      {/* Backdrop */}
      {open && (
        <div className={styles.backdrop} onClick={() => setOpen(false)} />
      )}

      {/* Slide-in Drawer */}
      <div className={`${styles.drawer} ${open ? styles.drawerOpen : ""}`}>
        {/* Drawer Header */}
        <div className={styles.drawerHeader}>
          <div className={styles.profileSection}>
            <div className={styles.profileAvatar}>{initials}</div>
            <div className={styles.profileInfo}>
              <p className="text-body-lg" style={{ fontWeight: 700, color: "var(--r-primary)" }}>{firstName}</p>
              <p className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>{user?.email || ""}</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={22} />
          </button>
        </div>

        {/* Menu Items */}
        <div className={styles.menuList}>
          {MENU_ITEMS.map(item => (
            <button
              key={item.label}
              className={styles.menuItem}
              onClick={() => { setOpen(false); router.push(item.href); }}
            >
              <span className={styles.menuIcon} style={{ color: item.color }}>{item.icon}</span>
              <span className="text-body-md" style={{ fontWeight: 600 }}>{item.label}</span>
              <ChevronRight size={16} color="var(--r-outline)" style={{ marginLeft: "auto" }} />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className={styles.drawerFooter}>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <LogOut size={18} />
            <span className="text-body-md" style={{ fontWeight: 600 }}>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
}
