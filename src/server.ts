import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TimewebClient } from "./api/client.js";
import { registerListDomains } from "./tools/list-domains.js";
import { registerGetDomain } from "./tools/get-domain.js";
import { registerGetDnsRecords } from "./tools/get-dns-records.js";

export function createServer(client: TimewebClient): McpServer {
  const server = new McpServer({
    name: "timeweb-mcp-server",
    version: "0.1.0",
  });

  registerListDomains(server, client);
  registerGetDomain(server, client);
  registerGetDnsRecords(server, client);

  return server;
}
