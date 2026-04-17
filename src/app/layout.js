import "@/styles/globals.css";
import { AuthProvider } from "@/lib/hooks/useAuth";
import { ToastProvider } from "@/components/shared/Toast";

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
        <AuthProvider>
          <ToastProvider>
            <div className="page-container">
              {children}
            </div>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
