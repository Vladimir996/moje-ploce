import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getAdminToken, getArtists, getGenres, getRecord } from "@/lib/api";
import RecordForm from "@/components/admin/RecordForm";

export const metadata: Metadata = { title: "Izmjena ploče" };

export default async function EditRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const token = await getAdminToken();
  if (!token) redirect("/admin/login");

  const { id } = await params;
  const [record, artists, genres] = await Promise.all([getRecord(id, token), getArtists(), getGenres()]);
  if (!record) notFound();
  // Token je istekao — backend nije vratio privatna polja, pa bi ih forma obrisala
  if (!("notes" in record)) redirect("/admin/login");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vinyl-600">Izmjena</p>
      <h1 className="mt-1 text-3xl font-semibold">
        {record.artist.name} — {record.title}
      </h1>
      <RecordForm record={record} artists={artists.map((a) => a.name)} genres={genres.map((g) => g.name)} />
    </div>
  );
}
