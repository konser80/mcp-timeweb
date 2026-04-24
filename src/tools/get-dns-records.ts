import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TimewebClient } from "../api/client.js";
import { handleToolError } from "../utils/errors.js";
import { domainSchema, subdomainSchema } from "../schemas/common.js";

export function registerGetDnsRecords(server: McpServer, client: TimewebClient): void {
  server.tool(
    "timeweb_get_dns_records",
    "List DNS user-records for a zone, or for a specific subdomain FQDN when subdomain is provided.",
    {
      domain: domainSchema,
      subdomain: subdomainSchema.optional(),
      limit: z.number().int().min(1).max(1000).optional(),
      offset: z.number().int().min(0).optional(),
    },
    async ({ domain, subdomain, limit, offset }) => {
      try {
        const data = await client.getDnsRecords(domain, subdomain, limit ?? 100, offset ?? 0);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
