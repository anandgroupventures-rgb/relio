import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId:     process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let _app;
let _auth;
let _db;
let _storage;
let _messaging;

let _initFailed = false;

function initFirebase() {
  if (typeof window === "undefined") return;
  if (_initFailed) return;
  if (!_app) {
    try {
      const cfg = Object.fromEntries(
        Object.entries(firebaseConfig).filter(([, v]) => !!v)
      );
      if (!cfg.apiKey) {
        console.warn("Firebase not configured: NEXT_PUBLIC_FIREBASE_API_KEY is missing. Set it in .env.local");
        _initFailed = true;
        return;
      }
      _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
      try {
        _auth = getAuth(_app);
      } catch (e) {
        console.error("Firebase Auth init failed:", e);
      }
      try {
        _db = getFirestore(_app);
      } catch (e) {
        console.error("Firebase Firestore init failed:", e);
      }
      try {
        _storage = getStorage(_app);
      } catch (e) {
        console.error("Firebase Storage init failed:", e);
      }
      try {
        if (typeof window !== "undefined") {
          isSupported().then(supported => {
            if (supported) {
              _messaging = getMessaging(_app);
            }
          }).catch(() => {});
        }
      } catch (e) {
        console.error("Firebase Messaging init failed:", e);
      }
      if (!_auth && !_db) {
        _initFailed = true;
        console.warn("Firebase fully failed to initialize. App will run in offline/demo mode.");
      }
    } catch (e) {
      _initFailed = true;
      console.error("Firebase init error:", e);
    }
  }
}

export function getAuthInstance() {
  initFirebase();
  return _auth;
}

export function getDbInstance() {
  initFirebase();
  return _db;
}

export function getStorageInstance() {
  initFirebase();
  return _storage;
}

// Lazy Proxy exports for backward compatibility
function createLazyDb() {
  return new Proxy({}, {
    get(_, prop) {
      initFirebase();
      if (!_db) return () => Promise.reject(new Error("Firebase not configured"));
      return _db[prop];
    }
  });
}

function createLazyAuth() {
  return new Proxy({}, {
    get(_, prop) {
      initFirebase();
      if (!_auth) {
        if (prop === "currentUser") return null;
        return () => Promise.reject(new Error("Firebase not configured"));
      }
      return _auth[prop];
    }
  });
}

function createLazyStorage() {
  return new Proxy({}, {
    get(_, prop) {
      initFirebase();
      if (!_storage) return () => Promise.reject(new Error("Firebase not configured"));
      return _storage[prop];
    }
  });
}

export const db = createLazyDb();
export const auth = createLazyAuth();
export const storage = createLazyStorage();

export function getMessagingInstance() {
  initFirebase();
  return _messaging;
}

// ─── FCM Push Notification Helpers ─────────────────────────────────────────────
export async function requestFCMToken() {
  const messaging = getMessagingInstance();
  if (!messaging) return null;
  try {
    const currentToken = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });
    return currentToken || null;
  } catch (err) {
    console.error("[FCM] Failed to get token:", err);
    return null;
  }
}

export function onForegroundMessage(callback) {
  const messaging = getMessagingInstance();
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    console.log("[FCM] Foreground message received:", payload);
    callback(payload);
  });
}

export default function getFirebaseApp() {
  initFirebase();
  return _app;
}
