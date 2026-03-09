import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, query, orderBy, serverTimestamp, writeBatch,
} from "firebase/firestore";
import { db } from "./config";

const invCol = (uid) => collection(db, "users", uid, "inventory");
const invDoc = (uid, id) => doc(db, "users", uid, "inventory", id);

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
  await updateDoc(invDoc(uid, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
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

// ─── Get All Inventory ────────────────────────────────────────────────────────
export async function getInventory(uid) {
  const snap = await getDocs(
    query(invCol(uid), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Bulk Delete ──────────────────────────────────────────────────────────────
export async function bulkDeleteInventory(uid, ids) {
  const batch = writeBatch(db);
  ids.forEach((id) => batch.delete(invDoc(uid, id)));
  await batch.commit();
}
