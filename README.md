# Moje ploče

Evidencija lične kolekcije gramofonskih ploča — grid kartica sa omotima, detalji svake ploče, pretraga, filteri i admin panel za dodavanje/izmjenu.

Projekat je podijeljen u dva odvojena dijela (isto kao Etno selo Raonica):

- **[`frontend/`](frontend/)** — Next.js (App Router, TypeScript, Tailwind CSS v4): kolekcija, detalji ploče, admin forma.
- **[`backend/`](backend/)** — Node.js/Express API + MySQL baza: ploče, izvođači, žanrovi, pjesme, omoti, admin autentifikacija.

## Brzo pokretanje

```bash
# 1. MySQL mora biti pokrenut (podrazumijevano 127.0.0.1:3306, root bez lozinke — vidi backend/.env)

# 2. Backend — API na http://localhost:4000
cd backend
npm install
npm run db:migrate                                        # prvi put: kreira bazu ploce_kolekcija i tabele
npm run db:create-admin -- <korisnicko_ime> <lozinka>     # prvi put: admin nalog
npm run dev

# 3. Frontend — sajt na http://localhost:3000 (u novom terminalu)
cd frontend
npm install
npm run dev
```

Frontend se povezuje sa backend-om preko `frontend/.env.local` (`API_URL`), a nikad direktno iz browsera — sve ide kroz Next.js server komponente i API rute kao proxy. Omoti se čuvaju na [Cloudinary](https://cloudinary.com)-ju (`CLOUDINARY_URL` u `backend/.env`), a u bazi je samo njihov link.

## Šta aplikacija ima

**Kolekcija (`/`)**
- Grid kartica sa omotom — na hover ploča "izviri" iz omota
- Podrazumijevano sortirano od **najnovije dodatih ka najstarijim**
- Pretraga po nazivu ploče, izvođaču, izdavaču i kataloškom broju (radi i bez kvačica: `balasevic`, `djordje`)
- Filteri: izvođač, žanr, format, decenija izdanja, samo omiljene
- Sortiranje: datum dodavanja, godina izdanja, naziv, izvođač
- Filteri su u URL-u (`/?izvodjac=3&decenija=1970`) — link se može sačuvati/podijeliti
- Statistika: broj ploča, izvođača, raspon godina; paginacija po 25

**Detalji ploče (`/ploce/[id]`)**
- Veliki omot, izvođač (klik → filtrira kolekciju po njemu), godina, izdavač, kataloški broj, zemlja, format, brzina
- Stanje ploče i omota po Goldmine skali (M, NM, VG+, VG, G+, G, P)
- Opis, žanrovi, spisak pjesama grupisan po stranama (A, B...)
- Datum dodavanja u kolekciju i posljednje izmjene
- Za prijavljenog admina: cijena, datum i mjesto kupovine, privatne bilješke + dugmad Izmijeni / Omiljena / Obriši

**Admin (`/admin/login`, `/admin/nova`, `/admin/ploce/[id]`)**
- **Uvoz sa Discogs-a**: pretraga po kataloškom broju, barkodu ili izvođaču/nazivu (ili nalijepi link izdanja) → forma se sama popuni (naziv, izvođač, godina, izdavač, kataloški broj, zemlja, format, brzina, žanrovi, pjesme), a omot se prebaci na Cloudinary. Upozorava ako to izdanje već imaš. Opciono `DISCOGS_TOKEN` u `backend/.env` za sličice u rezultatima i veći limit.
- **Pretraga slikom (besplatno, u browseru)**: dugme „📷 Slikaj ploču” → čita se barkod (zxing-wasm) ili tekst sa etikete (Tesseract OCR, srpska latinica/ćirilica/engleski) → backend redom proba barkod, kataloški broj (sa ispravkom tipičnih OCR grešaka, npr. `15Y-10023` → `LSY-10023`) i najkrupnije pročitane riječi. Najbolje radi slika etikete izbliza ili bar-koda; rukopisna slova OCR ne čita.
- Forma sa prijedlozima postojećih izvođača i žanrova (novi se kreiraju automatski)
- Omot: otpremanje slike (do 8 MB) ili link do slike sa interneta
- Dinamičan spisak pjesama (pozicija se sama predlaže: A1 → A2...)
