"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, resetPassword } from "@/lib/firebase/auth";
import { useAuth } from "@/lib/hooks/useAuth";
import { Home, ChevronRight } from "lucide-react";
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
      <div className={styles.page}>
        <div className={styles.loading}>
          <div className={styles.logoIcon}><Home size={28} /></div>
          <div className="spinner" style={{ marginTop: 24 }} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Background glows */}
      <div className={styles.bgGlow} />
      <div className={styles.bgGlow2} />

      <div className={styles.content}>
        <div className={styles.brand}>
          <div className={styles.logoIcon}><Home size={28} /></div>
          <h1 className="text-headline-lg-mobile" style={{ color: "var(--r-primary)" }}>Relio</h1>
          <p className={styles.subtitle}>Empowering real estate agents with smart leads.</p>
        </div>

        <div className={styles.card}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>EMAIL ADDRESS</label>
              <input
                className="r-input"
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
                <label className={styles.label}>PASSWORD</label>
                <input
                  className="r-input"
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

            <button className={`r-btn r-btn-primary ${styles.submit}`} type="submit" disabled={busy}>
              {busy ? (
                <span className="spinner" style={{ borderTopColor: "#fff", width: 20, height: 20 }} />
              ) : mode === "signin" ? "Sign In" : "Send Reset Link"}
            </button>

            <div className={styles.divider}>
              <span className={styles.dividerLine} />
              <span className="text-label-md" style={{ color: "var(--r-outline)" }}>OR</span>
              <span className={styles.dividerLine} />
            </div>

            <button type="button" className={styles.googleBtn} onClick={() => setError("Google Sign-In coming soon")}>
              <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Login with Google
            </button>

            {mode === "signin" ? (
              <button type="button" className={styles.linkBtn} onClick={() => { setMode("reset"); setError(""); }}>
                Forgot password?
              </button>
            ) : (
              <button type="button" className={styles.linkBtn} onClick={() => { setMode("signin"); setError(""); setSuccess(""); }}>
                Back to Sign In
              </button>
            )}
          </form>
        </div>

        <button className={styles.guestLink} onClick={() => router.replace("/today")}>
          Continue without login <ChevronRight size={14} />
        </button>
      </div>

      <footer className={styles.footer}>
        <p className="text-label-md" style={{ color: "var(--r-outline)" }}>
          © 2024 Relio CRM. All Rights Reserved.
        </p>
      </footer>
    </div>
  );
}
