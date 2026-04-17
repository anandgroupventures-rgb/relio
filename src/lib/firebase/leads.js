import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, orderBy, serverTimestamp, writeBatch,
} from "firebase/firestore";
import { db } from "./config";
import { localLeads, localInteractions, getNetworkStatus } from "./offlineDB";

// Firestore path: users/{uid}/leads/{leadId}
const leadsCol = (uid) => collection(db, "users", uid, "leads");
const leadDoc  = (uid, id) => doc(db, "users", uid, "leads", id);

// ─── Add Lead ─────────────────────────────────────────────────────────────────
export async function addLead(uid, data) {
  // Always save locally first (offline-first)
  const localId = await localLeads.add(uid, data);
  
  // If online, sync to Firebase
  if (getNetworkStatus()) {
    try {
      const ref = await addDoc(leadsCol(uid), {
        ...data,
        createdAt:   serverTimestamp(),
        updatedAt:   serverTimestamp(),
        temperature: data.temperature || "warm",
      });
      
      // Update local record with server ID and mark as synced
      await localLeads.markAsSynced(localId, { id: ref.id });
      
      return ref.id;
    } catch (err) {
      console.error("Failed to sync lead to server:", err);
      // Return local ID - will sync later when online
      return localId;
    }
  }
  
  return localId;
}

// ─── Update Lead ──────────────────────────────────────────────────────────────
export async function updateLead(uid, id, data) {
  // Update locally first
  await localLeads.update(id, uid, data);
  
  // If online, sync to Firebase
  if (getNetworkStatus()) {
    try {
      await updateDoc(leadDoc(uid, id), {
        ...data,
        updatedAt: serverTimestamp(),
      });
      
      // Mark as synced
      await localLeads.markAsSynced(id);
    } catch (err) {
      console.error("Failed to sync lead update to server:", err);
      // Local is already updated, will sync later
    }
  }
}

// ─── Delete Lead ──────────────────────────────────────────────────────────────
export async function deleteLead(uid, id) {
  // Delete locally first
  await localLeads.delete(id, uid);
  
  // If online, sync to Firebase
  if (getNetworkStatus()) {
    try {
      await deleteDoc(leadDoc(uid, id));
    } catch (err) {
      console.error("Failed to delete lead from server:", err);
      // Already queued for deletion locally
    }
  }
}

// ─── Get All Leads ────────────────────────────────────────────────────────────
export async function getLeads(uid) {
  // Always return local data first (fast, works offline)
  const localData = await localLeads.getAll(uid);
  
  if (localData.length > 0) {
    return localData;
  }
  
  // If no local data and online, fetch from Firebase
  if (getNetworkStatus()) {
    try {
      const snap = await getDocs(
        query(leadsCol(uid), orderBy("createdAt", "desc"))
      );
      const leads = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      
      // Sync to local for next time
      const { syncFromFirebase } = await import("./offlineDB");
      await syncFromFirebase(uid, leads);
      
      return leads;
    } catch (err) {
      console.error("Failed to fetch leads from server:", err);
      return [];
    }
  }
  
  return [];
}

// ─── Get Single Lead ──────────────────────────────────────────────────────────
export async function getLead(uid, id) {
  // Try local first
  const localLead = await localLeads.getById(id);
  if (localLead) {
    return localLead;
  }
  
  // If online, try Firebase
  if (getNetworkStatus()) {
    try {
      const snap = await getDoc(leadDoc(uid, id));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
      }
    } catch (err) {
      console.error("Failed to fetch lead from server:", err);
    }
  }
  
  return null;
}

// ─── Add Interaction to Lead Timeline ────────────────────────────────────────
export async function addInteraction(uid, leadId, interaction) {
  // Save locally first
  await localInteractions.add(uid, leadId, interaction);
  
  // If online, sync to Firebase
  if (getNetworkStatus()) {
    try {
      const interactionsCol = collection(
        db, "users", uid, "leads", leadId, "interactions"
      );
      await addDoc(interactionsCol, {
        ...interaction,
        createdAt: serverTimestamp(),
      });
      // Also update lead's updatedAt
      await updateDoc(leadDoc(uid, leadId), { updatedAt: serverTimestamp() });
    } catch (err) {
      console.error("Failed to sync interaction to server:", err);
    }
  }
}

// ─── Get Lead Interactions ────────────────────────────────────────────────────
export async function getInteractions(uid, leadId) {
  // Try local first
  const localInteractions_data = await localInteractions.getByLeadId(uid, leadId);
  
  if (localInteractions_data.length > 0) {
    return localInteractions_data;
  }
  
  // If online, try Firebase
  if (getNetworkStatus()) {
    try {
      const snap = await getDocs(
        query(
          collection(db, "users", uid, "leads", leadId, "interactions"),
          orderBy("createdAt", "desc")
        )
      );
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.error("Failed to fetch interactions from server:", err);
    }
  }
  
  return [];
}

// ─── Bulk Delete ──────────────────────────────────────────────────────────────
export async function bulkDeleteLeads(uid, ids) {
  // Delete locally first
  for (const id of ids) {
    await localLeads.delete(id, uid);
  }
  
  // If online, sync to Firebase
  if (getNetworkStatus()) {
    try {
      const batch = writeBatch(db);
      ids.forEach((id) => batch.delete(leadDoc(uid, id)));
      await batch.commit();
    } catch (err) {
      console.error("Failed to bulk delete from server:", err);
    }
  }
}

// ─── Archive Lead ─────────────────────────────────────────────────────────────
export async function archiveLead(uid, id, archiveData) {
  // Update locally first
  const localLead = await localLeads.getById(id);
  if (!localLead) throw new Error("Lead not found");

  const archiveInfo = {
    isArchived: true,
    archivedAt: new Date().toISOString(),
    archiveReason: archiveData.reason,
    archiveNotes: archiveData.notes,
    stage: "disqualified",
    updatedAt: new Date().toISOString(),
  };

  await localLeads.update(id, uid, archiveInfo);

  // If online, sync to Firebase
  if (getNetworkStatus()) {
    try {
      await updateDoc(leadDoc(uid, id), {
        ...archiveInfo,
        updatedAt: serverTimestamp(),
      });
      await localLeads.markAsSynced(id);
    } catch (err) {
      console.error("Failed to archive lead on server:", err);
    }
  }
}

// ─── Restore Archived Lead ────────────────────────────────────────────────────
export async function restoreLead(uid, id) {
  const restoreInfo = {
    isArchived: false,
    archivedAt: null,
    archiveReason: null,
    archiveNotes: null,
    stage: "new",
    updatedAt: new Date().toISOString(),
  };

  await localLeads.update(id, uid, restoreInfo);

  if (getNetworkStatus()) {
    try {
      await updateDoc(leadDoc(uid, id), {
        ...restoreInfo,
        updatedAt: serverTimestamp(),
      });
      await localLeads.markAsSynced(id);
    } catch (err) {
      console.error("Failed to restore lead on server:", err);
    }
  }
}

// ─── Get Archived Leads ───────────────────────────────────────────────────────
export async function getArchivedLeads(uid) {
  const allLeads = await localLeads.getAll(uid);
  return allLeads.filter(lead => lead.isArchived);
}

// ─── Get Active Leads (non-archived) ──────────────────────────────────────────
export async function getActiveLeads(uid) {
  const allLeads = await localLeads.getAll(uid);
  return allLeads.filter(lead => !lead.isArchived);
}
