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

/** One FastAPI validation failure, as it appears inside a 422 `detail`. */
type ValidationDetail = { loc?: unknown[]; msg?: string };

/**
 * Turn an error body into something a person can read.
 *
 * A DomainError sends `detail` as a plain string, but FastAPI's own 422 sends
 * an *array* of `{loc, msg}` objects. Both used to go through `String(...)`,
 * which renders the array as "[object Object]" — so a mistyped field showed the
 * user nothing at all about what was wrong, and hid genuine server errors
 * behind the same meaningless text.
 */
function errorMessageFrom(payload: unknown, status: number): string {
  const detail = (payload as { detail?: unknown } | null)?.detail;

  if (typeof detail === "string" && detail.trim()) return detail;

  if (Array.isArray(detail)) {
    const parts = (detail as ValidationDetail[])
      .map((item) => {
        const msg = typeof item?.msg === "string" ? item.msg : null;
        if (!msg) return null;
        // `loc` is ["body", "to", 0]; the field name is what the user can act
        // on, so drop the "body" prefix and the array index.
        const field = Array.isArray(item.loc)
          ? item.loc.filter(
              (part) => typeof part === "string" && part !== "body",
            )
          : [];
        return field.length ? `${field.join(".")}: ${msg}` : msg;
      })
      .filter((part): part is string => Boolean(part));
    if (parts.length) return parts.join("; ");
  }

  // Some errors carry a bare message instead of `detail`.
  const message = (payload as { message?: unknown } | null)?.message;
  if (typeof message === "string" && message.trim()) return message;

  return `Request failed with ${status}`;
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

/**
 * Renew the access token from outside `apiFetch`.
 *
 * The notification stream is a long-lived `fetch` rather than a series of
 * requests, so it never passes through the 401-retry above — when its token
 * expires mid-stream the connection just ends, and it has to renew before
 * reconnecting. Returns false when there is no session left to renew.
 */
export async function refreshSession(): Promise<boolean> {
  return refreshHandler ? refreshHandler() : false;
}

type RequestOptions = Omit<RequestInit, "body"> & {
  /** JSON-serialisable body; set automatically with the right content-type. */
  json?: unknown;
  /**
   * Raw body, for the file uploads the import channels need. Pass a `FormData`
   * and leave the content-type alone: only the browser can generate the
   * multipart boundary, and setting the header by hand produces a request the
   * server cannot parse.
   *
   * `string` is deliberately excluded so that a JSON payload cannot be sent
   * down this path. A raw string body makes the browser set
   * `text/plain;charset=UTF-8`, and FastAPI only parses a body as JSON when
   * the content-type is `application/json` — so the endpoint received the
   * JSON *text* and rejected it with "Input should be a valid dictionary or
   * object to extract fields from". Three inbox mutations shipped that way.
   * Use `json` for anything JSON-shaped; the compiler now insists.
   */
  body?: Exclude<BodyInit, string>;
  /** Skip attaching the in-memory access token (e.g. the login call). */
  anonymous?: boolean;
  /**
   * Return the raw response body as a Blob instead of parsing it.
   *
   * Needed for the mail-attachment download: the default path reads a
   * non-JSON response with `res.text()`, which decodes bytes as UTF-8 and
   * silently corrupts anything binary — a PDF downloaded that way opens as a
   * damaged file. Kept as a flag on this wrapper rather than a bare `fetch`
   * at the call site so blob downloads still get the 401 refresh-and-retry.
   */
  blob?: boolean;
  /** Internal: set once a 401 has already triggered a refresh-and-retry. */
  retried?: boolean;
};

export async function apiFetch<T = unknown>(
  path: string,
  { json, body, anonymous, blob, retried, headers, ...init }: RequestOptions = {},
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
    body: json !== undefined ? JSON.stringify(json) : body,
  });

  // The access token lives ~15 minutes; on expiry renew it once and replay.
  if (res.status === 401 && !anonymous && !retried && refreshHandler) {
    const renewed = await refreshHandler();
    if (renewed) {
      // A FormData body is replayable, so an upload that raced the token
      // expiring is retried rather than lost.
      return apiFetch<T>(path, {
        ...init,
        json,
        body,
        headers,
        blob,
        retried: true,
      });
    }
  }

  if (res.status === 204) {
    return undefined as T;
  }

  // An error response is JSON even when the happy path is binary, so the
  // blob branch has to sit after the status check, not before it.
  if (res.ok && blob) {
    return (await res.blob()) as T;
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    throw new ApiError(
      res.status,
      errorMessageFrom(isJson ? payload : null, res.status),
      payload,
    );
  }

  return payload as T;
}
