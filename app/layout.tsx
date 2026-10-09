import type { Metadata, Viewport } from "next";
import "./globals.css";
import { UserProvider } from "@/components/UserProvider";

export const metadata: Metadata = {
  title: "Lingora — learn 60+ languages with your own AI tutor",
  description: "A free, AI-powered, research-based language learning app with lessons, stories, leagues and conversation practice.",
};

export const viewport: Viewport = { themeColor: "#7c5cff", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen antialiased">
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  );
}
