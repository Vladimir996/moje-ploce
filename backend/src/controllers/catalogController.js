const pool = require("../db");

// Izvođači koji imaju bar jednu ploču u kolekciji — za filter.
async function listArtists(req, res) {
  const [rows] = await pool.query(
    `SELECT a.id, a.name, COUNT(r.id) AS recordCount
     FROM artists a JOIN records r ON r.artist_id = a.id
     GROUP BY a.id, a.name
     ORDER BY a.name`,
  );
  res.json(rows);
}

async function listGenres(req, res) {
  const [rows] = await pool.query(
    `SELECT g.id, g.name, COUNT(rg.record_id) AS recordCount
     FROM genres g LEFT JOIN record_genres rg ON rg.genre_id = g.id
     GROUP BY g.id, g.name
     ORDER BY g.name`,
  );
  res.json(rows);
}

async function getStats(req, res) {
  const [[totals]] = await pool.query(
    `SELECT COUNT(*) AS records,
            COUNT(DISTINCT artist_id) AS artists,
            SUM(is_favorite) AS favorites,
            MIN(release_year) AS oldestYear,
            MAX(release_year) AS newestYear,
            MAX(created_at) AS lastAddedAt
     FROM records`,
  );
  const [formats] = await pool.query(
    "SELECT format, COUNT(*) AS count FROM records GROUP BY format ORDER BY count DESC",
  );
  const [decades] = await pool.query(
    `SELECT FLOOR(release_year / 10) * 10 AS decade, COUNT(*) AS count
     FROM records WHERE release_year IS NOT NULL
     GROUP BY decade ORDER BY decade`,
  );

  res.json({
    records: totals.records,
    artists: totals.artists,
    favorites: Number(totals.favorites ?? 0),
    oldestYear: totals.oldestYear,
    newestYear: totals.newestYear,
    lastAddedAt: totals.lastAddedAt,
    formats,
    decades: decades.map((d) => ({ decade: Number(d.decade), count: d.count })),
  });
}

module.exports = { listArtists, listGenres, getStats };
