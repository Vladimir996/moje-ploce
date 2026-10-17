import { proxyAdmin } from "@/lib/api";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyAdmin(`/records/${encodeURIComponent(id)}/favorite`, { method: "PATCH" });
}
