import "@/styles/globals.css";
import { AuthProvider } from "@/lib/hooks/useAuth";
import { ServiceWorkerProvider } from "@/lib/hooks/ServiceWorkerProvider";
import { ToastProvider } from "@/components/shared/Toast";
import { OfflineInit } from "@/components/shared/OfflineInit";

export const metadata = {
  title:       "Relio",
  description: "Your leads. Your follow-ups. Nothing missed.",
  manifest:    "/manifest.json",
  themeColor:  "#C49A2A",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Relio" />
      </head>
      <body>
        <ServiceWorkerProvider>
          <AuthProvider>
            <ToastProvider>
              <OfflineInit>
                <div className="page-container">
                  {children}
                </div>
              </OfflineInit>
            </ToastProvider>
          </AuthProvider>
        </ServiceWorkerProvider>
      </body>
    </html>
  );
}
