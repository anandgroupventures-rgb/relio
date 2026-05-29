"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { getInventoryItem } from "@/lib/firebase/inventory";
import { AVAILABILITY } from "@/lib/utils/constants";
import { stalenessLevel } from "@/lib/utils/dateHelpers";
import {
  ArrowLeft, Phone, MessageCircle, MapPin, Building2, Home,
  Banknote, Contact, FileText, Ruler, Layers, Calendar, Compass,
  Car, Sofa, Clock, Check, Tag
} from "lucide-react";
import styles from "./detail.module.css";

export default function InventoryDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const { user } = useAuth();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;
    async function load() {
      const data = await getInventoryItem(user.uid, id);
      setItem(data);
      setLoading(false);
    }
    load();
  }, [user, id]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="spinner spinner-large" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className={styles.page}>
        <div style={{ padding: 40, textAlign: "center" }}>
          <p>Property not found.</p>
          <button className="r-btn r-btn-primary" onClick={() => router.push("/inventory")} style={{ marginTop: 16 }}>Back to Inventory</button>
        </div>
      </div>
    );
  }

  const avail = AVAILABILITY.find(a => a.value === item.availability) || AVAILABILITY[0];
  const stale = stalenessLevel(item.lastOwnerContacted);

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <button className={styles.backBtn} onClick={() => router.push("/inventory")}>
              <ArrowLeft size={22} color="var(--r-primary)" />
            </button>
            <h1 className="text-headline-md" style={{ color: "var(--r-primary)" }}>Property</h1>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {/* Profile Card */}
        <section className={`r-card ${styles.profileCard}`}>
          <div className={styles.profileTop}>
            <div className={styles.profileAvatar}><Building2 size={28} /></div>
            <div className={styles.profileInfo}>
              <h2 className="text-headline-md" style={{ color: "var(--r-primary)" }}>{item.projectName}</h2>
              <p className="text-body-md" style={{ color: "var(--r-on-surface-variant)", display: "flex", alignItems: "center", gap: 4 }}>
                <MapPin size={14} /> {item.area || "Location not set"}
              </p>
            </div>
          </div>
          <div className={styles.profileBadges}>
            <span className="r-badge" style={{ background: avail.bg, color: avail.color }}>{avail.label}</span>
            {item.type && <span className="r-badge" style={{ background: "var(--r-primary-fixed)", color: "var(--r-on-primary-fixed)" }}>{item.type}</span>}
            {item.bhk && <span className="r-badge" style={{ background: "var(--r-secondary-fixed)", color: "var(--r-on-secondary-fixed)" }}>{item.bhk}</span>}
          </div>
          <div className={styles.actionBar}>
            <button className={`r-btn r-btn-primary ${styles.actionBtn}`} onClick={() => window.open(`tel:${item.ownerMobile}`, "_self")}>
              <Phone size={18} /> Call Owner
            </button>
            <button className={styles.waBtn} onClick={() => window.open(`https://wa.me/91${item.ownerMobile?.replace(/\D/g, "")}`, "_blank")}>
              <MessageCircle size={18} /> WhatsApp
            </button>
          </div>
        </section>

        {/* Quick Stats */}
        <div className={styles.quickStats}>
          <div className={`r-card ${styles.statItem}`}>
            <p className="text-label-md" style={{ color: "var(--r-outline)", marginBottom: 4 }}>Price</p>
            <p className="text-headline-md" style={{ color: "var(--r-primary)" }}>{item.price || "—"}</p>
          </div>
          <div className={`r-card ${styles.statItem}`}>
            <p className="text-label-md" style={{ color: "var(--r-outline)", marginBottom: 4 }}>Size</p>
            <p className="text-headline-md" style={{ color: "var(--r-primary)" }}>{item.size ? `${item.size} sqft` : "—"}</p>
          </div>
          <div className={`r-card ${styles.statItem}`}>
            <p className="text-label-md" style={{ color: "var(--r-outline)", marginBottom: 4 }}>Per sqft</p>
            <p className="text-headline-md" style={{ color: "var(--r-primary)" }}>{item.pricePerSqft || "—"}</p>
          </div>
          <div className={`r-card ${styles.statItem}`}>
            <p className="text-label-md" style={{ color: "var(--r-outline)", marginBottom: 4 }}>Maintenance</p>
            <p className="text-headline-md" style={{ color: "var(--r-primary)" }}>{item.maintenance || "—"}</p>
          </div>
        </div>

        {/* Property Details */}
        <section className={`r-card ${styles.detailsCard}`}>
          <h3 className="text-headline-md" style={{ marginBottom: 16 }}>Property Details</h3>
          <div className={styles.detailsGrid}>
            <DetailItem icon={<Home size={16} />} label="Configuration" value={item.bhk || "—"} />
            <DetailItem icon={<Ruler size={16} />} label="Size" value={item.size ? `${item.size} sqft` : "—"} />
            <DetailItem icon={<Layers size={16} />} label="Unit / Floor" value={item.unit || "—"} />
            <DetailItem icon={<Tag size={16} />} label="Floor" value={item.floorNumber ? `${item.floorNumber} of ${item.totalFloors || "?"}` : "—"} />
            <DetailItem icon={<Sofa size={16} />} label="Furnishing" value={item.furnishing || "—"} />
            <DetailItem icon={<Car size={16} />} label="Parking" value={item.parking || "—"} />
            <DetailItem icon={<Compass size={16} />} label="Facing" value={item.facing || "—"} />
            <DetailItem icon={<Clock size={16} />} label="Property Age" value={item.propertyAge || "—"} />
            <DetailItem icon={<Calendar size={16} />} label="Possession" value={item.possessionDate || "—"} />
            <DetailItem icon={<Banknote size={16} />} label="Price per sqft" value={item.pricePerSqft || "—"} />
            <DetailItem icon={<FileText size={16} />} label="RERA" value={item.reraNumber || "—"} />
            <DetailItem icon={<Building2 size={16} />} label="Builder" value={item.builderName || "—"} />
          </div>
        </section>

        {/* Owner Info */}
        <section className={`r-card ${styles.detailsCard}`}>
          <h3 className="text-headline-md" style={{ marginBottom: 16 }}>Owner Info</h3>
          <div className={styles.detailsGrid}>
            <DetailItem icon={<Contact size={16} />} label="Name" value={item.ownerName || "—"} />
            <DetailItem icon={<Phone size={16} />} label="Mobile" value={item.ownerMobile ? `+91 ${item.ownerMobile}` : "—"} />
            <DetailItem icon={<Check size={16} />} label="Last Contacted" value={stale.label || "—"} />
          </div>
        </section>

        {/* Remarks */}
        {item.remarks && (
          <section className={`r-card ${styles.detailsCard}`}>
            <h3 className="text-headline-md" style={{ marginBottom: 12 }}>Remarks</h3>
            <p className="text-body-md" style={{ color: "var(--r-on-surface-variant)", lineHeight: 1.6 }}>{item.remarks}</p>
          </section>
        )}
      </main>
    </div>
  );
}

function DetailItem({ icon, label, value }) {
  return (
    <div className={styles.detailItem}>
      <span style={{ color: "var(--r-secondary-container)", flexShrink: 0 }}>{icon}</span>
      <div>
        <p className="text-label-md" style={{ color: "var(--r-on-surface-variant)" }}>{label}</p>
        <p className="text-body-md" style={{ fontWeight: 600 }}>{value}</p>
      </div>
    </div>
  );
}
