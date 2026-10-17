"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent, type KeyboardEvent } from "react";
import type { DiscogsImport as DiscogsImportData, DiscogsSearchResult } from "@/lib/types";
import { readPhoto, type Progress } from "@/lib/recognize";
import Cover from "../Cover";

const PROGRESS_LABELS: Record<Progress["step"], string> = {
  barcode: "Tražim barkod...",
  "ocr-load": "Učitavam prepoznavanje teksta (prvi put traje duže)...",
  ocr: "Čitam tekst sa slike",
};

const MATCH_LABELS: Record<string, string> = {
  barcode: "po barkodu",
  catno: "po kataloškom broju",
};

type SearchBy = "catno" | "barcode" | "q";

const SEARCH_MODES: { value: SearchBy; label: string; placeholder: string }[] = [
  { value: "catno", label: "Kataloški broj", placeholder: "npr. LSVG 7" },
  { value: "barcode", label: "Barkod", placeholder: "brojevi ispod bar-koda" },
  { value: "q", label: "Izvođač / naziv", placeholder: "npr. Bijelo dugme Eto baš hoću" },
];

// Link tipa discogs.com/release/1155758-... ili discogs.com/sr/release/1155758
const RELEASE_URL_RE = /discogs\.com\/(?:[a-z]{2}\/)?release\/(\d+)/i;

export default function DiscogsImport({ onImport }: { onImport: (data: DiscogsImportData) => void }) {
  const [by, setBy] = useState<SearchBy>("catno");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DiscogsSearchResult[] | null>(null);
  const [hasToken, setHasToken] = useState(true);
  const [searching, setSearching] = useState(false);
  const [importingId, setImportingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState<DiscogsImportData | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoStatus, setPhotoStatus] = useState<string | null>(null);
  const [photoNote, setPhotoNote] = useState<string | null>(null);
  const [photoWords, setPhotoWords] = useState<string[]>([]);

  useEffect(() => () => void (photoUrl && URL.revokeObjectURL(photoUrl)), [photoUrl]);

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // da ista slika može ponovo da se izabere
    if (!file) return;

    setPhotoUrl(URL.createObjectURL(file));
    setPhotoNote(null);
    setPhotoWords([]);
    setResults(null);
    setImported(null);
    setError(null);

    try {
      const reading = await readPhoto(file, (p) =>
        setPhotoStatus(p.percent != null ? `${PROGRESS_LABELS[p.step]} ${p.percent}%` : PROGRESS_LABELS[p.step]),
      );
      setPhotoWords(reading.words.slice(0, 14));

      setPhotoStatus("Tražim na Discogs-u...");
      const res = await fetch("/api/admin/discogs/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reading),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Pretraga nije uspjela.");

      setResults(body.results);
      setHasToken(body.hasToken);
      if (body.matchedBy) {
        setBy(body.matchedBy === "words" ? "q" : body.matchedBy);
        setQuery(body.query);
        setPhotoNote(
          body.matchedBy === "words"
            ? `Mogući pogoci po pročitanim riječima („${body.query}”) — provjeri da li je tvoja ploča među njima.`
            : `Pronađeno ${MATCH_LABELS[body.matchedBy]}: „${body.query}”. Izaberi tačno izdanje.`,
        );
      } else {
        setPhotoNote(
          reading.words.length > 0
            ? "Nisam uspio automatski da pronađem ploču. Klikni pročitane riječi da ih dodaš u pretragu, ili ukucaj sam."
            : "Na slici nisam pročitao tekst. Slikaj etiketu izbliza, pri dobrom svjetlu i bez odsjaja.",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prepoznavanje slike nije uspjelo.");
    } finally {
      setPhotoStatus(null);
    }
  }

  function addWord(word: string) {
    setBy("q");
    setQuery((prev) => (prev && by === "q" ? `${prev} ${word}` : word));
  }

  async function search() {
    const value = query.trim();
    if (!value) return;

    const urlMatch = RELEASE_URL_RE.exec(value);
    if (urlMatch) return importRelease(Number(urlMatch[1]));

    setSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/discogs/search?${new URLSearchParams({ q: value, by })}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Pretraga nije uspjela.");
      setResults(body.results);
      setHasToken(body.hasToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pretraga nije uspjela.");
    } finally {
      setSearching(false);
    }
  }

  async function importRelease(id: number) {
    setImportingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/discogs/releases/${id}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Uvoz nije uspio.");
      onImport(body);
      setImported(body);
      setResults(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Uvoz nije uspio.");
    } finally {
      setImportingId(null);
    }
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    // Ovo je unutar glavne forme — Enter ne smije da je pošalje
    if (e.key === "Enter") {
      e.preventDefault();
      search();
    }
  }

  const mode = SEARCH_MODES.find((m) => m.value === by)!;

  return (
    <section className="rounded-2xl border border-ink-950/15 bg-ink-950 p-5 text-paper-50 sm:p-6">
      <h2 className="text-lg font-semibold">Uvezi sa Discogs-a</h2>
      <p className="mt-1 text-sm text-paper-50/60">
        Pronađi tačno izdanje i forma će se sama popuniti — pjesme, izdavač, godina, omot... Može i link sa
        Discogs-a.
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Traži po">
        {SEARCH_MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={by === m.value}
            onClick={() => setBy(m.value)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              by === m.value ? "bg-paper-50 text-ink-950" : "text-paper-50/70 hover:text-paper-50"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKey}
          placeholder={`${mode.placeholder} — ili nalijepi link`}
          aria-label="Discogs pretraga"
          className="form-input !border-paper-50/20 !bg-ink-900 !text-paper-50 placeholder:text-paper-50/40"
        />
        <button
          type="button"
          onClick={search}
          disabled={searching || importingId !== null || !query.trim()}
          className="shrink-0 rounded-xl bg-vinyl-600 px-5 text-sm font-semibold text-paper-50 transition-colors hover:bg-vinyl-700 disabled:opacity-50"
        >
          {searching ? "Tražim..." : "Traži"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <label
          className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-paper-50/25 px-4 py-2 text-sm font-semibold transition-colors hover:bg-paper-50/10 ${
            photoStatus ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <span aria-hidden>📷</span> Slikaj ploču
          {/* capture="environment" na telefonu odmah otvara zadnju kameru; na računaru bira fajl */}
          <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="sr-only" />
        </label>
        <span className="text-xs text-paper-50/50">
          Najbolje radi slika etikete izbliza (kataloški broj) ili bar-koda sa zadnje strane omota.
        </span>
      </div>

      {(photoUrl && (photoStatus || photoNote || photoWords.length > 0)) && (
        <div className="mt-4 flex gap-4 rounded-xl bg-paper-50/5 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt="Slika ploče" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
          <div className="min-w-0 flex-1 text-sm">
            {photoStatus && (
              <p className="flex items-center gap-2 text-paper-50/80">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-paper-50/30 border-t-vinyl-600" />
                {photoStatus}
              </p>
            )}
            {photoNote && <p className="text-paper-50/80">{photoNote}</p>}
            {photoWords.length > 0 && !photoStatus && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {photoWords.map((word) => (
                  <button
                    key={word}
                    type="button"
                    onClick={() => addWord(word)}
                    className="rounded-full border border-paper-50/20 px-2.5 py-0.5 text-xs hover:border-paper-50 hover:bg-paper-50/10"
                  >
                    + {word}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-3 rounded-xl bg-vinyl-600/20 px-4 py-2.5 text-sm text-paper-50">{error}</p>}

      {imported && !results && (
        <div className="mt-4 rounded-xl bg-paper-50/10 px-4 py-3 text-sm">
          <p>
            ✓ Uvezeno: <strong>{imported.artist} — {imported.title}</strong>. Provjeri podatke ispod, dodaj stanje
            ploče i sačuvaj.
          </p>
          {imported.existingRecordId && (
            <p className="mt-1.5 text-gold-500">
              Pažnja: ovo izdanje već imaš u kolekciji —{" "}
              <Link href={`/ploce/${imported.existingRecordId}`} className="underline" target="_blank">
                pogledaj ploču
              </Link>
              .
            </p>
          )}
        </div>
      )}

      {results && (
        <div className="mt-4">
          {results.length === 0 ? (
            <p className="text-sm text-paper-50/60">
              Ništa nije pronađeno. Probaj drugi način pretrage (npr. izvođač i naziv).
            </p>
          ) : (
            <>
              <ul className="max-h-[26rem] space-y-1.5 overflow-y-auto pr-1">
                {results.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 rounded-xl bg-paper-50/5 p-2 hover:bg-paper-50/10">
                    {hasToken && (
                      <Cover src={r.thumb} alt="" className="aspect-square w-12 shrink-0 rounded-md" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {r.artist ? `${r.artist} — ` : ""}
                        {r.title}
                      </p>
                      <p className="truncate text-xs text-paper-50/60">
                        {[r.year, r.country, r.label, r.catno, r.formats].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <a
                      href={`https://www.discogs.com/release/${r.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hidden shrink-0 text-xs text-paper-50/50 hover:text-paper-50 sm:block"
                    >
                      Discogs ↗
                    </a>
                    <button
                      type="button"
                      onClick={() => importRelease(r.id)}
                      disabled={importingId !== null}
                      className="shrink-0 rounded-full bg-paper-50 px-3.5 py-1.5 text-xs font-semibold text-ink-950 hover:bg-gold-500 disabled:opacity-50"
                    >
                      {importingId === r.id ? "Uvozim..." : "Uvezi"}
                    </button>
                  </li>
                ))}
              </ul>
              {!hasToken && (
                <p className="mt-2 text-xs text-paper-50/50">
                  Sličice omota u rezultatima se prikazuju tek uz DISCOGS_TOKEN u backend/.env — omot se ipak
                  uvozi kad klikneš „Uvezi”.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
