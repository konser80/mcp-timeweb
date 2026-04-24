import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TimewebClient } from "../api/client.js";
import { handleToolError } from "../utils/errors.js";
import { domainSchema, subdomainSchema, ipv6Schema } from "../schemas/common.js";

export function registerAddAaaa(server: McpServer, client: TimewebClient): void {
  server.tool(
    "timeweb_add_aaaa_record",
    "Add an AAAA (IPv6) record. Subdomain optional; auto-created if provided.",
    {
      domain: domainSchema,
      subdomain: subdomainSchema.optional(),
      value: ipv6Schema,
    },
    async ({ domain, subdomain, value }) => {
      try {
        const data = await client.addDnsRecord(domain, {
          type: "AAAA",
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
