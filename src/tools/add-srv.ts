import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TimewebClient } from "../api/client.js";
import { handleToolError } from "../utils/errors.js";
import {
  domainSchema,
  subdomainSchema,
  prioritySchema,
  portSchema,
  fqdnValueSchema,
} from "../schemas/common.js";

export function registerAddSrv(server: McpServer, client: TimewebClient): void {
  server.tool(
    "timeweb_add_srv_record",
    "Add an SRV record (Timeweb's schema: host/port/priority/protocol/service — no weight, no target field).",
    {
      domain: domainSchema,
      subdomain: subdomainSchema.optional(),
      service: z.string().min(1).describe('Service name, e.g. "_sip"'),
      protocol: z.string().min(1).describe('Protocol, e.g. "_TCP"'),
      priority: prioritySchema,
      port: portSchema,
      host: fqdnValueSchema.describe("Target FQDN"),
    },
    async ({ domain, subdomain, service, protocol, priority, port, host }) => {
      try {
        const data = await client.addDnsRecord(domain, {
          type: "SRV",
          subdomain,
          data: { host, port, priority, protocol, service },
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
