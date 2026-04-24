# Timeweb MCP Server — Design

Date: 2026-04-24
Project: `/Users/konser/js/mcp-timeweb/`

## Goal

MCP server exposing Timeweb hosting API methods for managing domains and DNS records on a Timeweb account.

## Scope (v1)

**In:** read operations on domains and DNS, DNS record writes (add/delete), nameserver updates.

**Out:** domain registration/renewal, subdomains, mailboxes, proxy support, DNS record updates (no PUT endpoint — users can delete + add).

## Environment

Required env vars (already set on user machine):

- `TIMEWEB_USERNAME` — account login
- `TIMEWEB_PASSWORD` — account password
- `TIMEWEB_APPKEY` — app key issued by Timeweb support

Startup fails with a clear error message if any of the three is missing.

## Architecture

- **Language:** TypeScript (ESM), Node ≥18
- **MCP SDK:** `@modelcontextprotocol/sdk`, transport stdio
- **HTTP client:** `axios` with response-interceptor for auth refresh
- **Validation:** `zod` per-tool input schemas
- **No proxy support**

### Directory layout

```
src/
  index.ts              # entrypoint, reads env, starts stdio transport
  server.ts             # createServer(client), registers all tools
  api/
    client.ts           # TimewebClient class — auth, request, endpoint methods
  tools/
    list-domains.ts
    get-domain.ts
    get-dns-records.ts
    get-nameservers.ts
    add-a.ts
    add-aaaa.ts
    add-cname.ts
    add-mx.ts
    add-txt.ts
    add-ns.ts
    add-srv.ts
    delete-dns-record.ts
    update-nameservers.ts
  schemas/
    common.ts           # shared zod schemas (domain, record id, ttl, etc.)
  utils/
    errors.ts           # TimewebApiError, formatters, handleToolError
package.json
tsconfig.json
README.md
```

One tool per file, each exports `register<Name>(server, client)`. Pattern mirrors `mcp-regru`.

## Authentication

Timeweb uses a two-header scheme:

- `x-app-key: {TIMEWEB_APPKEY}` — always sent
- `Authorization: Bearer {token}` — required for most endpoints; token is obtained by `POST /v1.2/access` with `{ login, password }` body and `x-app-key` header

### Token lifecycle

- `TimewebClient` holds `appkey`, `login`, `password`, and an in-memory `token: string | null`.
- Lazy auth: no network on startup. First authenticated call triggers `authenticate()` which fills `token`.
- Axios response-interceptor: on HTTP 401, call `authenticate()` once and retry the original request. An `_tw_retry` flag on the request config prevents infinite loops on persistent auth failures.
- Token is never persisted to disk.

## HTTP client

- Base URL: `https://api.timeweb.ru`
- Timeout: 30s per request
- Request interceptor: inject `x-app-key` and (if present) `Authorization: Bearer`
- Response interceptor: 401 → refresh+retry; all other errors → throw `TimewebApiError`

## Endpoint mapping

Exact paths to be confirmed against live docs/API during implementation. Best-known mapping:

| Tool | HTTP | Endpoint |
|---|---|---|
| list_domains | GET | `/v1/accounts/{login}/domains` |
| get_domain | GET | `/v1/accounts/{login}/domains/{fqdn}` |
| get_dns_records | GET | `/v1.2/accounts/{login}/domains/{fqdn}/user-records` |
| get_nameservers | GET | derive from domain info, or dedicated endpoint if exists |
| add_*_record | POST | `/v1.2/accounts/{login}/domains/{fqdn}/user-records/` |
| delete_dns_record | DELETE | `/v1.2/accounts/{login}/domains/{fqdn}/user-records/{id}/` |
| update_nameservers | PUT/POST | TBD — verify endpoint exists; if not, drop tool |

## Tools

All tools accept a `domain` string (FQDN). Record-add tools accept `subdomain` (empty string or `@` for apex; schema to be finalized once API response is verified).

### Read

1. **timeweb_list_domains** — no params. Returns array of domain objects.
2. **timeweb_get_domain** — `{ domain }`. Returns full domain info.
3. **timeweb_get_dns_records** — `{ domain, limit?, offset? }`. Returns array of `{ id, type, data }`.
4. **timeweb_get_nameservers** — `{ domain }`. Returns current NS list.

### DNS write (one tool per record type)

Each add tool sends `POST` with body `{ type: "<TYPE>", data: { ... } }` matching Timeweb's expected shape.

5. **timeweb_add_a_record** — `{ domain, subdomain, value (IPv4) }`
6. **timeweb_add_aaaa_record** — `{ domain, subdomain, value (IPv6) }`
7. **timeweb_add_cname_record** — `{ domain, subdomain, value }`
8. **timeweb_add_mx_record** — `{ domain, subdomain, priority, value }`
9. **timeweb_add_txt_record** — `{ domain, subdomain, value }`
10. **timeweb_add_ns_record** — `{ domain, subdomain, value }`
11. **timeweb_add_srv_record** — `{ domain, service, protocol, priority, weight, port, target }`
12. **timeweb_delete_dns_record** — `{ domain, record_id }`

### Nameservers

13. **timeweb_update_nameservers** — `{ domain, nameservers: string[] }`. Conditional: kept only if Timeweb exposes an endpoint for it. If not, removed during implementation and noted in README.

## Error handling

- HTTP errors from axios → normalized into `TimewebApiError { status, code, message }`
- Tool handler wraps calls with `handleToolError(error)` → returns MCP `{ content: [{type:"text", text}], isError: true }`
- Error text format: `Timeweb API {status}: {code} — {message}` (code falls back to `UNKNOWN_ERROR`)
- Missing env vars → process.exit(1) with clear message

## Testing

No automated tests in v1 (matches `mcp-regru` practice). Verification is manual smoke-test through the MCP server against the real Timeweb account. Implementer runs at least one call per tool during development and pastes concise results back to the user.

## Risks / open questions

1. **DNS `data` shape per record type** — needs verification against live API during implementation. Shapes in the design above are best guess; zod schemas may need adjustment.
2. **`update_nameservers` endpoint** — not confirmed in docs. Verify during implementation; remove tool if absent.
3. **`get_nameservers`** — may need to piggy-back on `get_domain` response; decide once actual response body is known.
4. **API version variance** — Timeweb mixes v1, v1.1, v1.2 paths. Each endpoint uses the version that is documented for it; do not normalize.
5. **Rate limiting** — not addressed in v1. If 429s appear in testing, add a basic retry-after handler.

## Non-goals (deferred)

- Domain registration / renewal / transfer (requires billing flow — separate spec)
- Subdomains
- Mailboxes
- DNS record updates via PUT (endpoint does not exist; users do delete + add)
- Proxy support
- Automated tests
