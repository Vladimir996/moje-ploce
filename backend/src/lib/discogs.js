// Klijent za Discogs API (https://www.discogs.com/developers).
// Radi i bez tokena (25 zahtjeva/min, pretraga bez sličica); sa ličnim tokenom
// iz DISCOGS_TOKEN dobijaju se sličice u pretrazi i 60 zahtjeva/min.

const BASE_URL = "https://api.discogs.com";
const USER_AGENT = "PloceKolekcija/1.0 +http://localhost";

class DiscogsError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function discogsHeaders() {
  const headers = { "User-Agent": USER_AGENT, Accept: "application/json" };
  if (process.env.DISCOGS_TOKEN) headers.Authorization = `Discogs token=${process.env.DISCOGS_TOKEN}`;
  return headers;
}

async function discogsGet(path, params = {}) {
  const url = new URL(path, BASE_URL);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }

  let res;
  try {
    res = await fetch(url, { headers: discogsHeaders(), signal: AbortSignal.timeout(10000) });
  } catch {
    throw new DiscogsError(502, "Discogs nije dostupan. Provjeri internet konekciju.");
  }

  if (res.status === 404) throw new DiscogsError(404, "Izdanje nije pronađeno na Discogs-u.");
  if (res.status === 429) {
    throw new DiscogsError(429, "Previše zahtjeva ka Discogs-u — sačekaj minut pa probaj ponovo.");
  }
  if (res.status === 401) throw new DiscogsError(502, "Discogs je odbio token (DISCOGS_TOKEN u .env).");
  if (!res.ok) throw new DiscogsError(502, `Discogs je vratio grešku (${res.status}).`);

  return res.json();
}

module.exports = { discogsGet, DiscogsError, USER_AGENT };
