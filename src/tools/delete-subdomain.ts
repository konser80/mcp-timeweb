import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TimewebClient } from "../api/client.js";
import { handleToolError } from "../utils/errors.js";
import { domainSchema, subdomainSchema } from "../schemas/common.js";

export function registerDeleteSubdomain(server: McpServer, client: TimewebClient): void {
  server.tool(
    "timeweb_delete_subdomain",
    "Delete a subdomain entity. Removes all DNS user-records under it. Returns 404 if the subdomain does not exist.",
    {
      domain: domainSchema,
      subdomain: subdomainSchema,
    },
    async ({ domain, subdomain }) => {
      try {
        await client.deleteSubdomain(domain, subdomain);
        return {
          content: [{ type: "text", text: `Deleted ${subdomain}.${domain}` }],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
