import type { Condition, Format, Speed } from "./types";

export const FORMATS: Format[] = ["LP", "EP", "Singl", "Dupli LP", "Box set"];

export const SPEEDS: { value: Speed; label: string }[] = [
  { value: "33", label: "33⅓ RPM" },
  { value: "45", label: "45 RPM" },
  { value: "78", label: "78 RPM" },
];

// Goldmine skala stanja ploče/omota
export const CONDITIONS: { value: Condition; label: string }[] = [
  { value: "M", label: "M — Mint (nova, neotpakovana)" },
  { value: "NM", label: "NM — Near Mint (kao nova)" },
  { value: "VG+", label: "VG+ — Very Good Plus (minimalni tragovi)" },
  { value: "VG", label: "VG — Very Good (čujni tragovi)" },
  { value: "G+", label: "G+ — Good Plus (izražena istrošenost)" },
  { value: "G", label: "G — Good (jako istrošena)" },
  { value: "P", label: "P — Poor (oštećena)" },
];

export const SORTS = [
  { value: "newest", label: "Najnovije dodate" },
  { value: "oldest", label: "Najstarije dodate" },
  { value: "year_desc", label: "Godina izdanja (novije prvo)" },
  { value: "year_asc", label: "Godina izdanja (starije prvo)" },
  { value: "title", label: "Naziv (A–Ž)" },
  { value: "artist", label: "Izvođač (A–Ž)" },
] as const;

export const PAGE_SIZE = 24;
