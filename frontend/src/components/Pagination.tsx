import Link from "next/link";

export default function Pagination({
  page,
  pages,
  searchParams,
}: {
  page: number;
  pages: number;
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  if (pages <= 1) return null;

  function href(target: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (typeof value === "string" && key !== "strana") params.set(key, value);
    }
    if (target > 1) params.set("strana", String(target));
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  }

  // Prikaži prvu, posljednju i 2 strane oko trenutne
  const numbers = [...new Set([1, page - 2, page - 1, page, page + 1, page + 2, pages])]
    .filter((n) => n >= 1 && n <= pages)
    .sort((a, b) => a - b);

  const base = "flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm font-medium";
  const arrow =
    "flex h-11 w-11 items-center justify-center rounded-full border border-ink-700/15 bg-paper-50 text-lg shadow-sm";

  return (
    <nav className="mt-10 sm:mt-12" aria-label="Stranice">
      {/* Telefon: kompaktno — strelice dovoljno velike za palac + "Strana X od Y" */}
      <div className="flex items-center justify-between gap-3 sm:hidden">
        {page > 1 ? (
          <Link href={href(page - 1)} className={arrow} aria-label="Prethodna strana">
            ←
          </Link>
        ) : (
          <span className={`${arrow} opacity-30`} aria-hidden>
            ←
          </span>
        )}
        <span className="text-sm text-ink-700">
          Strana <strong className="text-ink-950">{page}</strong> od {pages}
        </span>
        {page < pages ? (
          <Link href={href(page + 1)} className={arrow} aria-label="Sljedeća strana">
            →
          </Link>
        ) : (
          <span className={`${arrow} opacity-30`} aria-hidden>
            →
          </span>
        )}
      </div>

      {/* Veći ekrani: brojevi strana */}
      <div className="hidden flex-wrap items-center justify-center gap-1.5 sm:flex">
        {page > 1 && (
          <Link href={href(page - 1)} className={`${base} hover:bg-paper-200`}>
            ← Prethodna
          </Link>
        )}
        {numbers.map((n, i) => (
          <span key={n} className="flex items-center gap-1.5">
            {i > 0 && n - numbers[i - 1] > 1 && <span className="text-ink-500">…</span>}
            <Link
              href={href(n)}
              aria-current={n === page ? "page" : undefined}
              className={`${base} ${n === page ? "bg-ink-950 text-paper-50" : "hover:bg-paper-200"}`}
            >
              {n}
            </Link>
          </span>
        ))}
        {page < pages && (
          <Link href={href(page + 1)} className={`${base} hover:bg-paper-200`}>
            Sljedeća →
          </Link>
        )}
      </div>
    </nav>
  );
}
