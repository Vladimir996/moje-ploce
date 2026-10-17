import { CONDITIONS, SPEEDS } from "./constants";
import type { Condition, Speed } from "./types";

// "2026-10-17" ili "2026-10-17 19:20:01" → "17.10.2026."
export function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}.${month}.${year}.`;
}

export function formatDateTime(value: string): string {
  const [datePart, timePart] = value.split(" ");
  return `${formatDate(datePart)} u ${timePart?.slice(0, 5) ?? ""}`;
}

export function conditionLabel(value: Condition | null): string | null {
  if (!value) return null;
  return CONDITIONS.find((c) => c.value === value)?.label ?? value;
}

export function speedLabel(value: Speed): string {
  return SPEEDS.find((s) => s.value === value)?.label ?? `${value} RPM`;
}

export function formatPrice(value: number): string {
  return `${value.toFixed(2).replace(".", ",")} €`;
}

// Pluralizacija: 1 ploča, 2 ploče, 5 ploča, 21 ploča...
export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
