import Link from "next/link";
import type { VinylRecord } from "@/lib/types";
import { formatDate } from "@/lib/format";
import Cover from "./Cover";

export default function RecordCard({ record }: { record: VinylRecord }) {
  return (
    <Link
      href={`/ploce/${record.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-ink-700/10 bg-paper-50 p-3 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-ink-700/20 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vinyl-600"
    >
      {/* Omot + ploča koja izviri udesno na hover (kartica je odsiječe na ivici) */}
      <div className="relative aspect-square">
        <span
          className="vinyl-disc absolute inset-[4%] transition-transform duration-500 ease-out group-hover:translate-x-[14%] group-hover:rotate-45"
          aria-hidden
        />
        <Cover
          src={record.coverUrl}
          width={300}
          alt={`${record.artist.name} — ${record.title}`}
          className="relative h-full w-full rounded-xl shadow-sm ring-1 ring-ink-950/10 transition-transform duration-500 ease-out group-hover:-translate-x-[3%]"
        />
        {record.isFavorite && (
          <span
            className="absolute right-2 top-2 rounded-full bg-paper-50/95 px-2 py-0.5 text-sm text-gold-500 shadow"
            title="Omiljena"
          >
            ★
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-1 flex-col px-0.5">
        <h3 className="line-clamp-1 font-serif text-base font-semibold leading-snug group-hover:text-vinyl-600">
          {record.title}
        </h3>
        <p className="line-clamp-1 text-sm text-ink-700">{record.artist.name}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-ink-500">
          {record.releaseYear && (
            <span className="rounded-full bg-ink-950 px-2 py-0.5 text-paper-50">{record.releaseYear}</span>
          )}
          <span className="rounded-full border border-ink-700/20 px-2 py-0.5">{record.format}</span>
          {record.mediaCondition && (
            <span className="rounded-full border border-ink-700/20 px-2 py-0.5" title="Stanje ploče">
              {record.mediaCondition}
            </span>
          )}
        </div>
        <p className="mt-auto pt-2.5 text-[11px] text-ink-500">Dodata {formatDate(record.createdAt)}</p>
      </div>
    </Link>
  );
}
