# timeweb-mcp-server

MCP server for the Timeweb hosting API. Manages domains and DNS records.

## Tools

Read:
- `timeweb_list_domains`
- `timeweb_get_domain`
- `timeweb_get_dns_records`

DNS write:
- `timeweb_add_a_record`
- `timeweb_add_aaaa_record`
- `timeweb_add_cname_record`
- `timeweb_add_mx_record`
- `timeweb_add_txt_record`
- `timeweb_add_srv_record`
- `timeweb_delete_dns_record`

Every DNS tool takes `domain` (zone FQDN) and an optional `subdomain` label. For non-TXT record types, the subdomain entity is auto-created in the Timeweb panel on first use (409 "already exists" is silently tolerated). TXT records set the subdomain inline — no panel entity is created.

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

App key is issued by Timeweb support. Two-factor authentication on the account must be disabled for API access.

## Limitations (v1)

- No NS-record management — Timeweb's `user-records` endpoint returns 500 for `type: NS`.
- No nameserver read/update — no public endpoint found; change NS through the Timeweb control panel.
- No DNS record update — the API has no PUT; delete + add instead.
- No domain registration, renewal, subdomain deletion, or mailbox management.
- No proxy support.

## Design

See `docs/superpowers/specs/2026-04-24-timeweb-mcp-design.md` and `docs/superpowers/plans/2026-04-24-timeweb-mcp.md`.
