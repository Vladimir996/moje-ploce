// Omot ploče. Slike mogu biti lokalne (/covers/...) ili spoljni linkovi
// (npr. sa Discogs-a), pa se koristi običan <img> umjesto next/image.
export default function Cover({
  src,
  alt,
  className = "",
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-ink-800 to-ink-950 ${className}`}
        role="img"
        aria-label={alt}
      >
        <span className="vinyl-disc block aspect-square w-3/5" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" className={`object-cover ${className}`} />
  );
}
