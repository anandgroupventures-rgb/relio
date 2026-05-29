import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, getAuthInstance, getDbInstance } from "./config";

// ─── Sign Up ──────────────────────────────────────────────────────────────────
export async function signUp(email, password, displayName) {
  const realAuth = getAuthInstance();
  const realDb = getDbInstance();
  if (!realAuth || !realDb) throw new Error("Firebase not configured");
  const cred = await createUserWithEmailAndPassword(realAuth, email, password);
  await updateProfile(cred.user, { displayName });

  // Create user profile in Firestore
  await setDoc(doc(realDb, "users", cred.user.uid, "profile", "info"), {
    displayName,
    email,
    createdAt: serverTimestamp(),
    plan: "free",
  });

  return cred.user;
}

// ─── Sign In ──────────────────────────────────────────────────────────────────
export async function signIn(email, password) {
  const realAuth = getAuthInstance();
  if (!realAuth) throw new Error("Firebase not configured");
  const cred = await signInWithEmailAndPassword(realAuth, email, password);
  return cred.user;
}

// ─── Sign Out ─────────────────────────────────────────────────────────────────
export async function logOut() {
  const realAuth = getAuthInstance();
  if (!realAuth) throw new Error("Firebase not configured");
  await signOut(realAuth);
}

// ─── Password Reset ───────────────────────────────────────────────────────────
export async function resetPassword(email) {
  const realAuth = getAuthInstance();
  if (!realAuth) throw new Error("Firebase not configured");
  await sendPasswordResetEmail(realAuth, email);
}

// ─── Auth State Observer ──────────────────────────────────────────────────────
export function onAuth(callback) {
  const realAuth = getAuthInstance();
  if (!realAuth) {
    console.warn("Firebase Auth not configured. User will remain logged out.");
    callback(null);
    return () => {};
  }
  try {
    return onAuthStateChanged(realAuth, callback);
  } catch (err) {
    console.error("[onAuth] Failed to subscribe to auth state:", err);
    callback(null);
    return () => {};
  }
}

// ─── Get User Profile ─────────────────────────────────────────────────────────
export async function getUserProfile(uid) {
  const realDb = getDbInstance();
  if (!realDb) throw new Error("Firebase not configured");
  const snap = await getDoc(doc(realDb, "users", uid, "profile", "info"));
  return snap.exists() ? snap.data() : null;
}
