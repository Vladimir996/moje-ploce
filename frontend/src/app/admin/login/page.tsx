"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const data = new FormData(event.currentTarget);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: data.get("username"),
          password: data.get("password"),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Prijava neuspješna.");
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prijava neuspješna.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-5 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vinyl-600">Admin</p>
      <h1 className="mt-2 text-2xl font-semibold">Prijava</h1>
      <p className="mt-1 text-sm text-ink-500">Prijavi se da dodaješ i mijenjaš ploče.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="username" className="form-label">
            Korisničko ime
          </label>
          <input id="username" name="username" type="text" required autoComplete="username" className="form-input" />
        </div>
        <div>
          <label htmlFor="password" className="form-label">
            Lozinka
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="form-input"
          />
        </div>

        {error && <p className="rounded-xl bg-vinyl-600/10 px-4 py-3 text-sm text-vinyl-700">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-ink-950 px-6 py-3 text-sm font-semibold text-paper-50 transition-colors hover:bg-vinyl-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Prijavljivanje..." : "Prijavi se"}
        </button>
      </form>
    </div>
  );
}
