import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDoc,
  getDocs, query, orderBy, serverTimestamp, writeBatch,
} from "firebase/firestore";
import { getDbInstance } from "./config";

function getDb() {
  const db = getDbInstance();
  if (!db) throw new Error("Firebase not configured");
  return db;
}

const invCol = (uid) => collection(getDb(), "users", uid, "inventory");
const invDoc = (uid, id) => doc(getDb(), "users", uid, "inventory", id);

// ─── Add Inventory ────────────────────────────────────────────────────────────
export async function addInventory(uid, data) {
  const ref = await addDoc(invCol(uid), {
    ...data,
    createdAt:          serverTimestamp(),
    updatedAt:          serverTimestamp(),
    lastOwnerContacted: serverTimestamp(),
    availability:       data.availability || "available",
  });
  return ref.id;
}

// ─── Update Inventory ─────────────────────────────────────────────────────────
export async function updateInventory(uid, id, data) {
  // Price history tracking: if price changed, append to history
  const updatePayload = { ...data, updatedAt: serverTimestamp() };
  if (data.pricePerSqft || data.totalPrice) {
    const current = await getDoc(invDoc(uid, id));
    if (current.exists()) {
      const currentData = current.data();
      const history = currentData.priceHistory || [];
      const oldPrice = currentData.pricePerSqft || currentData.totalPrice;
      const newPrice = data.pricePerSqft || data.totalPrice;
      if (oldPrice && newPrice && oldPrice !== newPrice) {
        updatePayload.priceHistory = [
          ...history,
          {
            price: oldPrice,
            pricePerSqft: currentData.pricePerSqft || null,
            totalPrice: currentData.totalPrice || null,
            date: new Date().toISOString().split("T")[0],
          },
        ];
      }
    }
  }
  await updateDoc(invDoc(uid, id), updatePayload);
}

// ─── Mark Owner Contacted Today ───────────────────────────────────────────────
export async function markOwnerContacted(uid, id) {
  await updateDoc(invDoc(uid, id), {
    lastOwnerContacted: serverTimestamp(),
    updatedAt:          serverTimestamp(),
  });
}

// ─── Delete Inventory ─────────────────────────────────────────────────────────
export async function deleteInventory(uid, id) {
  await deleteDoc(invDoc(uid, id));
}

// ─── Get Single Inventory Item ──────────────────────────────────────────────
export async function getInventoryItem(uid, id) {
  const snap = await getDoc(invDoc(uid, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ─── Get All Inventory ────────────────────────────────────────────────────────
export async function getInventory(uid) {
  const snap = await getDocs(
    query(invCol(uid), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Bulk Delete ──────────────────────────────────────────────────────────────
export async function bulkDeleteInventory(uid, ids) {
  const batch = writeBatch(getDb());
  ids.forEach((id) => batch.delete(invDoc(uid, id)));
  await batch.commit();
}
