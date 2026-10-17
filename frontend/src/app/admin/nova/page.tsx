import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminToken, getArtists, getGenres } from "@/lib/api";
import RecordForm from "@/components/admin/RecordForm";

export const metadata: Metadata = { title: "Nova ploča" };

export default async function NewRecordPage() {
  if (!(await getAdminToken())) redirect("/admin/login");

  const [artists, genres] = await Promise.all([getArtists(), getGenres()]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vinyl-600">Admin</p>
      <h1 className="mt-1 text-3xl font-semibold">Nova ploča</h1>
      <RecordForm artists={artists.map((a) => a.name)} genres={genres.map((g) => g.name)} />
    </div>
  );
}
