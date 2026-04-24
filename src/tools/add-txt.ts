import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TimewebClient } from "../api/client.js";
import { handleToolError } from "../utils/errors.js";
import { domainSchema, subdomainSchema } from "../schemas/common.js";

export function registerAddTxt(server: McpServer, client: TimewebClient): void {
  server.tool(
    "timeweb_add_txt_record",
    "Add a TXT record. Subdomain optional (e.g. _dmarc, _acme-challenge). TXT is the only type where the API natively accepts a subdomain field inline — no subdomain entity is created.",
    {
      domain: domainSchema,
      subdomain: subdomainSchema.optional(),
      value: z.string().min(1),
    },
    async ({ domain, subdomain, value }) => {
      try {
        const data = await client.addDnsRecord(domain, {
          type: "TXT",
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
