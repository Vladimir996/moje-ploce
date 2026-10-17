# Moje ploče — frontend

Next.js (App Router, TypeScript, Tailwind CSS v4).

## Podešavanje

1. `frontend/.env.local`: `API_URL=http://localhost:4000/api` (adresa backend-a)
2. `npm install`
3. `npm run dev` → http://localhost:3000

## Struktura

```
src/app/
  page.tsx                    kolekcija (grid, filteri, paginacija)
  ploce/[id]/page.tsx         detalji ploče
  admin/login|nova|ploce/[id] prijava, nova ploča, izmjena
  api/admin/...               proxy rute ka backend-u (token iz HttpOnly kolačića)
src/components/               RecordCard, Filters, Pagination, Cover, admin/RecordForm...
src/lib/                      api (server fetch), types, constants, format
```

Omoti su na Cloudinary-ju — `components/Cover.tsx` dodaje u link transformacije (`f_auto,q_auto,w_...`) da browser dobije sliku tačne veličine.
