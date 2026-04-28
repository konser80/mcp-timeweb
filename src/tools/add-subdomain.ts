import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TimewebClient } from "../api/client.js";
import { handleToolError } from "../utils/errors.js";
import { domainSchema, subdomainSchema } from "../schemas/common.js";

export function registerAddSubdomain(server: McpServer, client: TimewebClient): void {
  server.tool(
    "timeweb_add_subdomain",
    "Create a subdomain entity in the Timeweb panel. The DNS add tools auto-create subdomains as needed, so use this only when you want a panel entry without any record yet.",
    {
      domain: domainSchema,
      subdomain: subdomainSchema,
    },
    async ({ domain, subdomain }) => {
      try {
        await client.addSubdomain(domain, subdomain);
        return {
          content: [{ type: "text", text: `Created ${subdomain}.${domain}` }],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
