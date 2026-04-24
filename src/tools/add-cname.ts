import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TimewebClient } from "../api/client.js";
import { handleToolError } from "../utils/errors.js";
import { domainSchema, subdomainSchema } from "../schemas/common.js";

export function registerAddCname(server: McpServer, client: TimewebClient): void {
  server.tool(
    "timeweb_add_cname_record",
    "Add a CNAME record pointing to another FQDN. Subdomain optional; auto-created if provided.",
    {
      domain: domainSchema,
      subdomain: subdomainSchema.optional(),
      value: z.string().min(3).describe("Target FQDN"),
    },
    async ({ domain, subdomain, value }) => {
      try {
        const data = await client.addDnsRecord(domain, {
          type: "CNAME",
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
