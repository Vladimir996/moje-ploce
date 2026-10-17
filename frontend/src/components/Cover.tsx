// Omot ploče. Slike su na Cloudinary-ju ili spoljni linkovi (nalijepljeni u
// formi), pa se koristi običan <img> umjesto next/image.
export default function Cover({
  src,
  alt,
  width = 600,
  className = "",
}: {
  src: string | null;
  alt: string;
  /** Širina u kojoj se omot prikazuje — Cloudinary vraća sliku te veličine (x2 za oštre ekrane) */
  width?: number;
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
    <img src={sizedUrl(src, width)} alt={alt} loading="lazy" className={`object-cover ${className}`} />
  );
}

// Cloudinary pravi varijante slike preko URL-a: .../image/upload/<transformacije>/...
// f_auto = WebP/AVIF ako browser podržava, q_auto = automatski kvalitet.
function sizedUrl(src: string, width: number): string {
  if (!src.startsWith("https://res.cloudinary.com/") || !src.includes("/image/upload/")) return src;
  return src.replace("/image/upload/", `/image/upload/f_auto,q_auto,c_limit,w_${width * 2}/`);
}
