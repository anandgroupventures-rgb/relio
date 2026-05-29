import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, orderBy, serverTimestamp, writeBatch,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getDbInstance, getStorageInstance } from "./config";

function getDb() {
  const db = getDbInstance();
  if (!db) throw new Error("Firebase not configured");
  return db;
}

// Firestore path: users/{uid}/leads/{leadId}
const leadsCol = (uid) => collection(getDb(), "users", uid, "leads");
const leadDoc  = (uid, id) => doc(getDb(), "users", uid, "leads", id);

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
    getDb(), "users", uid, "leads", leadId, "interactions"
  );
  await addDoc(interactionsCol, {
    ...interaction,
    createdAt: serverTimestamp(),
  });
  // Also update lead's updatedAt and lastContactedAt for calls/WhatsApp
  const leadUpdates = { updatedAt: serverTimestamp() };
  if (interaction.type === "call" || interaction.type === "whatsapp" || interaction.type === "visit" || interaction.type === "visit_scheduled") {
    leadUpdates.lastContactedAt = serverTimestamp();
  }
  await updateDoc(leadDoc(uid, leadId), leadUpdates);
}

// ─── Get Lead Interactions ────────────────────────────────────────────────────
export async function getInteractions(uid, leadId) {
  const snap = await getDocs(
    query(
      collection(getDb(), "users", uid, "leads", leadId, "interactions"),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Archive Lead ─────────────────────────────────────────────────────────────
export async function archiveLead(uid, id) {
  await updateDoc(leadDoc(uid, id), {
    isArchived: true,
    archivedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// ─── Bulk Delete ──────────────────────────────────────────────────────────────
export async function bulkDeleteLeads(uid, ids) {
  const batch = writeBatch(getDb());
  ids.forEach((id) => batch.delete(leadDoc(uid, id)));
  await batch.commit();
}

// ─── Bulk Archive ─────────────────────────────────────────────────────────────
export async function bulkArchiveLeads(uid, ids) {
  const batch = writeBatch(getDb());
  ids.forEach((id) => {
    batch.update(leadDoc(uid, id), {
      isArchived: true,
      archivedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

// ─── Upload Voice Note to Storage ─────────────────────────────────────────────
export async function uploadVoiceNote(uid, leadId, blob) {
  const storage = getStorageInstance();
  if (!storage) throw new Error("Firebase Storage not configured");
  const path = `users/${uid}/leads/${leadId}/voiceNotes/${Date.now()}.webm`;
  const sRef = ref(storage, path);
  await uploadBytes(sRef, blob, { contentType: "audio/webm" });
  const url = await getDownloadURL(sRef);
  return { url, path };
}

// ─── Upload Document to Storage ───────────────────────────────────────────────
export async function uploadDocument(uid, leadId, file) {
  const storage = getStorageInstance();
  if (!storage) throw new Error("Firebase Storage not configured");
  const path = `users/${uid}/leads/${leadId}/documents/${Date.now()}_${file.name}`;
  const sRef = ref(storage, path);
  await uploadBytes(sRef, file, { contentType: file.type });
  const url = await getDownloadURL(sRef);
  return { url, path, name: file.name, type: file.type, size: file.size };
}
