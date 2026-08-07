/**
 * Thin fetch wrapper around the FastAPI backend (`/api/v1`, see 05-architecture §A1).
 *
 * - Access token is held in memory only (§A4); refresh happens via the httpOnly
 *   cookie the backend sets, so this client never reads or stores it.
 * - `credentials: "include"` sends the refresh cookie on the refresh call.
 * - Server Components pass no token and rely on request cookies; Client Components
 *   attach the in-memory access token via `setAccessToken`.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  /** JSON-serialisable body; set automatically with the right content-type. */
  json?: unknown;
  /** Skip attaching the in-memory access token (e.g. the login call). */
  anonymous?: boolean;
};

export async function apiFetch<T = unknown>(
  path: string,
  { json, anonymous, headers, ...init }: RequestOptions = {},
): Promise<T> {
  const finalHeaders = new Headers(headers);
  if (json !== undefined) {
    finalHeaders.set("Content-Type", "application/json");
  }
  if (!anonymous && accessToken) {
    finalHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: finalHeaders,
    credentials: "include",
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const message =
      (isJson && (payload as { detail?: string })?.detail) ||
      `Request failed with ${res.status}`;
    throw new ApiError(res.status, String(message), payload);
  }

  return payload as T;
}
