import { z } from "zod";

export const domainSchema = z
  .string()
  .min(3)
  .regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Must be a valid FQDN")
  .describe("Domain (zone) FQDN, e.g. example.com");

export const subdomainSchema = z
  .string()
  .min(1)
  .regex(/^[a-zA-Z0-9_*-]+(\.[a-zA-Z0-9_*-]+)*$/, "Invalid subdomain label")
  .describe("Subdomain label under the zone, e.g. www or _dmarc");

export const ipv4Schema = z.string().ip({ version: "v4" });
export const ipv6Schema = z.string().ip({ version: "v6" });

export const recordIdSchema = z.number().int().positive();

export const prioritySchema = z.number().int().min(0).max(65535);
export const portSchema = z.number().int().min(1).max(65535);
