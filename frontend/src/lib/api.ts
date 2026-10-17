import { cookies } from "next/headers";
import type { Artist, Genre, RecordsPage, Stats, VinylRecordDetail } from "./types";

// Samo za server komponente i API rute — browser nikad ne zove backend direktno.
export const API_URL = process.env.API_URL ?? "http://localhost:4000/api";
export const COOKIE_NAME = "admin_token";

export async function getAdminToken(): Promise<string | undefined> {
  return (await cookies()).get(COOKIE_NAME)?.value;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function apiGet<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: "no-store",
  });
  if (!res.ok) throw new ApiError(res.status, `GET ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export function getRecords(params: URLSearchParams) {
  return apiGet<RecordsPage>(`/records?${params.toString()}`);
}

export async function getRecord(id: string, token?: string) {
  try {
    return await apiGet<VinylRecordDetail>(`/records/${encodeURIComponent(id)}`, token);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export function getArtists() {
  return apiGet<Artist[]>("/artists");
}

export function getGenres() {
  return apiGet<Genre[]>("/genres");
}

export function getStats() {
  return apiGet<Stats>("/stats");
}

// Prosljeđuje admin zahtjev backend-u sa tokenom iz HttpOnly kolačića.
export async function proxyAdmin(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAdminToken();
  if (!token) return Response.json({ error: "Niste prijavljeni." }, { status: 401 });

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });

  const body = await res.json().catch(() => ({ error: "Neispravan odgovor servera." }));
  return Response.json(body, { status: res.status });
}
