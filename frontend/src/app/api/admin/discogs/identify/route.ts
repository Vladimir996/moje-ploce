import { proxyAdmin } from "@/lib/api";

// Pročitan barkod/tekst sa fotografije ploče → backend pronalazi izdanje na Discogs-u
export async function POST(request: Request) {
  return proxyAdmin("/discogs/identify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(await request.json()),
  });
}
