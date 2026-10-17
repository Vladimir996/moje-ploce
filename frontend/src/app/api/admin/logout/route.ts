import { COOKIE_NAME } from "@/lib/api";

export async function POST() {
  const response = Response.json({ ok: true });
  response.headers.append("Set-Cookie", `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
  return response;
}
