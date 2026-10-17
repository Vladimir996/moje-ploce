import { proxyAdmin } from "@/lib/api";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  const { id } = await params;
  return proxyAdmin(`/records/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(await request.json()),
  });
}

export async function DELETE(request: Request, { params }: Context) {
  const { id } = await params;
  return proxyAdmin(`/records/${encodeURIComponent(id)}`, { method: "DELETE" });
}
