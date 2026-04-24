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
