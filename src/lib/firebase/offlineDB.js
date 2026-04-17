import Dexie from 'dexie';

// Define the database schema for offline-first architecture
class RelioDatabase extends Dexie {
  constructor() {
    super('RelioDB');
    
    this.version(1).stores({
      leads: 'id, uid, syncStatus, localUpdatedAt, status, temperature, followUpDate',
      syncQueue: '++id, uid, timestamp, action',
      interactions: 'id, leadId, uid, syncStatus, localUpdatedAt, createdAt',
      inventory: 'id, uid, syncStatus, localUpdatedAt'
    });
  }
}

export const db = new RelioDatabase();

// Network status tracking
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
const onlineListeners = new Set();

export function initNetworkTracking() {
  if (typeof window === 'undefined') return;

  window.addEventListener('online', () => {
    isOnline = true;
    onlineListeners.forEach(cb => cb(true));
    // Trigger sync when coming back online
    syncPendingChanges();
  });

  window.addEventListener('offline', () => {
    isOnline = false;
    onlineListeners.forEach(cb => cb(false));
  });
}

export function getNetworkStatus() {
  return isOnline;
}

export function subscribeToNetworkChanges(callback) {
  onlineListeners.add(callback);
  return () => onlineListeners.delete(callback);
}

// Sync pending changes to Firebase
export async function syncPendingChanges() {
  if (!isOnline) return;

  const pendingItems = await db.syncQueue
    .orderBy('timestamp')
    .toArray();

  for (const item of pendingItems) {
    try {
      await processSyncItem(item);
      await db.syncQueue.delete(item.id);
    } catch (error) {
      console.error('Sync failed for item:', item, error);
      await db.syncQueue.update(item.id, {
        retryCount: (item.retryCount || 0) + 1,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

async function processSyncItem(item) {
  // Dynamic import to avoid circular dependencies
  const { addLead, updateLead, deleteLead } = await import('./leads');
  const { addInteraction } = await import('./leads');

  switch (item.action) {
    case 'create':
      if (item.collection === 'leads') {
        await addLead(item.uid, item.data);
      } else if (item.collection === 'interactions') {
        await addInteraction(item.uid, item.docId, item.data);
      }
      break;
    case 'update':
      if (item.collection === 'leads') {
        await updateLead(item.uid, item.docId, item.data);
      }
      break;
    case 'delete':
      if (item.collection === 'leads') {
        await deleteLead(item.uid, item.docId);
      }
      break;
  }
}

// Queue a change for sync
export async function queueForSync(uid, action, collection, docId, data) {
  await db.syncQueue.add({
    uid,
    action,
    collection,
    docId,
    data,
    timestamp: new Date(),
    retryCount: 0
  });

  // Try to sync immediately if online
  if (isOnline) {
    syncPendingChanges();
  }
}

// Local CRUD operations for leads
export const localLeads = {
  async getAll(uid) {
    const leads = await db.leads
      .where('uid')
      .equals(uid)
      .reverse()
      .sortBy('localUpdatedAt');
    return leads || [];
  },

  async getById(id) {
    return await db.leads.get(id);
  },

  async add(uid, data) {
    const id = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    
    await db.leads.add({
      ...data,
      id,
      uid,
      syncStatus: 'pending',
      localUpdatedAt: now,
      version: 1
    });

    await queueForSync(uid, 'create', 'leads', id, data);
    return id;
  },

  async update(id, uid, data) {
    const existing = await db.leads.get(id);
    if (!existing) throw new Error('Lead not found');

    const now = new Date();
    
    await db.leads.update(id, {
      ...data,
      syncStatus: 'pending',
      localUpdatedAt: now,
      version: (existing.version || 0) + 1
    });

    await queueForSync(uid, 'update', 'leads', id, data);
  },

  async delete(id, uid) {
    await db.leads.delete(id);
    await queueForSync(uid, 'delete', 'leads', id);
  },

  async markAsSynced(id, serverData) {
    await db.leads.update(id, {
      syncStatus: 'synced',
      serverUpdatedAt: new Date(),
      ...(serverData || {})
    });
  },

  async search(uid, query) {
    const lowerQuery = query.toLowerCase();
    const allLeads = await db.leads.where('uid').equals(uid).toArray();
    
    return allLeads.filter(lead => 
      lead.name?.toLowerCase().includes(lowerQuery) ||
      lead.mobile?.includes(query) ||
      (lead.projectInterest && lead.projectInterest.toLowerCase().includes(lowerQuery))
    );
  },

  async getByStatus(uid, status) {
    return await db.leads
      .where({ uid, status })
      .toArray();
  },

  async getByTemperature(uid, temp) {
    return await db.leads
      .where({ uid, temperature: temp })
      .toArray();
  },

  async getOverdueFollowups(uid) {
    const today = new Date().toISOString().split('T')[0];
    const allLeads = await db.leads.where('uid').equals(uid).toArray();
    
    return allLeads.filter(lead => 
      lead.followUpDate && 
      lead.followUpDate < today && 
      lead.status !== 'converted' && 
      lead.status !== 'lost'
    );
  },

  async getTodaysFollowups(uid) {
    const today = new Date().toISOString().split('T')[0];
    return await db.leads
      .where('uid')
      .equals(uid)
      .filter(lead => lead.followUpDate === today)
      .toArray();
  },

  async getByDateRange(uid, startDate, endDate) {
    const allLeads = await db.leads.where('uid').equals(uid).toArray();
    
    return allLeads.filter(lead => 
      lead.followUpDate && 
      lead.followUpDate >= startDate && 
      lead.followUpDate <= endDate
    );
  },

  async getActive(uid) {
    const allLeads = await db.leads.where('uid').equals(uid).toArray();
    return allLeads.filter(lead => !lead.isArchived);
  },

  async getArchived(uid) {
    const allLeads = await db.leads.where('uid').equals(uid).toArray();
    return allLeads.filter(lead => lead.isArchived);
  },

  async archive(uid, id, reason, notes = "") {
    const existing = await db.leads.get(id);
    if (!existing) throw new Error('Lead not found');

    await db.leads.update(id, {
      isArchived: true,
      archivedAt: new Date().toISOString(),
      archiveReason: reason,
      archiveNotes: notes,
      stage: 'disqualified',
      syncStatus: 'pending',
      localUpdatedAt: new Date(),
      version: (existing.version || 0) + 1
    });

    await queueForSync(uid, 'update', 'leads', id, { 
      isArchived: true, 
      archiveReason: reason,
      archiveNotes: notes 
    });
  },

  async restore(uid, id) {
    const existing = await db.leads.get(id);
    if (!existing) throw new Error('Lead not found');

    await db.leads.update(id, {
      isArchived: false,
      archivedAt: null,
      archiveReason: null,
      archiveNotes: null,
      stage: 'new',
      syncStatus: 'pending',
      localUpdatedAt: new Date(),
      version: (existing.version || 0) + 1
    });

    await queueForSync(uid, 'update', 'leads', id, { 
      isArchived: false,
      stage: 'new'
    });
  },

  async getInactiveLeads(uid, daysThreshold = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);
    const cutoffStr = cutoffDate.toISOString();

    const allLeads = await db.leads.where('uid').equals(uid).toArray();
    
    return allLeads.filter(lead => {
      // Don't archive if already archived
      if (lead.isArchived) return false;
      
      // Don't archive closed deals
      if (lead.stage === 'booked' || lead.stage === 'closed_won') return false;
      
      // Don't archive scheduled visits
      if (lead.stage === 'visit_scheduled') return false;
      
      // Don't archive hot leads
      if (lead.score && lead.score >= 75) return false;
      
      // Check last activity
      const lastActivity = lead.lastContactDate || lead.updatedAt || lead.createdAt;
      return lastActivity && lastActivity < cutoffStr;
    });
  }
};

// Local operations for interactions
export const localInteractions = {
  async getByLeadId(uid, leadId) {
    return await db.interactions
      .where({ uid, leadId })
      .reverse()
      .sortBy('localUpdatedAt');
  },

  async add(uid, leadId, data) {
    const id = `local_int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    
    await db.interactions.add({
      ...data,
      id,
      leadId,
      uid,
      syncStatus: 'pending',
      localUpdatedAt: now
    });

    await queueForSync(uid, 'create', 'interactions', leadId, data);
    return id;
  }
};

// Sync from Firebase to local (initial load)
export async function syncFromFirebase(uid, firebaseLeads) {
  for (const lead of firebaseLeads) {
    const localLead = await db.leads.get(lead.id);
    
    if (!localLead) {
      // Lead exists on server but not locally - add it
      await db.leads.add({
        ...lead,
        uid,
        syncStatus: 'synced',
        localUpdatedAt: new Date(),
        serverUpdatedAt: new Date(),
        version: 1
      });
    } else if (localLead.syncStatus === 'synced') {
      // Both synced - use server version
      await db.leads.update(lead.id, {
        ...lead,
        serverUpdatedAt: new Date()
      });
    }
    // If local is pending, don't overwrite - let it sync up
  }
}

// Initialize the database
export async function initOfflineDatabase(uid) {
  initNetworkTracking();
  
  // Try to sync any pending changes on init
  if (getNetworkStatus()) {
    syncPendingChanges();
  }
  
  // Run auto-archive check
  await autoArchiveInactiveLeads(uid);
}

// Auto-archive inactive leads (runs periodically)
export async function autoArchiveInactiveLeads(uid, daysThreshold = 90) {
  const inactiveLeads = await localLeads.getInactiveLeads(uid, daysThreshold);
  
  for (const lead of inactiveLeads) {
    try {
      await localLeads.archive(uid, lead.id, 'inactive', 'Auto-archived after 90 days of inactivity');
      console.log(`[AutoArchive] Archived lead ${lead.name} (${lead.id})`);
    } catch (err) {
      console.error(`[AutoArchive] Failed to archive lead ${lead.id}:`, err);
    }
  }
  
  return inactiveLeads.length;
}

// Get sync status summary
export async function getSyncStatus(uid) {
  const pendingCount = await db.syncQueue.where('uid').equals(uid).count();
  const pendingLeads = await db.leads.where({ uid, syncStatus: 'pending' }).count();
  const conflictLeads = await db.leads.where({ uid, syncStatus: 'conflict' }).count();
  
  return {
    pendingChanges: pendingCount,
    pendingLeads,
    conflictLeads,
    isOnline
  };
}
