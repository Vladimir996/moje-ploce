import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <span className="vinyl-disc block h-24 w-24" aria-hidden />
      <h1 className="mt-6 text-2xl font-semibold">Ova ploča nije u kolekciji</h1>
      <p className="mt-2 text-sm text-ink-500">Možda je obrisana ili link nije ispravan.</p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-ink-950 px-5 py-2.5 text-sm font-semibold text-paper-50 hover:bg-vinyl-600"
      >
        Nazad na kolekciju
      </Link>
    </div>
  );
}
