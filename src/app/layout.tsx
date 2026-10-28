import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai, Inter, JetBrains_Mono } from "next/font/google";
import { asset } from "@/lib/asset";
import "./globals.css";

// next/font downloads these at build time and serves them from this app —
// no request to Google at runtime, so the demo works offline (PLAN R10).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plexThai = IBM_Plex_Sans_Thai({
  variable: "--font-plex-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PRM Hospitality · Digital Twin",
  description: "Simulated digital twin demo — PRM Hospitality mixed-use project",
  // Piramid logo in the browser tab (the file convention takes no .webp)
  icons: { icon: { url: asset("/images/Logo-Piramid.webp"), type: "image/webp" } },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${inter.variable} ${plexThai.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
