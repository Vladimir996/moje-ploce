import { Fraunces, Inter } from "next/font/google";

export const bodyFont = Inter({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
});

export const headingFont = Fraunces({
  variable: "--font-heading",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
});
