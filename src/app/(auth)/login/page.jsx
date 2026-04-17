"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, resetPassword } from "@/lib/firebase/auth";
import { useAuth } from "@/lib/hooks/useAuth";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [mode,    setMode]    = useState("signin"); // signin | reset
  const [email,   setEmail]   = useState("");
  const [pass,    setPass]    = useState("");
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!loading && user) router.replace("/today");
  }, [user, loading, router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setSuccess(""); setBusy(true);
    try {
      if (mode === "signin") {
        await signIn(email, pass);
        router.replace("/today");
      } else {
        await resetPassword(email);
        setSuccess("Reset link sent — check your email.");
      }
    } catch (err) {
      setError(friendlyError(err.code));
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
        <div className="spinner" />
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
            <label className={styles.label}>Email</label>
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
              <label className={styles.label}>Password</label>
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

          {error   && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.success}>{success}</p>}

          <button
            className={`relio-btn relio-btn-primary ${styles.submit}`}
            type="submit"
            disabled={busy}
          >
            {busy
              ? <span className="spinner" style={{ borderTopColor: "#fff" }} />
              : mode === "signin" ? "Sign In" : "Send Reset Link"
            }
          </button>

          {mode === "signin" && (
            <button type="button" className={styles.forgotBtn}
              onClick={() => { setMode("reset"); setError(""); }}>
              Forgot password?
            </button>
          )}
          {mode === "reset" && (
            <button type="button" className={styles.forgotBtn}
              onClick={() => { setMode("signin"); setError(""); setSuccess(""); }}>
              ← Back to Sign In
            </button>
          )}
        </form>
      </div>

      <p className={styles.footer}>Your leads, your data. Private and secure.</p>
    </div>
  );
}
