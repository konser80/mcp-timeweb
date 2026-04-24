import { z } from "zod";

const FQDN_RE = /^[\p{L}\p{N}_-]+(\.[\p{L}\p{N}_-]+)+$/u;
const LABEL_RE = /^[\p{L}\p{N}_*-]+(\.[\p{L}\p{N}_*-]+)*$/u;

export const domainSchema = z
  .string()
  .min(3)
  .regex(FQDN_RE, "Must be a valid FQDN (Cyrillic/IDN allowed)")
  .describe("Zone FQDN, e.g. example.com or пример.рф");

export const subdomainSchema = z
  .string()
  .min(1)
  .regex(LABEL_RE, "Invalid subdomain label")
  .describe("Subdomain label under the zone, e.g. www or _dmarc");

export const fqdnValueSchema = z
  .string()
  .min(3)
  .regex(FQDN_RE, "Must be a valid FQDN");

export const ipv4Schema = z.string().ip({ version: "v4" });
export const ipv6Schema = z.string().ip({ version: "v6" });

export const recordIdSchema = z.number().int().positive();

export const prioritySchema = z.number().int().min(0).max(65535);
export const portSchema = z.number().int().min(1).max(65535);
