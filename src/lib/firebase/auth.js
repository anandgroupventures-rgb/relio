import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./config";

// ─── Sign Up ──────────────────────────────────────────────────────────────────
export async function signUp(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });

  // Create user profile in Firestore
  await setDoc(doc(db, "users", cred.user.uid, "profile", "info"), {
    displayName,
    email,
    createdAt: serverTimestamp(),
    plan: "free",
  });

  return cred.user;
}

// ─── Sign In ──────────────────────────────────────────────────────────────────
export async function signIn(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

// ─── Sign Out ─────────────────────────────────────────────────────────────────
export async function logOut() {
  await signOut(auth);
}

// ─── Password Reset ───────────────────────────────────────────────────────────
export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

// ─── Auth State Observer ──────────────────────────────────────────────────────
export function onAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

// ─── Get User Profile ─────────────────────────────────────────────────────────
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid, "profile", "info"));
  return snap.exists() ? snap.data() : null;
}
