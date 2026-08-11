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

/**
 * Called when a request comes back 401 so the session can be renewed from the
 * refresh cookie. Registered by the auth provider to avoid a circular import;
 * it must de-duplicate concurrent calls, because the backend rotates refresh
 * tokens and treats a replayed one as theft (05-architecture §A4).
 */
type RefreshHandler = () => Promise<boolean>;

let refreshHandler: RefreshHandler | null = null;

export function setRefreshHandler(handler: RefreshHandler | null) {
  refreshHandler = handler;
}

type RequestOptions = Omit<RequestInit, "body"> & {
  /** JSON-serialisable body; set automatically with the right content-type. */
  json?: unknown;
  /** Skip attaching the in-memory access token (e.g. the login call). */
  anonymous?: boolean;
  /** Internal: set once a 401 has already triggered a refresh-and-retry. */
  retried?: boolean;
};

export async function apiFetch<T = unknown>(
  path: string,
  { json, anonymous, retried, headers, ...init }: RequestOptions = {},
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

  // The access token lives ~15 minutes; on expiry renew it once and replay.
  if (res.status === 401 && !anonymous && !retried && refreshHandler) {
    const renewed = await refreshHandler();
    if (renewed) {
      return apiFetch<T>(path, {
        ...init,
        json,
        headers,
        retried: true,
      });
    }
  }

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
