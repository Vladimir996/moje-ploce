const pool = require("../db");
const { discogsGet, DiscogsError } = require("../lib/discogs");
const { saveRemoteCover } = require("./uploadsController");

// Discogs žanrovi → naši nazivi
const GENRE_MAP = {
  Rock: "Rock",
  Pop: "Pop",
  Jazz: "Jazz",
  Blues: "Blues",
  "Funk / Soul": "Soul",
  Electronic: "Elektronska",
  "Hip Hop": "Hip-hop",
  Classical: "Klasična",
  Reggae: "Reggae",
  "Folk, World, & Country": "Folk",
  "Stage & Screen": "Soundtrack",
};

// Stilovi koji odgovaraju nekom od naših žanrova (ostali stilovi se uvoze
// samo ako žanr sa tim imenom već postoji u bazi)
const STYLE_MAP = {
  "New Wave": "Novi talas",
  Punk: "Punk",
  "Heavy Metal": "Metal",
  Disco: "Disco",
  Funk: "Funk",
  Soundtrack: "Soundtrack",
  Schlager: "Zabavna",
  Chanson: "Zabavna",
  Ballad: "Zabavna",
  Folk: "Folk",
};

async function searchReleases(req, res) {
  const query = String(req.query.q ?? "").trim();
  const by = req.query.by;
  if (!query) return res.status(400).json({ error: "Unesi šta tražiš." });

  const field = by === "catno" ? "catno" : by === "barcode" ? "barcode" : "q";
  const value = by === "barcode" ? query.replace(/\s+/g, "") : query;
  const { total, results } = await searchDiscogs({ [field]: value });

  res.json({ total, hasToken: Boolean(process.env.DISCOGS_TOKEN), results });
}

async function searchDiscogs(params) {
  const data = await discogsGet("/database/search", { type: "release", format: "Vinyl", per_page: "24", ...params });
  return {
    total: data.pagination?.items ?? 0,
    results: (data.results ?? []).map((r) => {
      // Naslov u pretrazi je "Izvođač - Naziv"
      const [artist, ...titleParts] = String(r.title ?? "").split(" - ");
      return {
        id: r.id,
        artist: cleanArtistName(titleParts.length > 0 ? artist : ""),
        title: titleParts.length > 0 ? titleParts.join(" - ") : r.title,
        year: r.year ? Number(r.year) || null : null,
        country: r.country ?? null,
        label: r.label?.[0] ?? null,
        catno: r.catno && r.catno !== "none" ? r.catno : null,
        formats: (r.format ?? []).filter((f) => f !== "Vinyl").join(", "),
        thumb: r.thumb || null,
      };
    }),
  };
}

// Prepoznavanje ploče sa fotografije: browser pročita barkod i tekst (OCR),
// a ovdje se redom probaju barkod → kataloški broj → krupne riječi.
// Discogs pretraga je stroga (jedna pogrešna riječ = 0 rezultata), zato se
// ispravljaju tipične OCR greške i probaju manji skupovi riječi.
async function identifyRelease(req, res) {
  const barcode = String(req.body?.barcode ?? "").replace(/\D/g, "");
  const text = String(req.body?.text ?? "").slice(0, 5000);
  const words = Array.isArray(req.body?.words) ? req.body.words.map(String).slice(0, 40) : [];
  const respond = (matchedBy, query, found) =>
    res.json({ matchedBy, query, hasToken: Boolean(process.env.DISCOGS_TOKEN), ...found });

  if (barcode.length >= 8) {
    const found = await searchDiscogs({ barcode });
    if (found.total > 0) return respond("barcode", barcode, found);
  }

  for (const catno of catalogNumberCandidates(text).slice(0, 3)) {
    const found = await searchDiscogs({ catno });
    if (found.total > 0) return respond("catno", catno, found);
  }

  // Najkrupnije riječi su obično naslov/izvođač, ali i logo ili stilizovana slova koja OCR
  // pogrešno pročita — zato se probaju i skupovi koji preskaču prvu, pa prve dvije riječi.
  const keywords = [...new Set(words.map((w) => w.trim()).filter(isKeyword).map((w) => w.toLowerCase()))];
  const attempts = [keywords.slice(0, 5), keywords.slice(0, 3), keywords.slice(1, 4), keywords.slice(2, 5)];
  const tried = new Set();
  for (const subset of attempts) {
    const q = subset.join(" ");
    // Premalo teksta daje nasumične pogotke ("boi male" → bilo šta) — traži 3 riječi ili 2 duže
    const enough = subset.length >= 3 || (subset.length === 2 && subset.every((w) => w.length >= 5));
    if (!enough || tried.has(q)) continue;
    tried.add(q);
    const found = await searchDiscogs({ q });
    if (found.total > 0) return respond("words", q, found);
  }

  respond(null, null, { total: 0, results: [] });
}

// OCR često zamijeni slova i cifre u prefiksu kataloškog broja ("15Y-10023" umjesto "LSY-10023")
const PREFIX_FIXES = { 0: ["O"], 1: ["L", "I"], 2: ["Z"], 5: ["S"], 6: ["G"], 8: ["B"] };
const NOT_CATNO = new Set(["ST", "P", "C", "SIDE", "STRANA", "RPM"]);

function catalogNumberCandidates(text) {
  const candidates = [];
  const re = /\b([A-Z0-9]{1,5})[\s.-]?(\d{1,6})\b/gi;
  for (const [, rawPrefix, number] of text.toUpperCase().matchAll(re)) {
    // Prefiks mora imati bar jedno slovo ili biti "pokvaren" OCR-om (cifre koje liče na slova)
    if (!/[A-Z]/.test(rawPrefix) && !/^[0-9]{1,5}$/.test(rawPrefix)) continue;
    if (/^\d+$/.test(rawPrefix) && /^\d{4}$/.test(number) && /^(19|20)/.test(number)) continue; // "(P) 1984"
    if (number.length < 3 && rawPrefix.length < 3) continue;

    const variants = prefixVariants(rawPrefix).filter((p) => /[A-Z]{2}/.test(p) && !NOT_CATNO.has(p));
    for (const prefix of variants) candidates.push(`${prefix}-${number}`, `${prefix} ${number}`);
  }
  // Sa crticom i dužim brojem su vjerovatniji; bez duplikata
  return [...new Set(candidates)].sort((a, b) => b.length - a.length);
}

function prefixVariants(prefix) {
  let variants = [""];
  for (const ch of prefix) {
    const options = PREFIX_FIXES[ch] ? [ch, ...PREFIX_FIXES[ch]] : [ch];
    variants = variants.flatMap((v) => options.map((o) => v + o));
    if (variants.length > 16) break;
  }
  // Prvo varijante sa najviše slova (najvjerovatnije ispravljene)
  return variants.sort((a, b) => (b.match(/[A-Z]/g) ?? []).length - (a.match(/[A-Z]/g) ?? []).length);
}

// Standardni tekst sa jugoslovenskih (i stranih) etiketa koji ne pomaže pretrazi
const LABEL_BOILERPLATE = new Set(
  `stereo mono strana side sva prava proizvođača proizvodjaca vlasnika snimljenog djela dela su pridržana
  pridrzana zabranjeno umnožavanje umnozavanje ove ploče ploce korišćenje koriscenje korišćenje za javno
  izvođenje izvodjenje radio difuziju difuzija aranžman aranžmani aranzman producent produkcija snimljeno
  tekst muzika made yugoslavia jugoslavija jugoton diskoton suzy sokoj zamp rights reserved all record
  records unauthorized copying public performance broadcasting prohibited the and play speed`.split(/\s+/),
);

function isKeyword(word) {
  return /^[\p{L}]{3,}$/u.test(word) && !LABEL_BOILERPLATE.has(word.toLowerCase());
}

// Vraća podatke izdanja spremne za formu + skida omot na naš server.
async function importRelease(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Neispravan Discogs ID." });

  const release = await discogsGet(`/releases/${id}`);

  const [[existing]] = await pool.query("SELECT id FROM records WHERE discogs_id = ? LIMIT 1", [id]);

  const image = release.images?.find((img) => img.type === "primary") ?? release.images?.[0];
  let coverUrl = null;
  if (image?.uri) {
    try {
      coverUrl = await saveRemoteCover(image.uri);
    } catch (err) {
      console.error("Preuzimanje omota sa Discogs-a nije uspjelo:", err.message);
    }
  }

  const descriptions = (release.formats ?? []).flatMap((f) => f.descriptions ?? []);
  const label = release.labels?.[0];

  res.json({
    discogsId: release.id,
    discogsUrl: release.uri ?? `https://www.discogs.com/release/${release.id}`,
    existingRecordId: existing?.id ?? null,
    title: release.title ?? "",
    artist: joinArtists(release.artists ?? []),
    releaseYear: release.year || null,
    label: label ? cleanArtistName(label.name) : null,
    catalogNumber: label?.catno && label.catno !== "none" ? label.catno : null,
    country: translateCountry(release.country),
    format: detectFormat(release.formats ?? []),
    speed: detectSpeed(descriptions),
    genres: await mapGenres(release.genres ?? [], release.styles ?? []),
    tracks: (release.tracklist ?? [])
      .filter((t) => t.type_ === "track" && t.title)
      .map((t) => ({ position: t.position ?? "", title: t.title, duration: t.duration || "" })),
    coverUrl,
  });
}

// Discogs razlikuje istoimene izvođače sufiksom "(2)", a varijacije imena zvjezdicom
function cleanArtistName(name) {
  return String(name ?? "")
    .replace(/\s+\(\d+\)$/, "")
    .replace(/\*$/, "")
    .trim();
}

function joinArtists(artists) {
  return artists
    .map((a, i) => {
      const name = cleanArtistName(a.anv || a.name);
      const join = i < artists.length - 1 ? (a.join === "," ? ", " : ` ${a.join || "&"} `) : "";
      return name + join;
    })
    .join("")
    .trim();
}

function detectFormat(formats) {
  if (formats.some((f) => f.name === "Box Set")) return "Box set";
  const vinyl = formats.find((f) => f.name === "Vinyl") ?? formats[0];
  if (!vinyl) return "LP";
  const desc = vinyl.descriptions ?? [];
  if (desc.includes("LP") && Number(vinyl.qty) >= 2) return "Dupli LP";
  if (desc.includes("LP")) return "LP";
  if (desc.includes("EP")) return "EP";
  if (desc.includes("Single") || desc.includes('7"')) return "Singl";
  return "LP";
}

function detectSpeed(descriptions) {
  if (descriptions.includes("78 RPM")) return "78";
  if (descriptions.includes("45 RPM")) return "45";
  if (descriptions.some((d) => d.startsWith("33"))) return "33";
  return descriptions.includes('7"') ? "45" : "33";
}

async function mapGenres(discogsGenres, styles) {
  const [rows] = await pool.query("SELECT name FROM genres");
  const existing = new Map(rows.map((r) => [r.name.toLowerCase(), r.name]));

  const result = new Set();
  for (const genre of discogsGenres) result.add(GENRE_MAP[genre] ?? genre);
  for (const style of styles) {
    if (STYLE_MAP[style]) result.add(STYLE_MAP[style]);
    else if (existing.has(style.toLowerCase())) result.add(existing.get(style.toLowerCase()));
  }
  // Koristi tačan zapis iz baze ako žanr već postoji (npr. "rock" → "Rock")
  return [...result].map((g) => existing.get(g.toLowerCase()) ?? g);
}

const COUNTRIES = {
  Yugoslavia: "Jugoslavija",
  Serbia: "Srbija",
  "Serbia and Montenegro": "Srbija i Crna Gora",
  Montenegro: "Crna Gora",
  Croatia: "Hrvatska",
  Slovenia: "Slovenija",
  "Bosnia & Herzegovina": "Bosna i Hercegovina",
  "North Macedonia": "Sjeverna Makedonija",
  Germany: "Njemačka",
  "Germany, Austria, & Switzerland": "Njemačka, Austrija i Švajcarska",
  UK: "Velika Britanija",
  US: "SAD",
  Europe: "Evropa",
  France: "Francuska",
  Italy: "Italija",
  Netherlands: "Holandija",
  Japan: "Japan",
  Canada: "Kanada",
  Sweden: "Švedska",
  Spain: "Španija",
  Russia: "Rusija",
  USSR: "SSSR",
};

function translateCountry(country) {
  if (!country) return null;
  return COUNTRIES[country] ?? country;
}

function handleDiscogsError(err, req, res, next) {
  if (err instanceof DiscogsError) return res.status(err.status).json({ error: err.message });
  next(err);
}

module.exports = { searchReleases, importRelease, identifyRelease, handleDiscogsError };
