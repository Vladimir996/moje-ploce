"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { FORMATS, SORTS } from "@/lib/constants";
import type { Artist, Genre } from "@/lib/types";

const FILTER_KEYS = ["q", "izvodjac", "zanr", "format", "decenija", "omiljene", "sort"] as const;

// Svi filteri žive u URL-u (?q=...&izvodjac=...) — mogu se podijeliti linkom
// i "Nazad" u browseru vraća prethodnu pretragu.
export default function Filters({
  artists,
  genres,
  decades,
}: {
  artists: Artist[];
  genres: Genre[];
  decades: number[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  function update(changes: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("strana"); // svaka promjena filtera vraća na prvu stranu
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => update({ q: value.trim() || null }), 350);
  }

  function reset() {
    clearTimeout(debounceRef.current);
    setQuery("");
    startTransition(() => router.replace(pathname, { scroll: false }));
  }

  const value = (key: string) => searchParams.get(key) ?? "";
  const hasFilters = FILTER_KEYS.some((key) => key !== "sort" && searchParams.has(key));

  return (
    <div className="rounded-2xl border border-ink-700/10 bg-paper-50 p-4 shadow-sm sm:p-5">
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <circle cx="9" cy="9" r="6" />
          <path d="m14 14 4 4" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Pretraži po nazivu ploče, izvođaču, izdavaču ili kataloškom broju..."
          aria-label="Pretraga"
          className="form-input !rounded-full !py-3 !pl-10"
        />
        {isPending && (
          <span className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-ink-500/30 border-t-vinyl-600" />
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Select
          label="Izvođač"
          value={value("izvodjac")}
          onChange={(v) => update({ izvodjac: v })}
          options={artists.map((a) => ({ value: String(a.id), label: `${a.name} (${a.recordCount})` }))}
          allLabel="Svi izvođači"
        />
        <Select
          label="Žanr"
          value={value("zanr")}
          onChange={(v) => update({ zanr: v })}
          options={genres
            .filter((g) => g.recordCount > 0)
            .map((g) => ({ value: String(g.id), label: `${g.name} (${g.recordCount})` }))}
          allLabel="Svi žanrovi"
        />
        <Select
          label="Format"
          value={value("format")}
          onChange={(v) => update({ format: v })}
          options={FORMATS.map((f) => ({ value: f, label: f }))}
          allLabel="Svi formati"
        />
        <Select
          label="Decenija izdanja"
          value={value("decenija")}
          onChange={(v) => update({ decenija: v })}
          options={decades.map((d) => ({ value: String(d), label: `${d}-e` }))}
          allLabel="Sve godine"
        />
        <Select
          label="Sortiranje"
          value={value("sort") || "newest"}
          onChange={(v) => update({ sort: v === "newest" ? null : v })}
          options={SORTS.map((s) => ({ value: s.value, label: s.label }))}
        />

        <div className="col-span-2 flex items-end gap-3 md:col-span-1">
          <label className="flex h-[42px] flex-1 cursor-pointer items-center gap-2 rounded-xl border border-ink-700/20 bg-paper-50 px-3 text-sm">
            <input
              type="checkbox"
              checked={value("omiljene") === "1"}
              onChange={(e) => update({ omiljene: e.target.checked ? "1" : null })}
              className="h-4 w-4 accent-vinyl-600"
            />
            <span className="text-gold-500">★</span> Omiljene
          </label>
        </div>
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={reset}
          className="mt-3 text-sm font-medium text-vinyl-600 hover:text-vinyl-700"
        >
          × Poništi sve filtere
        </button>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string | null) => void;
  options: { value: string; label: string }[];
  allLabel?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="form-label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value || null)} className="form-input">
        {allLabel && <option value="">{allLabel}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
