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
