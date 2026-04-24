# Timeweb MCP Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a stdio MCP server wrapping Timeweb hosting API for domain + DNS management (list/info/DNS read-write).

## Probe findings (Task 2 — confirmed against live API 2026-04-24)

**Auth:** `POST https://api.timeweb.ru/v1.2/access` with HTTP Basic (`-u login:password`) and header `X-App-Key: {appkey}`. NO JSON body. Response: `{ token, token_type: "bearer", expires_in, ... }`. Use `res.data.token`.

**List domains:** `GET /v1/accounts/{login}/domains` → flat `string[]` of FQDNs (e.g. `["a.ru","b.com"]`).

**Get domain:** `GET /v1/accounts/{login}/domains/{fqdn}` → object with `fqdn`, `id`, `expiration`, `records[]` (legacy shape, lowercase types) and many other fields. No nameserver fields.

**List DNS records:** `GET /v1.2/accounts/{login}/domains/{fqdn}/user-records` → `[{ id, type: "A"|"AAAA"|"CNAME"|"MX"|"TXT"|"SRV", data: {...}, ttl }]`. `{fqdn}` is either zone or subdomain FQDN — each has its own record collection.

**Add DNS record:** `POST /v1.2/accounts/{login}/domains/{fqdn}/user-records/` with body `{ type, data }`. Per-type data shapes (verified live):
  - `A`:     `{ value }` — IPv4 at FQDN. `data.subdomain` REJECTED.
  - `AAAA`:  `{ value }` — IPv6 at FQDN. `data.subdomain` REJECTED.
  - `CNAME`: `{ value }` — at FQDN. `data.subdomain` REJECTED.
  - `MX`:    `{ priority, value }` — at FQDN. `data.subdomain` REJECTED.
  - `TXT`:   `{ value, subdomain? }` — the ONLY type that accepts `data.subdomain` (useful for `_dmarc`, `_acme-challenge`, etc.).
  - `SRV`:   `{ host, port, priority, protocol, service }` — no weight/target; `host` = FQDN target, `service` like `_sip`, `protocol` like `_TCP`.
  - `NS`:    500 Internal server error — NOT supported via user-records. Dropped from scope.

**Subdomains for non-TXT records:** to add A/AAAA/CNAME/MX/SRV at a subdomain, the subdomain entity must exist. Create via `POST /v1.1/accounts/{login}/domains/{domain}/subdomains/{subdomain}` (tolerate HTTP 409 "entity_already_exists"). Then POST the record to `/v1.2/.../domains/{subdomain}.{domain}/user-records/`. The client encapsulates this.

**Delete DNS record:** `DELETE /v1.2/accounts/{login}/domains/{fqdn}/user-records/{id}/` → HTTP 204. Record ids are unique within a given FQDN's record set; the FQDN in the path must match where the record was added.

**Nameservers:** no read or update endpoint found. `get_nameservers` and `update_nameservers` tools are dropped; users must manage NS through the Timeweb control panel. Documented in README.

**Success codes:** 200 on GET, 201 on POST create, 204 on DELETE. Errors return `{ error_code, error_msg, property? }` with HTTP 4xx/5xx.

## Revised tool list (10, replaces the earlier 13)

1. `timeweb_list_domains`
2. `timeweb_get_domain` — `{ domain }`
3. `timeweb_get_dns_records` — `{ domain, subdomain? }`
4. `timeweb_add_a_record` — `{ domain, subdomain?, value }`
5. `timeweb_add_aaaa_record` — `{ domain, subdomain?, value }`
6. `timeweb_add_cname_record` — `{ domain, subdomain?, value }`
7. `timeweb_add_mx_record` — `{ domain, subdomain?, priority, value }`
8. `timeweb_add_txt_record` — `{ domain, subdomain?, value }`
9. `timeweb_add_srv_record` — `{ domain, subdomain?, service, protocol, priority, port, host }`
10. `timeweb_delete_dns_record` — `{ domain, subdomain?, record_id }`

Dropped (API does not support): `timeweb_add_ns_record`, `timeweb_get_nameservers`, `timeweb_update_nameservers`.

For all tools:
- `domain` = zone FQDN (e.g. `example.com`)
- `subdomain` (optional) = label under the zone (e.g. `www`, `_dmarc`). When set, client handles subdomain pre-creation automatically for non-TXT types.

**Architecture:** Single Node ESM package. `TimewebClient` (axios + Bearer-token interceptor) exposes endpoint methods; each MCP tool lives in its own file and calls one client method. Mirrors `mcp-regru` layout.

**Tech Stack:** TypeScript (ESM, Node ≥18), `@modelcontextprotocol/sdk`, `axios`, `zod`. No proxy, no automated tests — manual smoke via real API (env vars `TIMEWEB_USERNAME`, `TIMEWEB_PASSWORD`, `TIMEWEB_APPKEY`).

---

## File Structure

```
/Users/konser/js/mcp-timeweb/
├── package.json
├── tsconfig.json
├── .gitignore
├── README.md
├── src/
│   ├── index.ts                      # entrypoint: env check + stdio transport
│   ├── server.ts                     # createServer(client) + registers tools
│   ├── api/
│   │   └── client.ts                 # TimewebClient — axios, auth, endpoints
│   ├── schemas/
│   │   └── common.ts                 # shared zod schemas
│   ├── utils/
│   │   └── errors.ts                 # TimewebApiError + handleToolError
│   └── tools/
│       ├── list-domains.ts
│       ├── get-domain.ts
│       ├── get-dns-records.ts
│       ├── get-nameservers.ts
│       ├── add-a.ts
│       ├── add-aaaa.ts
│       ├── add-cname.ts
│       ├── add-mx.ts
│       ├── add-txt.ts
│       ├── add-ns.ts
│       ├── add-srv.ts
│       ├── delete-dns-record.ts
│       └── update-nameservers.ts     # conditional — kept only if endpoint exists
└── docs/
    └── superpowers/
        ├── specs/2026-04-24-timeweb-mcp-design.md
        └── plans/2026-04-24-timeweb-mcp.md
```

**Testing strategy:** no unit tests. Each task ends with a manual smoke call against the real API (user has valid credentials). If a call fails, fix before committing.

---

### Task 1: Scaffold project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `README.md`

- [ ] **Step 1: Initialize npm and git**

```bash
cd /Users/konser/js/mcp-timeweb
git init
npm init -y > /dev/null
```

- [ ] **Step 2: Overwrite `package.json`**

```json
{
  "name": "timeweb-mcp-server",
  "version": "0.1.0",
  "description": "MCP server for Timeweb hosting API (domains + DNS)",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "timeweb-mcp-server": "dist/index.js"
  },
  "scripts": {
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "clean": "rm -rf dist"
  },
  "engines": {
    "node": ">=18"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.6.1",
    "axios": "^1.7.9",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2"
  }
}
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": false,
    "sourceMap": false
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 4: Create `.gitignore`**

```
node_modules/
dist/
.DS_Store
*.log
.env
```

- [ ] **Step 5: Create minimal `README.md`**

```markdown
# timeweb-mcp-server

MCP server for the Timeweb hosting API. Manages domains and DNS records.

## Install

    npm install
    npm run build

## Usage (MCP client config)

    {
      "mcpServers": {
        "timeweb": {
          "command": "node",
          "args": ["/Users/konser/js/mcp-timeweb/dist/index.js"],
          "env": {
            "TIMEWEB_USERNAME": "...",
            "TIMEWEB_PASSWORD": "...",
            "TIMEWEB_APPKEY": "..."
          }
        }
      }
    }

See `docs/superpowers/specs/` for the design.
```

- [ ] **Step 6: Install deps**

```bash
npm install
```

Expected: `node_modules/` populated, no errors.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json .gitignore README.md
git commit -m "chore: scaffold timeweb-mcp-server project"
```

---

### Task 2: Probe live Timeweb API to lock in request/response shapes

Goal: run a small ad-hoc script that authenticates and hits each endpoint once, captures actual shapes, and writes findings to a throwaway log. This replaces unit-testing: it gives the implementer ground truth so zod schemas and client methods match reality.

**Files:**
- Create (temp, will delete): `scripts/probe.mjs`

- [ ] **Step 1: Write the probe script**

Create `scripts/probe.mjs`:

```javascript
import axios from "axios";

const { TIMEWEB_USERNAME, TIMEWEB_PASSWORD, TIMEWEB_APPKEY } = process.env;
if (!TIMEWEB_USERNAME || !TIMEWEB_PASSWORD || !TIMEWEB_APPKEY) {
  console.error("Missing env vars");
  process.exit(1);
}

const api = axios.create({
  baseURL: "https://api.timeweb.ru",
  headers: { "x-app-key": TIMEWEB_APPKEY },
  timeout: 30000,
});

async function authenticate() {
  const res = await api.post("/v1.2/access", {
    login: TIMEWEB_USERNAME,
    password: TIMEWEB_PASSWORD,
  });
  console.log("AUTH response:", JSON.stringify(res.data, null, 2));
  return res.data.token ?? res.data.access_token ?? res.data;
}

async function main() {
  const token = await authenticate();
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
  const login = TIMEWEB_USERNAME;

  console.log("\n--- LIST DOMAINS ---");
  const list = await api.get(`/v1/accounts/${login}/domains`);
  console.log(JSON.stringify(list.data, null, 2));

  const firstDomain =
    list.data?.domains?.[0]?.fqdn ??
    list.data?.[0]?.fqdn ??
    list.data?.data?.[0]?.fqdn;
  if (!firstDomain) {
    console.log("No domain found — stop");
    return;
  }
  console.log("\nUsing domain:", firstDomain);

  console.log("\n--- GET DOMAIN ---");
  const one = await api.get(`/v1/accounts/${login}/domains/${firstDomain}`);
  console.log(JSON.stringify(one.data, null, 2));

  console.log("\n--- GET DNS RECORDS ---");
  const recs = await api.get(
    `/v1.2/accounts/${login}/domains/${firstDomain}/user-records`,
    { params: { limit: 100 } }
  );
  console.log(JSON.stringify(recs.data, null, 2));
}

main().catch((e) => {
  console.error("ERROR:", e.response?.status, JSON.stringify(e.response?.data ?? e.message, null, 2));
  process.exit(1);
});
```

- [ ] **Step 2: Run the probe**

```bash
node scripts/probe.mjs 2>&1 | tee probe.log
```

Expected: logs of auth response, domain list, one domain info, DNS records. Note field names (`fqdn` vs `domain`, `token` vs `access_token`, shape of `data` field on DNS records by `type`).

- [ ] **Step 3: Capture findings inline in the plan**

Open this plan file and update the notes block below with actual shapes observed. These notes become the reference for zod schemas in later tasks.

```
### Probe findings (fill in after Step 2)

- AUTH token field name: ___________ (e.g. "token" or "access_token")
- Domain list response wrapper: ___________ (e.g. { domains: [...] })
- Domain object fields: ___________ (e.g. fqdn, is_delegated, expiration, ...)
- DNS record object shape: { id: ?, type: ?, data: ? }
- DNS record `data` shape per type:
  - A:     ___________
  - MX:    ___________
  - CNAME: ___________
  - TXT:   ___________
  - SRV:   ___________
- Does `GET /v1/accounts/{login}/domains/{fqdn}` include nameservers? ___________
- Endpoint for updating nameservers (search docs/probe with `curl -v`): ___________
```

- [ ] **Step 4: Clean up, do NOT commit probe.log**

```bash
rm scripts/probe.mjs probe.log
rmdir scripts 2>/dev/null || true
```

- [ ] **Step 5: Commit only the updated plan notes**

```bash
git add docs/superpowers/plans/2026-04-24-timeweb-mcp.md
git commit -m "docs: capture live Timeweb API shapes for implementation"
```

---

### Task 3: Error utilities

**Files:**
- Create: `src/utils/errors.ts`

- [ ] **Step 1: Write `src/utils/errors.ts`**

```typescript
import type { AxiosError } from "axios";

export class TimewebApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "TimewebApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function fromAxiosError(err: AxiosError): TimewebApiError {
  const status = err.response?.status ?? 0;
  const body = err.response?.data as Record<string, unknown> | undefined;
  const code =
    (body?.["error_code"] as string | undefined) ??
    (body?.["code"] as string | undefined) ??
    err.code ??
    "UNKNOWN_ERROR";
  const message =
    (body?.["message"] as string | undefined) ??
    (body?.["error_text"] as string | undefined) ??
    err.message ??
    "Unknown error";
  return new TimewebApiError(status, code, message, body);
}

export function formatError(err: TimewebApiError): string {
  return `Timeweb API ${err.status || "?"}: ${err.code} — ${err.message}`;
}

export function handleToolError(error: unknown): {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
} {
  if (error instanceof TimewebApiError) {
    return { content: [{ type: "text", text: formatError(error) }], isError: true };
  }
  const msg = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text", text: `Unexpected error: ${msg}` }], isError: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/errors.ts
git commit -m "feat: add Timeweb error types and tool error handler"
```

---

### Task 4: Common zod schemas

**Files:**
- Create: `src/schemas/common.ts`

- [ ] **Step 1: Write `src/schemas/common.ts`**

```typescript
import { z } from "zod";

export const domainSchema = z
  .string()
  .min(3)
  .regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Must be a valid FQDN");

export const subdomainSchema = z
  .string()
  .regex(/^[a-zA-Z0-9._*@-]*$/, "Invalid subdomain")
  .describe('Subdomain label (empty string or "@" for apex)');

export const ipv4Schema = z.string().ip({ version: "v4" });
export const ipv6Schema = z.string().ip({ version: "v6" });

export const recordIdSchema = z.number().int().positive();

export const prioritySchema = z.number().int().min(0).max(65535);
export const portSchema = z.number().int().min(1).max(65535);

export const nameserverListSchema = z
  .array(z.string().regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/))
  .min(2)
  .max(8);
```

- [ ] **Step 2: Commit**

```bash
git add src/schemas/common.ts
git commit -m "feat: add common zod schemas"
```

---

### Task 5: TimewebClient — auth + axios setup

**Files:**
- Create: `src/api/client.ts`

- [ ] **Step 1: Write the client skeleton with auth + interceptor**

```typescript
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { TimewebApiError, fromAxiosError } from "../utils/errors.js";

const BASE_URL = "https://api.timeweb.ru";

interface RetryableConfig extends InternalAxiosRequestConfig {
  _twRetry?: boolean;
}

export class TimewebClient {
  private readonly login: string;
  private readonly password: string;
  private readonly appkey: string;
  private readonly http: AxiosInstance;
  private token: string | null = null;
  private authInFlight: Promise<string> | null = null;

  constructor(login: string, password: string, appkey: string) {
    this.login = login;
    this.password = password;
    this.appkey = appkey;
    this.http = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      headers: { "x-app-key": appkey },
    });

    this.http.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.set("Authorization", `Bearer ${this.token}`);
      }
      return config;
    });

    this.http.interceptors.response.use(
      (r) => r,
      async (error: AxiosError) => {
        const original = error.config as RetryableConfig | undefined;
        if (error.response?.status === 401 && original && !original._twRetry) {
          original._twRetry = true;
          this.token = null;
          await this.authenticate();
          return this.http.request(original);
        }
        throw fromAxiosError(error);
      }
    );
  }

  private async authenticate(): Promise<string> {
    if (this.authInFlight) return this.authInFlight;
    this.authInFlight = (async () => {
      try {
        const res = await axios.post(
          `${BASE_URL}/v1.2/access`,
          { login: this.login, password: this.password },
          { headers: { "x-app-key": this.appkey }, timeout: 30000 }
        );
        // Probe findings: adjust the field name below to match actual response
        const token =
          (res.data?.token as string | undefined) ??
          (res.data?.access_token as string | undefined);
        if (!token) {
          throw new TimewebApiError(
            res.status,
            "AUTH_NO_TOKEN",
            "Timeweb /v1.2/access returned no token",
            res.data
          );
        }
        this.token = token;
        return token;
      } catch (err) {
        if (err instanceof TimewebApiError) throw err;
        if (axios.isAxiosError(err)) throw fromAxiosError(err);
        throw err;
      } finally {
        this.authInFlight = null;
      }
    })();
    return this.authInFlight;
  }

  private async ensureAuth(): Promise<void> {
    if (!this.token) await this.authenticate();
  }

  protected get client(): AxiosInstance {
    return this.http;
  }

  protected async request<T>(
    method: "get" | "post" | "put" | "delete",
    path: string,
    body?: unknown,
    params?: Record<string, string | number>
  ): Promise<T> {
    await this.ensureAuth();
    const res = await this.http.request<T>({ method, url: path, data: body, params });
    return res.data;
  }

  protected get accountPath(): string {
    return `/accounts/${encodeURIComponent(this.login)}`;
  }
}
```

- [ ] **Step 2: Build to verify it compiles**

```bash
npm run build
```

Expected: no TS errors, `dist/api/client.js` exists.

- [ ] **Step 3: Commit**

```bash
git add src/api/client.ts
git commit -m "feat: add TimewebClient with auth + 401 retry"
```

---

### Task 6: Client endpoint methods

**Files:**
- Modify: `src/api/client.ts` (extend with domain + DNS + NS methods)

- [ ] **Step 1: Append endpoint types to `src/api/client.ts`**

Before the class declaration, add:

```typescript
export interface Domain {
  fqdn: string;
  [key: string]: unknown;
}

export interface DnsRecord {
  id: number;
  type: string;
  data: Record<string, unknown>;
  [key: string]: unknown;
}

export type DnsRecordType =
  | "A"
  | "AAAA"
  | "CNAME"
  | "MX"
  | "TXT"
  | "NS"
  | "SRV";

export interface AddRecordPayload {
  type: DnsRecordType;
  subdomain?: string;
  data: Record<string, unknown>;
}

interface ListWrapper<T> {
  [key: string]: T[] | unknown;
}
```

- [ ] **Step 2: Add endpoint methods inside the `TimewebClient` class (after `accountPath`)**

```typescript
  async listDomains(): Promise<unknown> {
    return this.request<unknown>("get", `${this.accountPath}/domains`);
  }

  async getDomain(fqdn: string): Promise<unknown> {
    return this.request<unknown>(
      "get",
      `${this.accountPath}/domains/${encodeURIComponent(fqdn)}`
    );
  }

  async getDnsRecords(fqdn: string, limit = 100, offset = 0): Promise<unknown> {
    return this.request<unknown>(
      "get",
      `/v1.2${this.accountPath}/domains/${encodeURIComponent(fqdn)}/user-records`,
      undefined,
      { limit, offset }
    );
  }

  async addDnsRecord(fqdn: string, payload: AddRecordPayload): Promise<unknown> {
    return this.request<unknown>(
      "post",
      `/v1.2${this.accountPath}/domains/${encodeURIComponent(fqdn)}/user-records/`,
      payload
    );
  }

  async deleteDnsRecord(fqdn: string, recordId: number): Promise<unknown> {
    return this.request<unknown>(
      "delete",
      `/v1.2${this.accountPath}/domains/${encodeURIComponent(fqdn)}/user-records/${recordId}/`
    );
  }

  async getNameservers(fqdn: string): Promise<unknown> {
    // Probe findings: if dedicated NS endpoint exists, use it; otherwise derive from getDomain.
    // Default: derive.
    return this.getDomain(fqdn);
  }

  async updateNameservers(fqdn: string, nameservers: string[]): Promise<unknown> {
    // Probe findings: confirm endpoint and method. If Timeweb does not expose it,
    // throw to signal the tool should be removed.
    return this.request<unknown>(
      "put",
      `${this.accountPath}/domains/${encodeURIComponent(fqdn)}/nameserver`,
      { nameservers }
    );
  }
```

**Note:** The base path prefix for list/get/delete may differ (`/v1` vs `/v1.1` vs `/v1.2`). Adjust each line to match what Task 2's probe logged. The code above uses `/v1` implicitly for list/get and `/v1.2` explicitly for DNS — confirm against probe output.

- [ ] **Step 3: Update the `request` method to allow absolute paths**

Replace the existing `request` method body with:

```typescript
  protected async request<T>(
    method: "get" | "post" | "put" | "delete",
    path: string,
    body?: unknown,
    params?: Record<string, string | number>
  ): Promise<T> {
    await this.ensureAuth();
    const url = path.startsWith("/") ? path : `/v1${path}`;
    const res = await this.http.request<T>({ method, url, data: body, params });
    return res.data;
  }
```

And update `accountPath` to be relative (no `/v1` prefix):

```typescript
  protected get accountPath(): string {
    return `/v1/accounts/${encodeURIComponent(this.login)}`;
  }
```

- [ ] **Step 4: Build**

```bash
npm run build
```

Expected: compiles clean.

- [ ] **Step 5: Commit**

```bash
git add src/api/client.ts
git commit -m "feat: add domain + DNS + NS endpoint methods on TimewebClient"
```

---

### Task 7: Server entry + createServer skeleton

**Files:**
- Create: `src/index.ts`
- Create: `src/server.ts`

- [ ] **Step 1: Write `src/index.ts`**

```typescript
#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { TimewebClient } from "./api/client.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const login = process.env.TIMEWEB_USERNAME;
  const password = process.env.TIMEWEB_PASSWORD;
  const appkey = process.env.TIMEWEB_APPKEY;

  if (!login || !password || !appkey) {
    console.error(
      "ERROR: TIMEWEB_USERNAME, TIMEWEB_PASSWORD, and TIMEWEB_APPKEY env vars are required."
    );
    process.exit(1);
  }

  const client = new TimewebClient(login, password, appkey);
  const server = createServer(client);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Timeweb MCP server running via stdio");
}

main().catch((err) => {
  console.error("Server error:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Write `src/server.ts` with empty registration block**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TimewebClient } from "./api/client.js";

export function createServer(client: TimewebClient): McpServer {
  const server = new McpServer({
    name: "timeweb-mcp-server",
    version: "0.1.0",
  });

  // Tool registrations added in later tasks.
  void client;
  return server;
}
```

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: compiles clean.

- [ ] **Step 4: Commit**

```bash
git add src/index.ts src/server.ts
git commit -m "feat: add stdio entrypoint and server skeleton"
```

---

### Task 8: Read tools (list_domains, get_domain, get_dns_records, get_nameservers)

**Files:**
- Create: `src/tools/list-domains.ts`
- Create: `src/tools/get-domain.ts`
- Create: `src/tools/get-dns-records.ts`
- Create: `src/tools/get-nameservers.ts`
- Modify: `src/server.ts`

- [ ] **Step 1: `src/tools/list-domains.ts`**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TimewebClient } from "../api/client.js";
import { handleToolError } from "../utils/errors.js";

export function registerListDomains(server: McpServer, client: TimewebClient): void {
  server.tool(
    "timeweb_list_domains",
    "List all domains attached to the Timeweb account.",
    {},
    async () => {
      try {
        const data = await client.listDomains();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
```

- [ ] **Step 2: `src/tools/get-domain.ts`**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TimewebClient } from "../api/client.js";
import { handleToolError } from "../utils/errors.js";
import { domainSchema } from "../schemas/common.js";

export function registerGetDomain(server: McpServer, client: TimewebClient): void {
  server.tool(
    "timeweb_get_domain",
    "Get info about a single domain by FQDN.",
    { domain: domainSchema },
    async ({ domain }) => {
      try {
        const data = await client.getDomain(domain);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
```

- [ ] **Step 3: `src/tools/get-dns-records.ts`**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TimewebClient } from "../api/client.js";
import { handleToolError } from "../utils/errors.js";
import { domainSchema } from "../schemas/common.js";

export function registerGetDnsRecords(server: McpServer, client: TimewebClient): void {
  server.tool(
    "timeweb_get_dns_records",
    "Get all user DNS records for a domain.",
    {
      domain: domainSchema,
      limit: z.number().int().min(1).max(1000).optional(),
      offset: z.number().int().min(0).optional(),
    },
    async ({ domain, limit, offset }) => {
      try {
        const data = await client.getDnsRecords(domain, limit ?? 100, offset ?? 0);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
```

- [ ] **Step 4: `src/tools/get-nameservers.ts`**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TimewebClient } from "../api/client.js";
import { handleToolError } from "../utils/errors.js";
import { domainSchema } from "../schemas/common.js";

export function registerGetNameservers(server: McpServer, client: TimewebClient): void {
  server.tool(
    "timeweb_get_nameservers",
    "Get nameservers configured for a domain.",
    { domain: domainSchema },
    async ({ domain }) => {
      try {
        const data = await client.getNameservers(domain);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
```

- [ ] **Step 5: Wire them in `src/server.ts`**

Replace the "Tool registrations added in later tasks." line + `void client;` with:

```typescript
  registerListDomains(server, client);
  registerGetDomain(server, client);
  registerGetDnsRecords(server, client);
  registerGetNameservers(server, client);
```

And add imports at the top:

```typescript
import { registerListDomains } from "./tools/list-domains.js";
import { registerGetDomain } from "./tools/get-domain.js";
import { registerGetDnsRecords } from "./tools/get-dns-records.js";
import { registerGetNameservers } from "./tools/get-nameservers.js";
```

- [ ] **Step 6: Build + smoke**

```bash
npm run build
```

Expected: clean build.

Smoke-test via stdio (runs the server, pipes a tools/list request):

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js 2>/dev/null | head -c 2000
```

Expected: JSON response listing four tools starting with `timeweb_`.

- [ ] **Step 7: Commit**

```bash
git add src/tools/list-domains.ts src/tools/get-domain.ts src/tools/get-dns-records.ts src/tools/get-nameservers.ts src/server.ts
git commit -m "feat: add read-only Timeweb MCP tools"
```

---

### Task 9: DNS add tools — single-value types (A, AAAA, CNAME, TXT, NS)

All five tools share the same shape: `{ domain, subdomain, value, (ttl?) }` → POST with `{ type, subdomain, data: { value } }`. The `ttl` field is included only if probe findings show the API accepts it; otherwise remove from each tool.

**Files:**
- Create: `src/tools/add-a.ts`
- Create: `src/tools/add-aaaa.ts`
- Create: `src/tools/add-cname.ts`
- Create: `src/tools/add-txt.ts`
- Create: `src/tools/add-ns.ts`
- Modify: `src/server.ts`

- [ ] **Step 1: `src/tools/add-a.ts`**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TimewebClient } from "../api/client.js";
import { handleToolError } from "../utils/errors.js";
import { domainSchema, subdomainSchema, ipv4Schema } from "../schemas/common.js";

export function registerAddA(server: McpServer, client: TimewebClient): void {
  server.tool(
    "timeweb_add_a_record",
    "Add an A (IPv4) record to a domain's DNS zone.",
    { domain: domainSchema, subdomain: subdomainSchema, value: ipv4Schema },
    async ({ domain, subdomain, value }) => {
      try {
        const data = await client.addDnsRecord(domain, {
          type: "A",
          subdomain,
          data: { value },
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
```

- [ ] **Step 2: `src/tools/add-aaaa.ts`**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TimewebClient } from "../api/client.js";
import { handleToolError } from "../utils/errors.js";
import { domainSchema, subdomainSchema, ipv6Schema } from "../schemas/common.js";

export function registerAddAaaa(server: McpServer, client: TimewebClient): void {
  server.tool(
    "timeweb_add_aaaa_record",
    "Add an AAAA (IPv6) record.",
    { domain: domainSchema, subdomain: subdomainSchema, value: ipv6Schema },
    async ({ domain, subdomain, value }) => {
      try {
        const data = await client.addDnsRecord(domain, {
          type: "AAAA",
          subdomain,
          data: { value },
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
```

- [ ] **Step 3: `src/tools/add-cname.ts`**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TimewebClient } from "../api/client.js";
import { handleToolError } from "../utils/errors.js";
import { domainSchema, subdomainSchema } from "../schemas/common.js";

export function registerAddCname(server: McpServer, client: TimewebClient): void {
  server.tool(
    "timeweb_add_cname_record",
    "Add a CNAME record pointing subdomain to another FQDN.",
    { domain: domainSchema, subdomain: subdomainSchema, value: z.string().min(3) },
    async ({ domain, subdomain, value }) => {
      try {
        const data = await client.addDnsRecord(domain, {
          type: "CNAME",
          subdomain,
          data: { value },
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
```

- [ ] **Step 4: `src/tools/add-txt.ts`**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TimewebClient } from "../api/client.js";
import { handleToolError } from "../utils/errors.js";
import { domainSchema, subdomainSchema } from "../schemas/common.js";

export function registerAddTxt(server: McpServer, client: TimewebClient): void {
  server.tool(
    "timeweb_add_txt_record",
    "Add a TXT record.",
    { domain: domainSchema, subdomain: subdomainSchema, value: z.string().min(1) },
    async ({ domain, subdomain, value }) => {
      try {
        const data = await client.addDnsRecord(domain, {
          type: "TXT",
          subdomain,
          data: { value },
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
```

- [ ] **Step 5: `src/tools/add-ns.ts`**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TimewebClient } from "../api/client.js";
import { handleToolError } from "../utils/errors.js";
import { domainSchema, subdomainSchema } from "../schemas/common.js";
import { z } from "zod";

export function registerAddNs(server: McpServer, client: TimewebClient): void {
  server.tool(
    "timeweb_add_ns_record",
    "Add an NS record delegating a subdomain.",
    { domain: domainSchema, subdomain: subdomainSchema, value: z.string().min(3) },
    async ({ domain, subdomain, value }) => {
      try {
        const data = await client.addDnsRecord(domain, {
          type: "NS",
          subdomain,
          data: { value },
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
```

- [ ] **Step 6: Register in `src/server.ts`**

Add imports:

```typescript
import { registerAddA } from "./tools/add-a.js";
import { registerAddAaaa } from "./tools/add-aaaa.js";
import { registerAddCname } from "./tools/add-cname.js";
import { registerAddTxt } from "./tools/add-txt.js";
import { registerAddNs } from "./tools/add-ns.js";
```

Add calls inside `createServer`:

```typescript
  registerAddA(server, client);
  registerAddAaaa(server, client);
  registerAddCname(server, client);
  registerAddTxt(server, client);
  registerAddNs(server, client);
```

- [ ] **Step 7: Build + commit**

```bash
npm run build
git add src/tools/add-a.ts src/tools/add-aaaa.ts src/tools/add-cname.ts src/tools/add-txt.ts src/tools/add-ns.ts src/server.ts
git commit -m "feat: add A/AAAA/CNAME/TXT/NS DNS record tools"
```

---

### Task 10: DNS add — MX

**Files:**
- Create: `src/tools/add-mx.ts`
- Modify: `src/server.ts`

- [ ] **Step 1: `src/tools/add-mx.ts`**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TimewebClient } from "../api/client.js";
import { handleToolError } from "../utils/errors.js";
import { domainSchema, subdomainSchema, prioritySchema } from "../schemas/common.js";

export function registerAddMx(server: McpServer, client: TimewebClient): void {
  server.tool(
    "timeweb_add_mx_record",
    "Add an MX (mail exchange) record.",
    {
      domain: domainSchema,
      subdomain: subdomainSchema,
      priority: prioritySchema,
      value: z.string().min(3),
    },
    async ({ domain, subdomain, priority, value }) => {
      try {
        const data = await client.addDnsRecord(domain, {
          type: "MX",
          subdomain,
          data: { priority, value },
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
```

- [ ] **Step 2: Register in `src/server.ts`**

Add import + call:

```typescript
import { registerAddMx } from "./tools/add-mx.js";
// inside createServer:
  registerAddMx(server, client);
```

- [ ] **Step 3: Build + commit**

```bash
npm run build
git add src/tools/add-mx.ts src/server.ts
git commit -m "feat: add MX DNS record tool"
```

---

### Task 11: DNS add — SRV

**Files:**
- Create: `src/tools/add-srv.ts`
- Modify: `src/server.ts`

- [ ] **Step 1: `src/tools/add-srv.ts`**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TimewebClient } from "../api/client.js";
import { handleToolError } from "../utils/errors.js";
import {
  domainSchema,
  prioritySchema,
  portSchema,
} from "../schemas/common.js";

export function registerAddSrv(server: McpServer, client: TimewebClient): void {
  server.tool(
    "timeweb_add_srv_record",
    "Add an SRV record.",
    {
      domain: domainSchema,
      service: z.string().min(1),   // e.g. "_sip"
      protocol: z.string().min(1),  // e.g. "_tcp"
      priority: prioritySchema,
      weight: z.number().int().min(0).max(65535),
      port: portSchema,
      target: z.string().min(3),
    },
    async ({ domain, service, protocol, priority, weight, port, target }) => {
      try {
        const data = await client.addDnsRecord(domain, {
          type: "SRV",
          data: { service, protocol, priority, weight, port, target },
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
```

- [ ] **Step 2: Register + build + commit**

Add to `src/server.ts`:

```typescript
import { registerAddSrv } from "./tools/add-srv.js";
// inside createServer:
  registerAddSrv(server, client);
```

```bash
npm run build
git add src/tools/add-srv.ts src/server.ts
git commit -m "feat: add SRV DNS record tool"
```

---

### Task 12: delete_dns_record

**Files:**
- Create: `src/tools/delete-dns-record.ts`
- Modify: `src/server.ts`

- [ ] **Step 1: `src/tools/delete-dns-record.ts`**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TimewebClient } from "../api/client.js";
import { handleToolError } from "../utils/errors.js";
import { domainSchema, recordIdSchema } from "../schemas/common.js";

export function registerDeleteDnsRecord(server: McpServer, client: TimewebClient): void {
  server.tool(
    "timeweb_delete_dns_record",
    "Delete a DNS record by its numeric id (obtain via timeweb_get_dns_records).",
    { domain: domainSchema, record_id: recordIdSchema },
    async ({ domain, record_id }) => {
      try {
        const data = await client.deleteDnsRecord(domain, record_id);
        return {
          content: [
            {
              type: "text",
              text: data ? JSON.stringify(data, null, 2) : `Deleted record ${record_id}`,
            },
          ],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
```

- [ ] **Step 2: Register + build + commit**

```typescript
import { registerDeleteDnsRecord } from "./tools/delete-dns-record.js";
// inside createServer:
  registerDeleteDnsRecord(server, client);
```

```bash
npm run build
git add src/tools/delete-dns-record.ts src/server.ts
git commit -m "feat: add delete_dns_record tool"
```

---

### Task 13: update_nameservers (conditional — confirm endpoint first)

This tool stays only if the probe (Task 2) or a targeted docs search confirms Timeweb exposes a nameserver-update endpoint. If not, skip this task entirely and update the README to say NS changes must be done via the Timeweb panel.

**Files:**
- Create (conditional): `src/tools/update-nameservers.ts`
- Modify (conditional): `src/server.ts`
- Modify (unconditional): `README.md` — add note about NS support outcome

- [ ] **Step 1: Verify endpoint exists**

Re-check the Timeweb hosting API docs (https://timeweb.com/ru/docs/publichnyj-api-timeweb/metody-api-dlya-virtualnogo-hostinga/) for an NS-update endpoint. If unsure, try in a one-off probe:

```bash
curl -sX PUT "https://api.timeweb.ru/v1/accounts/$TIMEWEB_USERNAME/domains/$TEST_DOMAIN/nameserver" \
  -H "x-app-key: $TIMEWEB_APPKEY" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"nameservers":["ns1.timeweb.ru","ns2.timeweb.ru"]}' | jq
```

If response is 4xx with "method not allowed" or "not found" → skip steps 2-4, jump to step 5.

- [ ] **Step 2: `src/tools/update-nameservers.ts`** (only if endpoint confirmed)

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TimewebClient } from "../api/client.js";
import { handleToolError } from "../utils/errors.js";
import { domainSchema, nameserverListSchema } from "../schemas/common.js";

export function registerUpdateNameservers(server: McpServer, client: TimewebClient): void {
  server.tool(
    "timeweb_update_nameservers",
    "Replace nameservers for a domain.",
    { domain: domainSchema, nameservers: nameserverListSchema },
    async ({ domain, nameservers }) => {
      try {
        const data = await client.updateNameservers(domain, nameservers);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
```

- [ ] **Step 3: Update `updateNameservers` in `src/api/client.ts`**

Adjust the HTTP method, path, and body shape in `client.ts` to match what the probe confirmed.

- [ ] **Step 4: Register + build**

```typescript
import { registerUpdateNameservers } from "./tools/update-nameservers.js";
// inside createServer:
  registerUpdateNameservers(server, client);
```

```bash
npm run build
```

- [ ] **Step 5: Update README**

If the tool was added, list `timeweb_update_nameservers` in the tool list in README. If it was skipped, add a short line under "Limitations": "Changing nameservers is not supported by the Timeweb hosting API — use the Timeweb control panel."

Also remove `updateNameservers` from `src/api/client.ts` and `nameserverListSchema` from `src/schemas/common.ts` if unused.

- [ ] **Step 6: Commit**

If tool added:

```bash
git add src/tools/update-nameservers.ts src/api/client.ts src/server.ts README.md
git commit -m "feat: add update_nameservers tool"
```

If tool skipped:

```bash
git add src/api/client.ts src/schemas/common.ts README.md
git commit -m "docs: note Timeweb API does not support NS updates"
```

---

### Task 14: Final smoke test + README tool list

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Full build**

```bash
npm run build
```

Expected: clean.

- [ ] **Step 2: tools/list smoke**

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js 2>/dev/null | python3 -c "import sys, json; d = json.loads(sys.stdin.read()); print('\n'.join(t['name'] for t in d['result']['tools']))"
```

Expected: prints the full list of `timeweb_*` tools (12 or 13 depending on Task 13 outcome).

- [ ] **Step 3: Live call for each tool through the MCP server**

For each tool, send a `tools/call` JSON-RPC request over stdio to the built server and verify it returns non-error output against the real Timeweb account. Use a disposable test subdomain (e.g. `mcpsmoketest`) for write tools, then delete each created record with `timeweb_delete_dns_record`.

Minimal call template:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"timeweb_list_domains","arguments":{}}}' | node dist/index.js 2>/dev/null | jq '.result.content[0].text' -r
```

Required calls:
1. `timeweb_list_domains` → picks a test domain for the rest
2. `timeweb_get_domain` with that FQDN
3. `timeweb_get_dns_records` with that FQDN
4. `timeweb_get_nameservers` with that FQDN
5. `timeweb_add_a_record` (subdomain `mcpsmoketest`, value `192.0.2.1`)
6. `timeweb_get_dns_records` — find the created id
7. `timeweb_delete_dns_record` — delete it
8. (Skip MX/SRV/AAAA/CNAME/TXT/NS add tools unless convenient — the code path is structurally identical; a single add proves the plumbing.)

Any failing call → fix in source → rebuild → retry.

- [ ] **Step 4: Fill in the README tool list**

Replace the README body after "MCP server for the Timeweb hosting API. Manages domains and DNS records." with:

```markdown
## Tools

Read:
- `timeweb_list_domains`
- `timeweb_get_domain`
- `timeweb_get_dns_records`
- `timeweb_get_nameservers`

DNS write:
- `timeweb_add_a_record`
- `timeweb_add_aaaa_record`
- `timeweb_add_cname_record`
- `timeweb_add_mx_record`
- `timeweb_add_txt_record`
- `timeweb_add_ns_record`
- `timeweb_add_srv_record`
- `timeweb_delete_dns_record`

Nameservers:
- `timeweb_update_nameservers` _(or: "not supported — use Timeweb panel" — adjust per Task 13 outcome)_

## Install

    npm install
    npm run build

## Configure in an MCP client

    {
      "mcpServers": {
        "timeweb": {
          "command": "node",
          "args": ["/Users/konser/js/mcp-timeweb/dist/index.js"],
          "env": {
            "TIMEWEB_USERNAME": "...",
            "TIMEWEB_PASSWORD": "...",
            "TIMEWEB_APPKEY": "..."
          }
        }
      }
    }

## Limitations (v1)

- No domain registration / renewal
- No subdomain or mailbox management
- No DNS record update — delete + add
- No proxy support
```

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: finalize README with tool list"
```

---

## Self-review notes (post-writing)

- Spec coverage: every scope-A+B item has a task (read tools → T8; DNS writes → T9-12; NS → T13; error normalization → T3; auth/retry → T5; env gate → T7).
- Placeholders: Task 2 deliberately parameterizes zod shapes on live probe output; Task 13 is conditional on endpoint existence. Both are verification steps with concrete commands, not hand-waves.
- Type consistency: `addDnsRecord(fqdn, AddRecordPayload)` is used identically by every add tool; `domainSchema`/`subdomainSchema` shared via `schemas/common.ts`.
- Tasks 8 and 13 each modify `src/server.ts`. That is intentional — imports and calls accumulate as tools land. Tasks 10/11/12 do the same.
