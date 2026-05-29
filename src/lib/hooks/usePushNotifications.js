"use client";
import { useState, useEffect, useCallback } from "react";
import { requestFCMToken, onForegroundMessage } from "@/lib/firebase/config";

export function usePushNotifications() {
  const [token, setToken] = useState(null);
  const [permission, setPermission] = useState("default");
  const [loading, setLoading] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPermission(Notification.permission);

    // Listen for foreground messages
    const unsubscribe = onForegroundMessage((payload) => {
      setLastMessage(payload);
      // Show in-app toast or notification
      if (payload.notification) {
        const { title, body } = payload.notification;
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(title, { body, icon: "/icon-192.png" });
        }
      }
    });

    return unsubscribe;
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined") return false;
    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        const fcmToken = await requestFCMToken();
        if (fcmToken) {
          setToken(fcmToken);
          // Store token for server-side targeting
          localStorage.setItem("relio_fcm_token", fcmToken);
        }
      }
      return result === "granted";
    } catch (e) {
      console.error("[Push] Permission request failed:", e);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const sendTestNotification = useCallback(() => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Relio", {
        body: "Your daily briefing: 3 follow-ups today 🔔",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: "test",
        requireInteraction: true,
      });
    }
  }, []);

  return {
    token,
    permission,
    loading,
    lastMessage,
    requestPermission,
    sendTestNotification,
  };
}
