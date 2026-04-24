import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TimewebClient } from "../api/client.js";
import { handleToolError } from "../utils/errors.js";
import { domainSchema, subdomainSchema, ipv4Schema } from "../schemas/common.js";

export function registerAddA(server: McpServer, client: TimewebClient): void {
  server.tool(
    "timeweb_add_a_record",
    "Add an A (IPv4) record. Omit subdomain for apex; when subdomain is provided, the subdomain entity is auto-created as needed.",
    {
      domain: domainSchema,
      subdomain: subdomainSchema.optional(),
      value: ipv4Schema,
    },
    async ({ domain, subdomain, value }) => {
      try {
        const data = await client.addDnsRecord(domain, {
          type: "A",
          subdomain,
          data: { value },
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
