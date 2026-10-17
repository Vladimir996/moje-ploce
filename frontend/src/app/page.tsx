import Link from "next/link";
import { headers } from "next/headers";
import { Suspense } from "react";
import { getAdminToken, getArtists, getGenres, getRecords, getStats } from "@/lib/api";
import { PAGE_SIZE, PAGE_SIZE_MOBILE } from "@/lib/constants";
import { formatDate, plural } from "@/lib/format";
import Filters from "@/components/Filters";
import RecordCard from "@/components/RecordCard";
import Pagination from "@/components/Pagination";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const get = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : "");

  // Telefon dobija manje ploča po strani (5 redova po 2 kartice)
  const pageSize = (await isMobile()) ? PAGE_SIZE_MOBILE : PAGE_SIZE;

  // URL parametri (na našem jeziku) → parametri backend API-ja
  const apiParams = new URLSearchParams({ limit: String(pageSize), page: get("strana") || "1" });
  if (get("q")) apiParams.set("q", get("q"));
  if (get("izvodjac")) apiParams.set("artist", get("izvodjac"));
  if (get("zanr")) apiParams.set("genre", get("zanr"));
  if (get("format")) apiParams.set("format", get("format"));
  if (get("omiljene") === "1") apiParams.set("favorite", "1");
  if (get("sort")) apiParams.set("sort", get("sort"));
  const decade = Number(get("decenija"));
  if (decade) {
    apiParams.set("yearFrom", String(decade));
    apiParams.set("yearTo", String(decade + 9));
  }

  let data;
  try {
    data = await Promise.all([getRecords(apiParams), getArtists(), getGenres(), getStats(), getAdminToken()]);
  } catch {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">Backend nije dostupan</h1>
        <p className="mt-3 text-sm text-ink-700">
          Provjeri da li je pokrenut backend (<code>cd backend &amp;&amp; npm run dev</code>) i MySQL baza.
        </p>
      </div>
    );
  }
  const [records, artists, genres, stats, token] = data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <section className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vinyl-600">Kolekcija</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Moje ploče</h1>
          {stats.lastAddedAt && (
            <p className="mt-1.5 text-sm text-ink-500">Posljednja dodata {formatDate(stats.lastAddedAt)}</p>
          )}
        </div>

        <dl className="grid grid-cols-3 gap-2 sm:gap-3">
          <Stat value={stats.records} label={plural(stats.records, "ploča", "ploče", "ploča")} />
          <Stat value={stats.artists} label={plural(stats.artists, "izvođač", "izvođača", "izvođača")} />
          <Stat
            value={stats.oldestYear ? `${stats.oldestYear}–${String(stats.newestYear).slice(2)}` : "—"}
            label="raspon godina"
          />
        </dl>
      </section>

      <div className="mt-8">
        <Suspense>
          <Filters artists={artists} genres={genres} decades={stats.decades.map((d) => d.decade)} />
        </Suspense>
      </div>

      <p className="mt-6 text-sm text-ink-500">
        {records.total === stats.records
          ? `Prikazano ${records.total} ${plural(records.total, "ploča", "ploče", "ploča")}`
          : `Pronađeno ${records.total} od ${stats.records}`}
      </p>

      {records.items.length === 0 ? (
        <EmptyState hasAny={stats.records > 0} isAdmin={Boolean(token)} />
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5 xl:grid-cols-5">
          {records.items.map((record, i) => (
            <div key={record.id} className="h-full animate-fade-in" style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
              <RecordCard record={record} />
            </div>
          ))}
        </div>
      )}

      <Pagination page={records.page} pages={records.pages} searchParams={sp} />
    </div>
  );
}

// Server ne zna širinu ekrana, pa se telefon prepoznaje po zaglavljima zahtjeva
// (Sec-CH-UA-Mobile šalju Chrome/Edge na Androidu, ostali se prepoznaju po User-Agent-u).
// Tablet (iPad, Android tablet bez "Mobile") dobija desktop raspored.
async function isMobile(): Promise<boolean> {
  const h = await headers();
  if (h.get("sec-ch-ua-mobile") === "?1") return true;
  return /Mobi|iPhone|iPod|Android.+Mobile|Windows Phone/i.test(h.get("user-agent") ?? "");
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-2xl border border-ink-700/10 bg-paper-50 px-4 py-3 text-center sm:px-5">
      <dt className="sr-only">{label}</dt>
      <dd className="font-serif text-xl font-semibold sm:text-2xl">{value}</dd>
      <dd className="text-[11px] font-medium uppercase tracking-wide text-ink-500">{label}</dd>
    </div>
  );
}

function EmptyState({ hasAny, isAdmin }: { hasAny: boolean; isAdmin: boolean }) {
  return (
    <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-ink-700/20 px-6 py-16 text-center">
      <span className="vinyl-disc block h-20 w-20 opacity-80" aria-hidden />
      {hasAny ? (
        <>
          <h2 className="mt-5 text-xl font-semibold">Nijedna ploča ne odgovara filterima</h2>
          <p className="mt-1 text-sm text-ink-500">Probaj drugačiju pretragu ili poništi filtere.</p>
        </>
      ) : (
        <>
          <h2 className="mt-5 text-xl font-semibold">Kolekcija je još prazna</h2>
          <p className="mt-1 text-sm text-ink-500">Dodaj prvu ploču i pojaviće se ovdje.</p>
          <Link
            href={isAdmin ? "/admin/nova" : "/admin/login"}
            className="mt-5 rounded-full bg-ink-950 px-5 py-2.5 text-sm font-semibold text-paper-50 hover:bg-vinyl-600"
          >
            {isAdmin ? "+ Dodaj ploču" : "Prijavi se da dodaš ploču"}
          </Link>
        </>
      )}
    </div>
  );
}
