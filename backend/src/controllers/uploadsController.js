const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const { USER_AGENT } = require("../lib/discogs");

const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");
const ALLOWED_TYPES = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };

// Omoti se čuvaju na disku backend-a (backend/uploads), a frontend ih
// servira kao /covers/<fajl> (Next.js rewrite → /api/uploads/<fajl>).
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (req, file, cb) => cb(null, crypto.randomBytes(12).toString("hex") + ALLOWED_TYPES[file.mimetype]),
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES[file.mimetype]) return cb(null, true);
    cb(Object.assign(new Error("Dozvoljene su samo slike (JPG, PNG, WEBP, GIF)."), { status: 400 }));
  },
});

function uploadCover(req, res) {
  if (!req.file) return res.status(400).json({ error: "Fajl nije poslat (polje 'cover')." });
  res.status(201).json({ ok: true, url: `/covers/${req.file.filename}` });
}

// Skida sliku sa spoljnog linka (npr. Discogs) i čuva je kao lokalni omot.
// Ime fajla je izvedeno iz linka, pa ponovni uvoz istog izdanja ne pravi kopije.
async function saveRemoteCover(url) {
  const baseName = "r-" + crypto.createHash("sha1").update(url).digest("hex").slice(0, 24);
  const existing = Object.values(ALLOWED_TYPES)
    .map((ext) => baseName + ext)
    .find((name) => fs.existsSync(path.join(UPLOADS_DIR, name)));
  if (existing) return `/covers/${existing}`;

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  const ext = ALLOWED_TYPES[type];
  if (!ext) throw new Error(`Nepodržan tip slike: ${type}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > 8 * 1024 * 1024) throw new Error("Slika je veća od 8 MB.");

  const fileName = baseName + ext;
  await fs.promises.writeFile(path.join(UPLOADS_DIR, fileName), buffer);
  return `/covers/${fileName}`;
}

// Briše lokalno sačuvan omot kad ploča promijeni omot ili bude obrisana.
function deleteLocalCover(coverUrl) {
  if (!coverUrl || !coverUrl.startsWith("/covers/")) return;
  const fileName = path.basename(coverUrl);
  fs.unlink(path.join(UPLOADS_DIR, fileName), (err) => {
    if (err && err.code !== "ENOENT") console.error("Brisanje omota nije uspjelo:", err.message);
  });
}

module.exports = { upload, uploadCover, saveRemoteCover, deleteLocalCover, UPLOADS_DIR };
