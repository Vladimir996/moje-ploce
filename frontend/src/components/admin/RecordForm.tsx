"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type KeyboardEvent } from "react";
import { CONDITIONS, FORMATS, SPEEDS } from "@/lib/constants";
import type { Condition, DiscogsImport as DiscogsImportData, Format, Speed, VinylRecordDetail } from "@/lib/types";
import Cover from "../Cover";
import DiscogsImport from "./DiscogsImport";

type TrackRow = { position: string; title: string; duration: string };

type FormState = {
  title: string;
  artist: string;
  releaseYear: string;
  label: string;
  catalogNumber: string;
  country: string;
  format: Format;
  speed: Speed;
  mediaCondition: Condition | "";
  sleeveCondition: Condition | "";
  coverUrl: string;
  description: string;
  notes: string;
  purchasePrice: string;
  purchaseDate: string;
  purchasedFrom: string;
  isFavorite: boolean;
  discogsId: number | null;
  genres: string[];
  tracks: TrackRow[];
};

function initialState(record?: VinylRecordDetail): FormState {
  return {
    title: record?.title ?? "",
    artist: record?.artist.name ?? "",
    releaseYear: record?.releaseYear ? String(record.releaseYear) : "",
    label: record?.label ?? "",
    catalogNumber: record?.catalogNumber ?? "",
    country: record?.country ?? "",
    format: record?.format ?? "LP",
    speed: record?.speed ?? "33",
    mediaCondition: record?.mediaCondition ?? "",
    sleeveCondition: record?.sleeveCondition ?? "",
    coverUrl: record?.coverUrl ?? "",
    description: record?.description ?? "",
    notes: record?.notes ?? "",
    purchasePrice: record?.purchasePrice != null ? String(record.purchasePrice) : "",
    purchaseDate: record?.purchaseDate ?? "",
    purchasedFrom: record?.purchasedFrom ?? "",
    isFavorite: record?.isFavorite ?? false,
    discogsId: record?.discogsId ?? null,
    genres: record?.genres ?? [],
    tracks: record?.tracks.map((t) => ({ ...t, duration: t.duration ?? "" })) ?? [],
  };
}

export default function RecordForm({
  record,
  artists,
  genres,
}: {
  record?: VinylRecordDetail;
  artists: string[];
  genres: string[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => initialState(record));
  const [newGenre, setNewGenre] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const allGenres = [...new Set([...genres, ...form.genres])].sort((a, b) => a.localeCompare(b, "sr"));

  function toggleGenre(name: string) {
    set("genres", form.genres.includes(name) ? form.genres.filter((g) => g !== name) : [...form.genres, name]);
  }

  function addGenre() {
    const name = newGenre.trim();
    if (!name) return;
    const existing = allGenres.find((g) => g.toLowerCase() === name.toLowerCase());
    if (!form.genres.includes(existing ?? name)) set("genres", [...form.genres, existing ?? name]);
    setNewGenre("");
  }

  function onGenreKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addGenre();
    }
  }

  function updateTrack(index: number, key: keyof TrackRow, value: string) {
    set(
      "tracks",
      form.tracks.map((t, i) => (i === index ? { ...t, [key]: value } : t)),
    );
  }

  function addTrack() {
    set("tracks", [...form.tracks, { position: suggestPosition(form.tracks), title: "", duration: "" }]);
  }

  function removeTrack(index: number) {
    set(
      "tracks",
      form.tracks.filter((_, i) => i !== index),
    );
  }

  // Popunjava podatke o izdanju; stanje, opis, privatna polja i "omiljena" ostaju kako jesu.
  function handleImport(data: DiscogsImportData) {
    setForm((prev) => ({
      ...prev,
      title: data.title,
      artist: data.artist,
      releaseYear: data.releaseYear ? String(data.releaseYear) : "",
      label: data.label ?? "",
      catalogNumber: data.catalogNumber ?? "",
      country: data.country ?? "",
      format: data.format,
      speed: data.speed,
      coverUrl: data.coverUrl ?? prev.coverUrl,
      discogsId: data.discogsId,
      genres: data.genres.length > 0 ? data.genres : prev.genres,
      tracks:
        data.tracks.length > 0
          ? data.tracks.map((t) => ({ position: t.position, title: t.title, duration: t.duration ?? "" }))
          : prev.tracks,
    }));
  }

  async function handleCoverFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const data = new FormData();
      data.append("cover", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: data });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Slanje slike nije uspjelo.");
      set("coverUrl", body.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Slanje slike nije uspjelo.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(record ? `/api/admin/records/${record.id}` : "/api/admin/records", {
        method: record ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          releaseYear: form.releaseYear ? Number(form.releaseYear) : null,
          purchasePrice: form.purchasePrice ? Number(form.purchasePrice.replace(",", ".")) : null,
        }),
      });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Čuvanje nije uspjelo.");

      router.push(`/ploce/${body.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Čuvanje nije uspjelo.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <DiscogsImport onImport={handleImport} />

      <Section title="Osnovno">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Naziv ploče *">
            <input required value={form.title} onChange={(e) => set("title", e.target.value)} className="form-input" />
          </Field>
          <Field label="Izvođač *">
            <input
              required
              list="artists-list"
              value={form.artist}
              onChange={(e) => set("artist", e.target.value)}
              className="form-input"
              placeholder="Počni da kucaš — predlažu se postojeći"
            />
            <datalist id="artists-list">
              {artists.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </Field>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Godina izdanja">
            <input
              type="number"
              min={1890}
              max={new Date().getFullYear() + 1}
              value={form.releaseYear}
              onChange={(e) => set("releaseYear", e.target.value)}
              className="form-input"
            />
          </Field>
          <Field label="Format">
            <select value={form.format} onChange={(e) => set("format", e.target.value as Format)} className="form-input">
              {FORMATS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </Field>
          <Field label="Brzina">
            <select value={form.speed} onChange={(e) => set("speed", e.target.value as Speed)} className="form-input">
              {SPEEDS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Zemlja izdanja">
            <input
              value={form.country}
              onChange={(e) => set("country", e.target.value)}
              className="form-input"
              placeholder="npr. Jugoslavija"
            />
          </Field>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Izdavač (label)">
            <input
              value={form.label}
              onChange={(e) => set("label", e.target.value)}
              className="form-input"
              placeholder="npr. Jugoton, PGP RTB"
            />
          </Field>
          <Field label="Kataloški broj">
            <input
              value={form.catalogNumber}
              onChange={(e) => set("catalogNumber", e.target.value)}
              className="form-input"
              placeholder="npr. LSY 63028"
            />
          </Field>
        </div>
        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={form.isFavorite}
            onChange={(e) => set("isFavorite", e.target.checked)}
            className="h-4 w-4 accent-vinyl-600"
          />
          <span className="text-gold-500">★</span> Omiljena ploča
        </label>
      </Section>

      <Section title="Omot">
        <div className="flex flex-col gap-5 sm:flex-row">
          <Cover src={form.coverUrl || null} alt="Pregled omota" width={160} className="aspect-square w-40 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-4">
            <Field label="Otpremi sliku (JPG, PNG, WEBP — do 8 MB)">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => handleCoverFile(e.target.files?.[0])}
                disabled={uploading}
                className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-ink-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-paper-50 hover:file:bg-vinyl-600"
              />
              {uploading && <p className="mt-1 text-xs text-ink-500">Slanje slike...</p>}
            </Field>
            <Field label="...ili nalijepi link do slike">
              <input
                value={form.coverUrl}
                onChange={(e) => set("coverUrl", e.target.value)}
                className="form-input"
                placeholder="https://..."
              />
            </Field>
            {form.coverUrl && (
              <button
                type="button"
                onClick={() => set("coverUrl", "")}
                className="text-sm font-medium text-vinyl-600 hover:text-vinyl-700"
              >
                Ukloni omot
              </button>
            )}
          </div>
        </div>
      </Section>

      <Section title="Žanrovi">
        <div className="flex flex-wrap gap-2">
          {allGenres.map((name) => {
            const active = form.genres.includes(name);
            return (
              <button
                key={name}
                type="button"
                onClick={() => toggleGenre(name)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  active
                    ? "border-ink-950 bg-ink-950 text-paper-50"
                    : "border-ink-700/20 text-ink-800 hover:border-ink-950"
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex max-w-sm gap-2">
          <input
            value={newGenre}
            onChange={(e) => setNewGenre(e.target.value)}
            onKeyDown={onGenreKey}
            placeholder="Novi žanr..."
            className="form-input"
          />
          <button
            type="button"
            onClick={addGenre}
            className="shrink-0 rounded-xl border border-ink-700/20 px-4 text-sm font-semibold hover:bg-paper-200"
          >
            Dodaj
          </button>
        </div>
      </Section>

      <Section title="Stanje i opis">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Stanje ploče">
            <ConditionSelect value={form.mediaCondition} onChange={(v) => set("mediaCondition", v)} />
          </Field>
          <Field label="Stanje omota">
            <ConditionSelect value={form.sleeveCondition} onChange={(v) => set("sleeveCondition", v)} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Opis (javno vidljiv)">
            <textarea
              rows={5}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="form-input"
              placeholder="Priča o ploči, zanimljivosti, posebnost ovog izdanja..."
            />
          </Field>
        </div>
      </Section>

      <Section title="Spisak pjesama">
        {form.tracks.length > 0 && (
          <div className="space-y-2">
            {form.tracks.map((track, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={track.position}
                  onChange={(e) => updateTrack(i, "position", e.target.value)}
                  className="form-input !w-16 shrink-0 text-center font-mono"
                  aria-label="Pozicija"
                  placeholder="A1"
                />
                <input
                  value={track.title}
                  onChange={(e) => updateTrack(i, "title", e.target.value)}
                  className="form-input min-w-0"
                  aria-label="Naziv pjesme"
                  placeholder="Naziv pjesme"
                />
                <input
                  value={track.duration}
                  onChange={(e) => updateTrack(i, "duration", e.target.value)}
                  className="form-input !w-20 shrink-0 text-center font-mono"
                  aria-label="Trajanje"
                  placeholder="3:45"
                />
                <button
                  type="button"
                  onClick={() => removeTrack(i)}
                  className="shrink-0 rounded-xl px-3 text-lg text-ink-500 hover:bg-vinyl-600/10 hover:text-vinyl-700"
                  aria-label="Ukloni pjesmu"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={addTrack}
          className="mt-3 rounded-xl border border-dashed border-ink-700/30 px-4 py-2 text-sm font-semibold hover:bg-paper-200"
        >
          + Dodaj pjesmu
        </button>
      </Section>

      <Section title="Privatno" hint="Vidiš samo ti kad si prijavljen">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Cijena (€)">
            <input
              inputMode="decimal"
              value={form.purchasePrice}
              onChange={(e) => set("purchasePrice", e.target.value)}
              className="form-input"
              placeholder="0,00"
            />
          </Field>
          <Field label="Datum kupovine">
            <input
              type="date"
              value={form.purchaseDate}
              onChange={(e) => set("purchaseDate", e.target.value)}
              className="form-input"
            />
          </Field>
          <Field label="Kupljena u/od">
            <input
              value={form.purchasedFrom}
              onChange={(e) => set("purchasedFrom", e.target.value)}
              className="form-input"
              placeholder="npr. buvlja pijaca, Discogs"
            />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Bilješke">
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              className="form-input"
            />
          </Field>
        </div>
      </Section>

      {error && <p className="rounded-xl bg-vinyl-600/10 px-4 py-3 text-sm text-vinyl-700">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={submitting || uploading}
          className="rounded-full bg-ink-950 px-7 py-3 text-sm font-semibold text-paper-50 transition-colors hover:bg-vinyl-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Čuvanje..." : record ? "Sačuvaj izmjene" : "Dodaj u kolekciju"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full px-5 py-3 text-sm font-medium text-ink-700 hover:bg-paper-200"
        >
          Otkaži
        </button>
      </div>
    </form>
  );
}

// Predlaže sljedeću poziciju: A1 → A2, B3 → B4; prva pjesma je A1.
function suggestPosition(tracks: TrackRow[]): string {
  const last = tracks.at(-1)?.position ?? "";
  const match = /^([A-Za-z]*)(\d+)$/.exec(last);
  if (!match) return tracks.length === 0 ? "A1" : "";
  return `${match[1]}${Number(match[2]) + 1}`;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-ink-700/10 bg-paper-50 p-5 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold">
        {title}
        {hint && <span className="ml-2 font-sans text-xs font-normal text-ink-500">· {hint}</span>}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="form-label">{label}</span>
      {children}
    </label>
  );
}

function ConditionSelect({
  value,
  onChange,
}: {
  value: Condition | "";
  onChange: (value: Condition | "") => void;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as Condition | "")} className="form-input">
      <option value="">— nije navedeno —</option>
      {CONDITIONS.map((c) => (
        <option key={c.value} value={c.value}>
          {c.label}
        </option>
      ))}
    </select>
  );
}
