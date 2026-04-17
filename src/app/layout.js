import "@/styles/globals.css";
import { AuthProvider } from "@/lib/hooks/useAuth";
import { ThemeProvider } from "@/lib/hooks/useTheme";
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
    <html lang="en" data-theme="light">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Relio" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ThemeProvider>
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
        </ThemeProvider>
      </body>
    </html>
  );
}
