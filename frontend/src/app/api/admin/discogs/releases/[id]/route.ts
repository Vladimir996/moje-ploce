import { proxyAdmin } from "@/lib/api";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyAdmin(`/discogs/releases/${encodeURIComponent(id)}`);
}
