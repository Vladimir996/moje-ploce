const pool = require("../db");
const { logActivity } = require("../lib/logger");
const { deleteLocalCover } = require("./uploadsController");

const FORMATS = ["LP", "EP", "Singl", "Dupli LP", "Box set"];
const SPEEDS = ["33", "45", "78"];
const CONDITIONS = ["M", "NM", "VG+", "VG", "G+", "G", "P"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const SORTS = {
  newest: "r.created_at DESC, r.id DESC",
  oldest: "r.created_at ASC, r.id ASC",
  year_desc: "r.release_year IS NULL, r.release_year DESC, r.title",
  year_asc: "r.release_year IS NULL, r.release_year ASC, r.title",
  title: "r.title ASC",
  artist: "a.name ASC, r.release_year ASC",
};

const GENRES_SUBQUERY = `(SELECT GROUP_CONCAT(g.name ORDER BY g.name SEPARATOR '||')
   FROM record_genres rg JOIN genres g ON g.id = rg.genre_id
   WHERE rg.record_id = r.id) AS genre_names`;

async function listRecords(req, res) {
  const { q, artist, genre, format, yearFrom, yearTo, favorite, sort } = req.query;
  const limit = clampInt(req.query.limit, 1, 100, 24);
  const page = clampInt(req.query.page, 1, 100000, 1);

  const where = [];
  const params = [];

  if (q && String(q).trim()) {
    // Kolacija baze već ignoriše kvačice (š = s, ć = c...), ali đ nije d —
    // pa i tekst i upit pretvaramo đ → dj, da "djordje" nađe "Đorđe".
    const like = `%${escapeLike(String(q).trim().replace(/đ/gi, "dj"))}%`;
    const columns = ["r.title", "a.name", "r.label", "r.catalog_number"].map(
      (col) => `REPLACE(REPLACE(${col}, 'đ', 'dj'), 'Đ', 'Dj') LIKE ?`,
    );
    where.push(`(${columns.join(" OR ")})`);
    params.push(like, like, like, like);
  }
  if (artist) {
    where.push("r.artist_id = ?");
    params.push(Number(artist));
  }
  if (genre) {
    where.push("EXISTS (SELECT 1 FROM record_genres rg WHERE rg.record_id = r.id AND rg.genre_id = ?)");
    params.push(Number(genre));
  }
  if (format && FORMATS.includes(format)) {
    where.push("r.format = ?");
    params.push(format);
  }
  if (yearFrom) {
    where.push("r.release_year >= ?");
    params.push(Number(yearFrom));
  }
  if (yearTo) {
    where.push("r.release_year <= ?");
    params.push(Number(yearTo));
  }
  if (favorite === "1") where.push("r.is_favorite = TRUE");

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const orderSql = SORTS[sort] ?? SORTS.newest;

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM records r JOIN artists a ON a.id = r.artist_id ${whereSql}`,
    params,
  );

  const [rows] = await pool.query(
    `SELECT r.*, a.name AS artist_name, ${GENRES_SUBQUERY}
     FROM records r JOIN artists a ON a.id = r.artist_id
     ${whereSql}
     ORDER BY ${orderSql}
     LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit],
  );

  res.json({
    items: rows.map((row) => serializeRecord(row)),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
}

async function getRecord(req, res) {
  const record = await findRecord(req.params.id);
  if (!record) return res.status(404).json({ error: "Ploča nije pronađena." });

  const [tracks] = await pool.query(
    "SELECT position, title, duration FROM tracks WHERE record_id = ? ORDER BY sort_order, id",
    [record.id],
  );

  res.json({ ...serializeRecord(record, { includePrivate: Boolean(req.admin) }), tracks });
}

async function createRecord(req, res) {
  const { data, error } = validateRecord(req.body);
  if (error) return res.status(400).json({ error });

  const id = await saveRecord(null, data);

  await logActivity({
    action: "record.created",
    entityType: "record",
    entityId: id,
    payload: { title: data.title, artist: data.artist, admin: req.admin?.username },
    req,
  });

  res.status(201).json({ ok: true, id });
}

async function updateRecord(req, res) {
  const existing = await findRecord(req.params.id);
  if (!existing) return res.status(404).json({ error: "Ploča nije pronađena." });

  const { data, error } = validateRecord(req.body);
  if (error) return res.status(400).json({ error });

  await saveRecord(existing.id, data);
  if (existing.cover_url !== data.coverUrl) await deleteUnusedCover(existing.cover_url);

  await logActivity({
    action: "record.updated",
    entityType: "record",
    entityId: existing.id,
    payload: { title: data.title, artist: data.artist, admin: req.admin?.username },
    req,
  });

  res.json({ ok: true, id: existing.id });
}

async function toggleFavorite(req, res) {
  const existing = await findRecord(req.params.id);
  if (!existing) return res.status(404).json({ error: "Ploča nije pronađena." });

  const isFavorite = !existing.is_favorite;
  await pool.query("UPDATE records SET is_favorite = ? WHERE id = ?", [isFavorite, existing.id]);
  res.json({ ok: true, id: existing.id, isFavorite });
}

async function deleteRecord(req, res) {
  const existing = await findRecord(req.params.id);
  if (!existing) return res.status(404).json({ error: "Ploča nije pronađena." });

  await pool.query("DELETE FROM records WHERE id = ?", [existing.id]);
  await deleteOrphanArtists(pool);
  await deleteUnusedCover(existing.cover_url);

  await logActivity({
    action: "record.deleted",
    entityType: "record",
    entityId: existing.id,
    payload: { title: existing.title, artist: existing.artist_name, admin: req.admin?.username },
    req,
  });

  res.json({ ok: true });
}

// Upis ploče zajedno sa izvođačem, žanrovima i pjesmama u jednoj transakciji.
async function saveRecord(id, data) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const artistId = await findOrCreate(connection, "artists", data.artist);
    const values = [
      data.title,
      artistId,
      data.releaseYear,
      data.label,
      data.catalogNumber,
      data.country,
      data.format,
      data.speed,
      data.mediaCondition,
      data.sleeveCondition,
      data.coverUrl,
      data.description,
      data.notes,
      data.purchasePrice,
      data.purchaseDate,
      data.purchasedFrom,
      data.isFavorite,
      data.discogsId,
    ];
    const columns = `title = ?, artist_id = ?, release_year = ?, label = ?, catalog_number = ?,
      country = ?, format = ?, speed = ?, media_condition = ?, sleeve_condition = ?, cover_url = ?,
      description = ?, notes = ?, purchase_price = ?, purchase_date = ?, purchased_from = ?, is_favorite = ?,
      discogs_id = ?`;

    let recordId = id;
    if (recordId) {
      await connection.query(`UPDATE records SET ${columns} WHERE id = ?`, [...values, recordId]);
      await connection.query("DELETE FROM record_genres WHERE record_id = ?", [recordId]);
      await connection.query("DELETE FROM tracks WHERE record_id = ?", [recordId]);
    } else {
      const [result] = await connection.query(`INSERT INTO records SET ${columns}`, values);
      recordId = result.insertId;
    }

    for (const genreName of data.genres) {
      const genreId = await findOrCreate(connection, "genres", genreName);
      await connection.query("INSERT IGNORE INTO record_genres (record_id, genre_id) VALUES (?, ?)", [
        recordId,
        genreId,
      ]);
    }

    for (const [index, track] of data.tracks.entries()) {
      await connection.query(
        "INSERT INTO tracks (record_id, position, title, duration, sort_order) VALUES (?, ?, ?, ?, ?)",
        [recordId, track.position, track.title, track.duration, index],
      );
    }

    await deleteOrphanArtists(connection);
    await connection.commit();
    return recordId;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

// Vraća id postojećeg reda po imenu (bez obzira na velika/mala slova) ili ga kreira.
async function findOrCreate(connection, table, name) {
  const [result] = await connection.query(
    `INSERT INTO ${table} (name) VALUES (?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
    [name],
  );
  return result.insertId;
}

// Isti omot može koristiti više ploča (npr. dva primjerka uvezena sa Discogs-a)
async function deleteUnusedCover(coverUrl) {
  if (!coverUrl) return;
  const [rows] = await pool.query("SELECT 1 FROM records WHERE cover_url = ? LIMIT 1", [coverUrl]);
  if (rows.length === 0) deleteLocalCover(coverUrl);
}

async function deleteOrphanArtists(connection) {
  await connection.query(
    "DELETE FROM artists WHERE NOT EXISTS (SELECT 1 FROM records r WHERE r.artist_id = artists.id)",
  );
}

async function findRecord(id) {
  const [rows] = await pool.query(
    `SELECT r.*, a.name AS artist_name, ${GENRES_SUBQUERY}
     FROM records r JOIN artists a ON a.id = r.artist_id
     WHERE r.id = ?`,
    [Number(id)],
  );
  return rows[0] ?? null;
}

function validateRecord(body) {
  const b = body ?? {};
  const title = text(b.title, 200);
  const artist = text(b.artist, 160);
  if (!title) return { error: "Naziv ploče je obavezan." };
  if (!artist) return { error: "Izvođač je obavezan." };

  const maxYear = new Date().getFullYear() + 1;
  const releaseYear = b.releaseYear ? Number(b.releaseYear) : null;
  if (releaseYear !== null && (!Number.isInteger(releaseYear) || releaseYear < 1890 || releaseYear > maxYear)) {
    return { error: `Godina izdanja mora biti između 1890 i ${maxYear}.` };
  }

  const format = b.format || "LP";
  if (!FORMATS.includes(format)) return { error: `Format mora biti jedan od: ${FORMATS.join(", ")}` };
  const speed = String(b.speed || "33");
  if (!SPEEDS.includes(speed)) return { error: `Brzina mora biti jedna od: ${SPEEDS.join(", ")}` };

  const mediaCondition = b.mediaCondition || null;
  const sleeveCondition = b.sleeveCondition || null;
  if (
    (mediaCondition && !CONDITIONS.includes(mediaCondition)) ||
    (sleeveCondition && !CONDITIONS.includes(sleeveCondition))
  ) {
    return { error: `Stanje mora biti jedno od: ${CONDITIONS.join(", ")}` };
  }

  const coverUrl = text(b.coverUrl, 500);
  if (coverUrl && !/^(https?:\/\/|\/covers\/)/.test(coverUrl)) {
    return { error: "Link omota mora počinjati sa http:// ili https://." };
  }

  const purchasePrice = b.purchasePrice === "" || b.purchasePrice == null ? null : Number(b.purchasePrice);
  if (purchasePrice !== null && (!Number.isFinite(purchasePrice) || purchasePrice < 0)) {
    return { error: "Cijena mora biti pozitivan broj." };
  }
  const purchaseDate = b.purchaseDate || null;
  if (purchaseDate && !DATE_RE.test(purchaseDate)) return { error: "Neispravan format datuma kupovine." };

  const discogsId = b.discogsId ? Number(b.discogsId) : null;
  if (discogsId !== null && (!Number.isInteger(discogsId) || discogsId <= 0)) {
    return { error: "Neispravan Discogs ID." };
  }

  const genres = Array.isArray(b.genres)
    ? [...new Set(b.genres.map((g) => text(g, 60)).filter(Boolean))]
    : [];
  const tracks = Array.isArray(b.tracks)
    ? b.tracks
        .map((t) => ({
          position: text(t?.position, 10) ?? "",
          title: text(t?.title, 200),
          duration: text(t?.duration, 10),
        }))
        .filter((t) => t.title)
    : [];

  return {
    data: {
      title,
      artist,
      releaseYear,
      label: text(b.label, 120),
      catalogNumber: text(b.catalogNumber, 60),
      country: text(b.country, 80),
      format,
      speed,
      mediaCondition,
      sleeveCondition,
      coverUrl,
      description: text(b.description, 10000),
      notes: text(b.notes, 10000),
      purchasePrice,
      purchaseDate,
      purchasedFrom: text(b.purchasedFrom, 160),
      isFavorite: Boolean(b.isFavorite),
      discogsId,
      genres,
      tracks,
    },
  };
}

function serializeRecord(row, { includePrivate = false } = {}) {
  const record = {
    id: row.id,
    title: row.title,
    artist: { id: row.artist_id, name: row.artist_name },
    releaseYear: row.release_year,
    label: row.label,
    catalogNumber: row.catalog_number,
    country: row.country,
    format: row.format,
    speed: row.speed,
    mediaCondition: row.media_condition,
    sleeveCondition: row.sleeve_condition,
    coverUrl: row.cover_url,
    description: row.description,
    genres: row.genre_names ? row.genre_names.split("||") : [],
    isFavorite: Boolean(row.is_favorite),
    discogsId: row.discogs_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (includePrivate) {
    record.notes = row.notes;
    record.purchasePrice = row.purchase_price === null ? null : Number(row.purchase_price);
    record.purchaseDate = row.purchase_date;
    record.purchasedFrom = row.purchased_from;
  }

  return record;
}

function text(value, maxLength) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

module.exports = {
  listRecords,
  getRecord,
  createRecord,
  updateRecord,
  toggleFavorite,
  deleteRecord,
  FORMATS,
  SPEEDS,
  CONDITIONS,
};
