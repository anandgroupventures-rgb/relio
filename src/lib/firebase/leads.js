import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, orderBy, serverTimestamp, writeBatch,
} from "firebase/firestore";
import { db } from "./config";

// Firestore path: users/{uid}/leads/{leadId}
const leadsCol = (uid) => collection(db, "users", uid, "leads");
const leadDoc  = (uid, id) => doc(db, "users", uid, "leads", id);

// ─── Add Lead ─────────────────────────────────────────────────────────────────
export async function addLead(uid, data) {
  const ref = await addDoc(leadsCol(uid), {
    ...data,
    createdAt:   serverTimestamp(),
    updatedAt:   serverTimestamp(),
    temperature: "warm",
  });
  return ref.id;
}

// ─── Update Lead ──────────────────────────────────────────────────────────────
export async function updateLead(uid, id, data) {
  await updateDoc(leadDoc(uid, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// ─── Delete Lead ──────────────────────────────────────────────────────────────
export async function deleteLead(uid, id) {
  await deleteDoc(leadDoc(uid, id));
}

// ─── Get All Leads ────────────────────────────────────────────────────────────
export async function getLeads(uid) {
  const snap = await getDocs(
    query(leadsCol(uid), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Get Single Lead ──────────────────────────────────────────────────────────
export async function getLead(uid, id) {
  const snap = await getDoc(leadDoc(uid, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ─── Add Interaction to Lead Timeline ────────────────────────────────────────
export async function addInteraction(uid, leadId, interaction) {
  const interactionsCol = collection(
    db, "users", uid, "leads", leadId, "interactions"
  );
  await addDoc(interactionsCol, {
    ...interaction,
    createdAt: serverTimestamp(),
  });
  // Also update lead's updatedAt
  await updateDoc(leadDoc(uid, leadId), { updatedAt: serverTimestamp() });
}

// ─── Get Lead Interactions ────────────────────────────────────────────────────
export async function getInteractions(uid, leadId) {
  const snap = await getDocs(
    query(
      collection(db, "users", uid, "leads", leadId, "interactions"),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Bulk Delete ──────────────────────────────────────────────────────────────
export async function bulkDeleteLeads(uid, ids) {
  const batch = writeBatch(db);
  ids.forEach((id) => batch.delete(leadDoc(uid, id)));
  await batch.commit();
}
