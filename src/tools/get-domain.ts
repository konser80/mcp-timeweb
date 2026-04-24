import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TimewebClient } from "../api/client.js";
import { handleToolError } from "../utils/errors.js";
import { domainSchema } from "../schemas/common.js";

export function registerGetDomain(server: McpServer, client: TimewebClient): void {
  server.tool(
    "timeweb_get_domain",
    "Get full info about a single domain (zone) by its FQDN, including legacy records, expiration, ids.",
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
