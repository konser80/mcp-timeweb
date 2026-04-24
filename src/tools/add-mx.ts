import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TimewebClient } from "../api/client.js";
import { handleToolError } from "../utils/errors.js";
import {
  domainSchema,
  subdomainSchema,
  prioritySchema,
  fqdnValueSchema,
} from "../schemas/common.js";

export function registerAddMx(server: McpServer, client: TimewebClient): void {
  server.tool(
    "timeweb_add_mx_record",
    "Add an MX (mail exchange) record. Subdomain optional; auto-created if provided.",
    {
      domain: domainSchema,
      subdomain: subdomainSchema.optional(),
      priority: prioritySchema,
      value: fqdnValueSchema.describe("Mail server FQDN"),
    },
    async ({ domain, subdomain, priority, value }) => {
      try {
        const data = await client.addDnsRecord(domain, {
          type: "MX",
          subdomain,
          data: { priority, value },
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
