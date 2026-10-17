import type { Metadata } from "next";
import { bodyFont, headingFont } from "@/lib/fonts";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Moje ploče", template: "%s — Moje ploče" },
  description: "Lična kolekcija gramofonskih ploča.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sr" className={`${bodyFont.variable} ${headingFont.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-paper-100 text-ink-950">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-ink-700/10 py-6 text-center text-xs text-ink-500">
          Moje ploče · lična kolekcija
        </footer>
      </body>
    </html>
  );
}
