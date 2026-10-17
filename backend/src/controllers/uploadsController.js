const crypto = require("crypto");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { USER_AGENT } = require("../lib/discogs");

// Omoti se čuvaju na Cloudinary-ju (CLOUDINARY_URL u .env), a u bazi je samo
// njihov https link. Disk servera se ne koristi jer ga besplatni hosting
// (npr. Render) briše pri svakom deploy-u.
const FOLDER = process.env.CLOUDINARY_FOLDER || "ploce";
const MAX_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Veće slike se smanjuju već pri otpremanju — omotu ne treba više od 1200px
const UPLOAD_OPTIONS = {
  folder: FOLDER,
  resource_type: "image",
  transformation: [{ width: 1200, height: 1200, crop: "limit" }],
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) return cb(null, true);
    cb(Object.assign(new Error("Dozvoljene su samo slike (JPG, PNG, WEBP, GIF)."), { status: 400 }));
  },
});

function isConfigured() {
  return Boolean(process.env.CLOUDINARY_URL);
}

function uploadBuffer(buffer, options) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ ...UPLOAD_OPTIONS, ...options }, (err, result) => (err ? reject(err) : resolve(result)))
      .end(buffer);
  });
}

async function uploadCover(req, res) {
  if (!isConfigured()) return res.status(503).json({ error: "Cloudinary nije podešen (CLOUDINARY_URL)." });
  if (!req.file) return res.status(400).json({ error: "Fajl nije poslat (polje 'cover')." });

  const result = await uploadBuffer(req.file.buffer, {});
  res.status(201).json({ ok: true, url: result.secure_url });
}

// Skida sliku sa spoljnog linka (npr. Discogs) i šalje je na Cloudinary.
// ID slike je izveden iz linka, pa ponovni uvoz istog izdanja ne pravi kopije.
async function saveRemoteCover(url) {
  if (!isConfigured()) throw new Error("Cloudinary nije podešen (CLOUDINARY_URL).");

  const publicId = "r-" + crypto.createHash("sha1").update(url).digest("hex").slice(0, 24);
  try {
    const existing = await cloudinary.api.resource(`${FOLDER}/${publicId}`);
    return existing.secure_url;
  } catch (err) {
    if (err.error?.http_code !== 404) throw err.error ?? err;
  }

  // Discogs traži User-Agent, zato sliku skida backend, a ne Cloudinary direktno
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!ALLOWED_TYPES.includes(type)) throw new Error(`Nepodržan tip slike: ${type}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > MAX_SIZE) throw new Error("Slika je veća od 8 MB.");

  const result = await uploadBuffer(buffer, { public_id: publicId });
  return result.secure_url;
}

// Iz linka https://res.cloudinary.com/<cloud>/image/upload/v123/ploce/abc.jpg → "ploce/abc".
// Vraća null za slike koje nisu na našem Cloudinary nalogu (npr. nalijepljen spoljni link).
function publicIdFromUrl(url) {
  const cloudName = cloudinary.config().cloud_name;
  const match = /^https:\/\/res\.cloudinary\.com\/([^/]+)\/image\/upload\/(?:v\d+\/)?(.+)\.[a-z0-9]+$/i.exec(url ?? "");
  if (!match || match[1] !== cloudName) return null;
  return match[2];
}

// Briše omot sa Cloudinary-ja kad ploča promijeni omot ili bude obrisana.
async function deleteStoredCover(coverUrl) {
  const publicId = publicIdFromUrl(coverUrl);
  if (!publicId || !isConfigured()) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error("Brisanje omota nije uspjelo:", err.error?.message ?? err.message);
  }
}

module.exports = { upload, uploadCover, saveRemoteCover, deleteStoredCover };
