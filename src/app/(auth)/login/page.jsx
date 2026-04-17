"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowLeft, Loader2 } from "lucide-react";
import { signIn, resetPassword } from "@/lib/firebase/auth";
import { useAuth } from "@/lib/hooks/useAuth";
import { useToast } from "@/components/shared/Toast";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const toast = useToast();

  const [mode,    setMode]    = useState("signin"); // signin | reset
  const [email,   setEmail]   = useState("");
  const [pass,    setPass]    = useState("");
  const [busy,    setBusy]    = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/today");
  }, [user, loading, router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        await signIn(email, pass);
        toast.success("Welcome back!");
        router.replace("/today");
      } else {
        await resetPassword(email);
        toast.success("Reset link sent — check your email.");
        setMode("signin");
      }
    } catch (err) {
      toast.error(friendlyError(err.code));
    } finally {
      setBusy(false);
    }
  }

  function friendlyError(code) {
    const map = {
      "auth/user-not-found":     "No account found with this email.",
      "auth/wrong-password":     "Incorrect password.",
      "auth/invalid-email":      "Please enter a valid email address.",
      "auth/invalid-credential": "Incorrect email or password.",
      "auth/too-many-requests":  "Too many attempts. Try again in a few minutes.",
    };
    return map[code] || "Something went wrong. Please try again.";
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <Loader2 size={32} className="spinner" />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.logoBlock}>
        <div className={styles.logoIcon}>R</div>
        <h1 className={styles.logoText}>Relio</h1>
        <p className={styles.logoSub}>
          {mode === "signin" ? "Welcome back." : "Reset your password."}
        </p>
      </div>

      <div className={styles.card}>
        <form onSubmit={handleSubmit} className={styles.form}>

          <div className={styles.field}>
            <label className={styles.label}>
              <Mail size={14} /> Email
            </label>
            <input
              className="relio-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          {mode === "signin" && (
            <div className={styles.field}>
              <label className={styles.label}>
                <Lock size={14} /> Password
              </label>
              <input
                className="relio-input"
                type="password"
                placeholder="••••••••"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          )}

          <button
            className={`relio-btn relio-btn-primary ${styles.submit}`}
            type="submit"
            disabled={busy}
          >
            {busy ? (
              <>
                <Loader2 size={18} className="spinner" /> Please wait...
              </>
            ) : mode === "signin" ? (
              "Sign In"
            ) : (
              "Send Reset Link"
            )}
          </button>

          {mode === "signin" && (
            <button type="button" className={styles.forgotBtn}
              onClick={() => { setMode("reset"); }}>
              Forgot password?
            </button>
          )}
          {mode === "reset" && (
            <button type="button" className={styles.forgotBtn}
              onClick={() => { setMode("signin"); }}>
              <ArrowLeft size={14} /> Back to Sign In
            </button>
          )}
        </form>
      </div>

      <p className={styles.footer}>Your leads, your data. Private and secure.</p>
    </div>
  );
}
