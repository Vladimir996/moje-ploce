import { proxyAdmin } from "@/lib/api";

// Prosljeđuje sliku omota (multipart, polje "cover") backend-u.
export async function POST(request: Request) {
  const form = await request.formData();
  return proxyAdmin("/uploads", { method: "POST", body: form });
}
