import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TimewebClient } from "../api/client.js";
import { handleToolError } from "../utils/errors.js";
import {
  domainSchema,
  subdomainSchema,
  recordIdSchema,
} from "../schemas/common.js";

export function registerDeleteDnsRecord(server: McpServer, client: TimewebClient): void {
  server.tool(
    "timeweb_delete_dns_record",
    "Delete a DNS user-record by its numeric id. Pass the same subdomain (if any) that was used to add the record — record ids are scoped to their FQDN.",
    {
      domain: domainSchema,
      subdomain: subdomainSchema.optional(),
      record_id: recordIdSchema,
    },
    async ({ domain, subdomain, record_id }) => {
      try {
        await client.deleteDnsRecord(domain, subdomain, record_id);
        return { content: [{ type: "text", text: `Deleted record ${record_id}` }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
