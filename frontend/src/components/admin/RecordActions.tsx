"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RecordActions({ id, isFavorite }: { id: number; isFavorite: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(url: string, method: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(url, { method });
    if (res.status === 401) {
      router.push("/admin/login");
      return null;
    }
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(body.error ?? "Akcija nije uspjela.");
      return null;
    }
    return body;
  }

  async function toggleFavorite() {
    if (await call(`/api/admin/records/${id}/favorite`, "PATCH")) router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Da li sigurno želiš da obrišeš ovu ploču iz kolekcije?")) return;
    if (await call(`/api/admin/records/${id}`, "DELETE")) {
      router.push("/");
      router.refresh();
    }
  }

  const button =
    "rounded-full border border-ink-700/20 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50";

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/admin/ploce/${id}`} className={`${button} bg-ink-950 text-paper-50 hover:bg-vinyl-600`}>
          Izmijeni
        </Link>
        <button type="button" onClick={toggleFavorite} disabled={busy} className={`${button} hover:bg-paper-200`}>
          <span className="text-gold-500">{isFavorite ? "★" : "☆"}</span>{" "}
          {isFavorite ? "Ukloni iz omiljenih" : "Dodaj u omiljene"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy}
          className={`${button} text-vinyl-700 hover:bg-vinyl-600 hover:text-paper-50`}
        >
          Obriši
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-vinyl-700">{error}</p>}
    </div>
  );
}
