import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { Noto_Naskh_Arabic, Nunito } from "next/font/google";

import { ExitModal } from "@/components/modals/exit-modal";
import { HeartsModal } from "@/components/modals/hearts-modal";
import { PracticeModal } from "@/components/modals/practice-modal";
import { Toaster } from "@/components/ui/sonner";
import { siteConfig } from "@/config";

import "./globals.css";

// Nunito for English (rounded and friendly); Urdu characters fall back to
// Noto Naskh Arabic, which is easier for learners to read than Nastaliq.
const latin = Nunito({ subsets: ["latin"], variable: "--font-latin" });
const urdu = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  variable: "--font-urdu",
});

export const viewport: Viewport = {
  themeColor: "#22C55E",
};

export const metadata: Metadata = siteConfig;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        layout: {
          logoImageUrl: "/favicon.ico",
        },
        variables: {
          colorPrimary: "#22C55E",
        },
      }}
    >
      <html lang="en" className={`${latin.variable} ${urdu.variable}`}>
        <body className="font-sans antialiased">
          <Toaster theme="light" richColors closeButton />
          <ExitModal />
          <HeartsModal />
          <PracticeModal />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
