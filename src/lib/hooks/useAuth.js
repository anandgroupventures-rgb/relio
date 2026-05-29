"use client";
import { useState, useEffect, createContext, useContext } from "react";
import { onAuth } from "@/lib/firebase/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(undefined); // undefined = loading
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    try {
      const unsub = onAuth((u) => {
        setUser(u);
        setLoading(false);
      });
      return unsub;
    } catch (err) {
      console.error("[AuthProvider] Failed to initialize auth:", err);
      setUser(null);
      setLoading(false);
      setError(err);
      return () => {};
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
