import "@/styles/globals.css";
import { AuthProvider } from "@/lib/hooks/useAuth";

export const metadata = {
  title:       "Relio",
  description: "Your leads. Your follow-ups. Nothing missed.",
  manifest:    "/manifest.json",
  themeColor:  "#C49A2A",
  viewport:    "width=device-width, initial-scale=1, maximum-scale=1",
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
          <div className="page-container">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
