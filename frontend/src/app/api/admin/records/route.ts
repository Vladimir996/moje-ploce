import { proxyAdmin } from "@/lib/api";

export async function POST(request: Request) {
  return proxyAdmin("/records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(await request.json()),
  });
}
