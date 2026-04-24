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
