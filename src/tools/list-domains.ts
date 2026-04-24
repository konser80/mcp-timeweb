import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TimewebClient } from "../api/client.js";
import { handleToolError } from "../utils/errors.js";

export function registerListDomains(server: McpServer, client: TimewebClient): void {
  server.tool(
    "timeweb_list_domains",
    "List all domains (zones) attached to the Timeweb account. Returns an array of FQDNs.",
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
