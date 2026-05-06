import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AmbientBackground } from "@/components/ambient-background";
import { MeProvider } from "@/components/auth/me-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PATHS — Hiring Console",
  description: "PATHS personalised AI talent hiring — connect to the FastAPI backend",
};

export const viewport: Viewport = {
  themeColor: "#05070b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen font-sans [font-family:var(--font-geist-sans)]`}
      >
        <AmbientBackground />
        <MeProvider>
          <div className="relative z-0 min-h-screen">{children}</div>
        </MeProvider>
      </body>
    </html>
  );
}
