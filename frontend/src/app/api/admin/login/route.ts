import { API_URL, COOKIE_NAME } from "@/lib/api";

export async function POST(request: Request) {
  const payload = await request.json();

  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = await res.json();
  if (!res.ok) return Response.json(body, { status: res.status });

  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const response = Response.json({ ok: true, username: body.username });
  response.headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=${body.token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 12}${secure}`,
  );
  return response;
}
