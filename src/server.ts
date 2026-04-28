import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TimewebClient } from "./api/client.js";
import { registerListDomains } from "./tools/list-domains.js";
import { registerGetDomain } from "./tools/get-domain.js";
import { registerGetDnsRecords } from "./tools/get-dns-records.js";
import { registerAddA } from "./tools/add-a.js";
import { registerAddAaaa } from "./tools/add-aaaa.js";
import { registerAddCname } from "./tools/add-cname.js";
import { registerAddMx } from "./tools/add-mx.js";
import { registerAddTxt } from "./tools/add-txt.js";
import { registerAddSrv } from "./tools/add-srv.js";
import { registerDeleteDnsRecord } from "./tools/delete-dns-record.js";
import { registerAddSubdomain } from "./tools/add-subdomain.js";
import { registerDeleteSubdomain } from "./tools/delete-subdomain.js";

export function createServer(client: TimewebClient): McpServer {
  const server = new McpServer({
    name: "timeweb-mcp-server",
    version: "0.2.0",
  });

  registerListDomains(server, client);
  registerGetDomain(server, client);
  registerGetDnsRecords(server, client);
  registerAddA(server, client);
  registerAddAaaa(server, client);
  registerAddCname(server, client);
  registerAddMx(server, client);
  registerAddTxt(server, client);
  registerAddSrv(server, client);
  registerDeleteDnsRecord(server, client);
  registerAddSubdomain(server, client);
  registerDeleteSubdomain(server, client);

  return server;
}
