import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminToken, getRecord } from "@/lib/api";
import { conditionLabel, formatDate, formatDateTime, formatPrice, speedLabel } from "@/lib/format";
import type { Track } from "@/lib/types";
import Cover from "@/components/Cover";
import RecordActions from "@/components/admin/RecordActions";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const record = await getRecord((await params).id);
  return { title: record ? `${record.artist.name} — ${record.title}` : "Ploča nije pronađena" };
}

export default async function RecordPage({ params }: Props) {
  const { id } = await params;
  const token = await getAdminToken();
  const record = await getRecord(id, token);
  if (!record) notFound();

  const isAdmin = Boolean(token);
  const details: [string, string | null][] = [
    ["Godina izdanja", record.releaseYear ? String(record.releaseYear) : null],
    ["Izdavač", record.label],
    ["Kataloški broj", record.catalogNumber],
    ["Zemlja", record.country],
    ["Format", record.format],
    ["Brzina", speedLabel(record.speed)],
    ["Stanje ploče", conditionLabel(record.mediaCondition)],
    ["Stanje omota", conditionLabel(record.sleeveCondition)],
  ];
  const privateDetails: [string, string | null][] = [
    ["Cijena", record.purchasePrice != null ? formatPrice(record.purchasePrice) : null],
    ["Datum kupovine", record.purchaseDate ? formatDate(record.purchaseDate) : null],
    ["Kupljena u/od", record.purchasedFrom ?? null],
  ];
  const hasPrivate = record.notes || privateDetails.some(([, v]) => v);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/" className="text-sm font-medium text-ink-700 hover:text-vinyl-600">
        ← Nazad na kolekciju
      </Link>

      <div className="mt-6 grid gap-10 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-14">
        {/* Omot sa pločom koja izviruje */}
        <div className="relative mr-[12%] self-start animate-fade-in">
          <div className="relative aspect-square">
            <span className="vinyl-disc absolute inset-[3%] translate-x-[18%]" aria-hidden />
            <Cover
              src={record.coverUrl}
              alt={`${record.artist.name} — ${record.title}`}
              className="relative h-full w-full rounded-2xl shadow-xl ring-1 ring-ink-950/10"
            />
          </div>
        </div>

        <div className="min-w-0">
          <Link
            href={`/?izvodjac=${record.artist.id}`}
            className="text-sm font-semibold uppercase tracking-[0.15em] text-vinyl-600 hover:text-vinyl-700"
          >
            {record.artist.name}
          </Link>
          <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {record.title}
            {record.isFavorite && (
              <span className="ml-3 align-middle text-2xl text-gold-500" title="Omiljena">
                ★
              </span>
            )}
          </h1>

          {record.genres.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {record.genres.map((genre) => (
                <span key={genre} className="rounded-full bg-paper-200 px-3 py-1 text-xs font-semibold text-ink-800">
                  {genre}
                </span>
              ))}
            </div>
          )}

          {isAdmin && (
            <div className="mt-6">
              <RecordActions id={record.id} isFavorite={record.isFavorite} />
            </div>
          )}

          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 rounded-2xl border border-ink-700/10 bg-paper-50 p-5 sm:grid-cols-3">
            {details
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{label}</dt>
                  <dd className="mt-0.5 text-sm font-medium text-ink-900">{value}</dd>
                </div>
              ))}
          </dl>

          {record.description && (
            <section className="mt-8">
              <h2 className="text-lg font-semibold">O ploči</h2>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-ink-800">{record.description}</p>
            </section>
          )}

          {record.tracks.length > 0 && <Tracklist tracks={record.tracks} />}

          {isAdmin && hasPrivate && (
            <section className="mt-8 rounded-2xl border border-dashed border-vinyl-600/30 bg-vinyl-600/5 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-vinyl-700">
                Privatno <span className="font-normal normal-case text-ink-500">· vidiš samo ti</span>
              </h2>
              <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {privateDetails
                  .filter(([, value]) => value)
                  .map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{label}</dt>
                      <dd className="mt-0.5 text-sm font-medium">{value}</dd>
                    </div>
                  ))}
              </dl>
              {record.notes && <p className="mt-4 whitespace-pre-line text-sm text-ink-800">{record.notes}</p>}
            </section>
          )}

          <p className="mt-10 border-t border-ink-700/10 pt-4 text-xs text-ink-500">
            Dodata u kolekciju {formatDateTime(record.createdAt)}
            {record.updatedAt !== record.createdAt && ` · posljednja izmjena ${formatDateTime(record.updatedAt)}`}
            {record.discogsId && (
              <>
                {" · "}
                <a
                  href={`https://www.discogs.com/release/${record.discogsId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-ink-700 underline decoration-ink-700/30 underline-offset-2 hover:text-vinyl-600"
                >
                  Pogledaj na Discogs-u ↗
                </a>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

// Pjesme grupisane po stranama ploče (A1, A2 → strana A)
function Tracklist({ tracks }: { tracks: Track[] }) {
  const sides = new Map<string, Track[]>();
  for (const track of tracks) {
    const side = /^[A-Za-z]/.test(track.position) ? track.position[0].toUpperCase() : "";
    sides.set(side, [...(sides.get(side) ?? []), track]);
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">Spisak pjesama</h2>
      <div className="mt-3 space-y-5">
        {[...sides.entries()].map(([side, sideTracks]) => (
          <div key={side || "-"}>
            {side && sides.size > 1 && (
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-500">
                Strana {side}
              </p>
            )}
            <ol className="divide-y divide-ink-700/10 rounded-2xl border border-ink-700/10 bg-paper-50">
              {sideTracks.map((track, i) => (
                <li key={i} className="flex items-baseline gap-4 px-4 py-2.5 text-sm">
                  <span className="w-8 shrink-0 font-mono text-xs text-ink-500">{track.position}</span>
                  <span className="min-w-0 flex-1">{track.title}</span>
                  {track.duration && <span className="font-mono text-xs text-ink-500">{track.duration}</span>}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}
