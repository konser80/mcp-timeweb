import type { AxiosError } from "axios";

export class TimewebApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "TimewebApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function fromAxiosError(err: AxiosError): TimewebApiError {
  const status = err.response?.status ?? 0;
  const body = err.response?.data as Record<string, unknown> | undefined;
  const code =
    (body?.["error_code"] as string | undefined) ??
    (body?.["code"] as string | undefined) ??
    err.code ??
    "UNKNOWN_ERROR";
  const message =
    (body?.["error_msg"] as string | undefined) ??
    (body?.["message"] as string | undefined) ??
    (body?.["error_text"] as string | undefined) ??
    err.message ??
    "Unknown error";
  return new TimewebApiError(status, code, message, body);
}

export function formatError(err: TimewebApiError): string {
  const statusPart = err.status ? err.status : "?";
  return `Timeweb API ${statusPart}: ${err.code} — ${err.message}`;
}

export function handleToolError(error: unknown): {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
} {
  if (error instanceof TimewebApiError) {
    return { content: [{ type: "text", text: formatError(error) }], isError: true };
  }
  const msg = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text", text: `Unexpected error: ${msg}` }], isError: true };
}
