/**
 * HTTP client for integration tests.
 * Manages cookies (NextAuth session), base URL, and JSON helpers.
 * LLM-friendly: each method returns { status, body } — no surprises.
 */

export interface HttpResponse<T = unknown> {
  status: number;
  body:   T;
  raw:    string;
}

export class TestClient {
  private cookieJar: Map<string, string> = new Map();
  public baseUrl: string;
  public lastResponseText = "";

  constructor(baseUrl: string) {
    // Strip trailing slash
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  private buildCookieHeader(): string {
    return Array.from(this.cookieJar.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  private storeCookies(headers: Headers) {
    // Node 18.14+ exposes getSetCookie() which returns a proper string[] —
    // one entry per Set-Cookie header, no ambiguous comma joining.
    // Older Node concatenates all Set-Cookie headers into one string with ", "
    // separators, which is ambiguous when cookie values contain commas (e.g. dates).
    const cookies: string[] = typeof (headers as unknown as { getSetCookie?: () => string[] }).getSetCookie === "function"
      ? (headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
      : this.splitSetCookieFallback(headers.get("set-cookie") ?? "");

    for (const raw of cookies) {
      const nameVal = raw.split(";")[0].trim();
      const eq = nameVal.indexOf("=");
      if (eq === -1) continue;
      const name  = nameVal.slice(0, eq).trim();
      const value = nameVal.slice(eq + 1).trim();
      if (name) this.cookieJar.set(name, value);
    }
  }

  /**
   * Fallback splitter for Node versions that don't have getSetCookie().
   * Splits on ", " only when followed by a known cookie-name pattern (word chars + =).
   */
  private splitSetCookieFallback(raw: string): string[] {
    if (!raw) return [];
    // Split on ", " followed by a token that looks like "name=" to avoid splitting
    // on commas inside Expires dates ("Thu, 01 Jan ...").
    return raw.split(/,\s*(?=[\w-]+=)/);
  }

  async get<T = unknown>(path: string, headers: Record<string, string> = {}): Promise<HttpResponse<T>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method:  "GET",
      headers: { "Cookie": this.buildCookieHeader(), ...headers },
    });
    this.storeCookies(res.headers);
    const raw = await res.text();
    this.lastResponseText = raw;
    const body = this.parseJson<T>(raw);
    return { status: res.status, body, raw };
  }

  async post<T = unknown>(path: string, data: unknown, headers: Record<string, string> = {}): Promise<HttpResponse<T>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": this.buildCookieHeader(),
        ...headers,
      },
      body: JSON.stringify(data),
    });
    this.storeCookies(res.headers);
    const raw = await res.text();
    this.lastResponseText = raw;
    const body = this.parseJson<T>(raw);
    return { status: res.status, body, raw };
  }

  async patch<T = unknown>(path: string, data: unknown, headers: Record<string, string> = {}): Promise<HttpResponse<T>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method:  "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Cookie": this.buildCookieHeader(),
        ...headers,
      },
      body: JSON.stringify(data),
    });
    this.storeCookies(res.headers);
    const raw = await res.text();
    this.lastResponseText = raw;
    const body = this.parseJson<T>(raw);
    return { status: res.status, body, raw };
  }

  async postForm<T = unknown>(path: string, data: Record<string, string>): Promise<HttpResponse<T>> {
    const form = new URLSearchParams(data);
    const res = await fetch(`${this.baseUrl}${path}`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": this.buildCookieHeader(),
      },
      body: form.toString(),
    });
    this.storeCookies(res.headers);
    const raw = await res.text();
    this.lastResponseText = raw;
    const body = this.parseJson<T>(raw);
    return { status: res.status, body, raw };
  }

  private parseJson<T>(raw: string): T {
    try { return JSON.parse(raw) as T; }
    catch { return raw as unknown as T; }
  }

  /** Full NextAuth credentials login flow: CSRF token → sign-in POST → session cookie. */
  async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    // Step 1: get CSRF token
    const csrfRes = await this.get<{ csrfToken?: string }>("/api/auth/csrf");
    const csrfToken = (csrfRes.body as { csrfToken?: string }).csrfToken;
    if (!csrfToken) return { success: false, error: "Could not get CSRF token" };

    // Step 2: POST to credentials callback
    const signInRes = await this.postForm("/api/auth/callback/credentials", {
      email,
      password,
      csrfToken,
      callbackUrl: "/dashboard",
      json: "true",
    });

    // NextAuth on success returns a redirect (302) or JSON with url
    const isOk = signInRes.status < 400;
    if (!isOk) return { success: false, error: `sign-in HTTP ${signInRes.status}: ${signInRes.raw.slice(0, 200)}` };

    // Step 3: verify session cookie is now present
    const sessionRes = await this.get<{ user?: { id?: string } }>("/api/auth/session");
    const userId = (sessionRes.body as { user?: { id?: string } })?.user?.id;
    if (!userId) return { success: false, error: "No session after sign-in" };

    return { success: true };
  }

  clearCookies() {
    this.cookieJar.clear();
  }

  hasCookie(name: string): boolean {
    return this.cookieJar.has(name);
  }
}
