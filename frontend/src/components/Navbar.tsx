import Link from "next/link";
import { getAdminToken } from "@/lib/api";
import LogoutButton from "./admin/LogoutButton";

export default async function Navbar() {
  const isAdmin = Boolean(await getAdminToken());

  return (
    <header className="sticky top-0 z-30 border-b border-ink-700/10 bg-paper-100/90 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="vinyl-disc block h-8 w-8" aria-hidden />
          <span className="font-serif text-lg font-semibold tracking-tight">Moje ploče</span>
        </Link>

        <div className="ml-auto flex items-center gap-4 text-sm">
          {isAdmin ? (
            <>
              <Link
                href="/admin/nova"
                className="rounded-full bg-ink-950 px-4 py-2 font-semibold text-paper-50 transition-colors hover:bg-vinyl-600"
              >
                + Dodaj ploču
              </Link>
              <LogoutButton />
            </>
          ) : (
            <Link href="/admin/login" className="font-medium text-ink-700 hover:text-vinyl-600">
              Prijava
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
