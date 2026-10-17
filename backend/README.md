# Moje ploče — backend

Node.js/Express API + MySQL baza za kolekciju ploča.

## Podešavanje

1. Kopiraj `.env.example` u `.env` i upiši podatke za MySQL (i nasumičan `JWT_SECRET`).
2. `npm install`
3. `npm run db:migrate` — kreira bazu (ako nalog smije), tabele i početne žanrove. Može se pokretati više puta.
4. `npm run db:create-admin -- <korisnicko_ime> <lozinka>` — kreira admin nalog ili mijenja lozinku postojećem.
5. `npm run dev` (nodemon) ili `npm start`.

## Struktura

```
db/
  schema.sql          tabele: artists, genres, records, record_genres, tracks, admins, activity_logs
  seed.sql            početni žanrovi
  migrate.js          kreira bazu/šemu + seed
  create-admin.js     admin nalog
src/
  server.js           Express app, rute, obrada grešaka
  db.js               MySQL pool
  routes/             records, catalog (artists/genres/stats), uploads, auth
  controllers/        logika i SQL upiti
  middleware/         requireAdmin (JWT), requestLogger
  lib/logger.js       upis u activity_logs
uploads/              otpremljeni omoti (nije u git-u)
```

## API

| Metoda | Ruta | Opis |
|---|---|---|
| GET | `/api/records` | Lista ploča. Parametri: `q`, `artist`, `genre`, `format`, `yearFrom`, `yearTo`, `favorite=1`, `sort` (`newest` · `oldest` · `year_desc` · `year_asc` · `title` · `artist`), `page`, `limit` |
| GET | `/api/records/:id` | Detalji + pjesme (privatna polja samo uz admin token) |
| POST | `/api/records` | 🔒 Nova ploča |
| PUT | `/api/records/:id` | 🔒 Izmjena ploče |
| PATCH | `/api/records/:id/favorite` | 🔒 Uključi/isključi omiljenu |
| DELETE | `/api/records/:id` | 🔒 Brisanje (briše i lokalni omot) |
| POST | `/api/uploads` | 🔒 Otpremanje omota (multipart, polje `cover`) → `{ url: "/covers/..." }` |
| GET | `/api/uploads/:file` | Slika omota |
| GET | `/api/discogs/search` | 🔒 Pretraga Discogs-a: `q` + `by` (`catno` · `barcode` · `q`) |
| GET | `/api/discogs/releases/:id` | 🔒 Izdanje prevedeno u polja forme + omot skinut u `uploads/` + `existingRecordId` ako već postoji |
| GET | `/api/artists` | Izvođači sa brojem ploča |
| GET | `/api/genres` | Žanrovi sa brojem ploča |
| GET | `/api/stats` | Statistika kolekcije |
| POST | `/api/auth/login` | `{ username, password }` → `{ token }` |

🔒 = potreban `Authorization: Bearer <token>`.

Izvođači i žanrovi se šalju kao tekst (`"artist": "Bijelo dugme"`, `"genres": ["Rock"]`) — postojeći se pronalaze po imenu, novi se kreiraju. Izvođači bez ijedne ploče se automatski brišu.

## Discogs

Uvoz radi bez ikakvog podešavanja (Discogs dozvoljava 25 zahtjeva/min bez tokena, ali pretraga tada ne vraća sličice). Za sličice i 60 zahtjeva/min: [discogs.com/settings/developers](https://www.discogs.com/settings/developers) → **Generate new token** → upiši u `.env` kao `DISCOGS_TOKEN=...` i restartuj backend.

Mapiranje: Discogs žanrovi se prevode u naše (`Electronic` → Elektronska, `Hip Hop` → Hip-hop...), stilovi se uzimaju ako odgovaraju postojećem žanru, a zemlje se prevode (`Yugoslavia` → Jugoslavija). Pravila su u `src/controllers/discogsController.js`.

> Napomena za hosting: omoti se čuvaju na disku servera. Na besplatnim platformama sa privremenim diskom (npr. Render free) otpremljene slike nestaju pri redeploy-u — tamo je bolje koristiti link do slike.
