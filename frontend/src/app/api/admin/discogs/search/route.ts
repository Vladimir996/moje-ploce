import { proxyAdmin } from "@/lib/api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return proxyAdmin(`/discogs/search?${searchParams.toString()}`);
}
