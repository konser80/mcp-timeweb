import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";
import { TimewebApiError, fromAxiosError } from "../utils/errors.js";

const BASE_URL = "https://api.timeweb.ru";

export type DnsRecordType = "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "SRV";

export interface DnsRecord {
  id: number;
  type: DnsRecordType;
  data: Record<string, unknown>;
  ttl: number;
}

export interface AddRecordInput {
  type: DnsRecordType;
  subdomain?: string;
  data: Record<string, unknown>;
}

interface RetryableConfig extends InternalAxiosRequestConfig {
  _twRetry?: boolean;
}

export class TimewebClient {
  private readonly login: string;
  private readonly password: string;
  private readonly appkey: string;
  private readonly http: AxiosInstance;
  private token: string | null = null;
  private authInFlight: Promise<string> | null = null;

  constructor(login: string, password: string, appkey: string) {
    this.login = login;
    this.password = password;
    this.appkey = appkey;

    this.http = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      headers: { "X-App-Key": appkey },
    });

    this.http.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.set("Authorization", `Bearer ${this.token}`);
      }
      return config;
    });

    this.http.interceptors.response.use(
      (r) => r,
      async (error: AxiosError) => {
        const original = error.config as RetryableConfig | undefined;
        if (error.response?.status === 401 && original && !original._twRetry) {
          original._twRetry = true;
          this.token = null;
          await this.authenticate();
          return this.http.request(original);
        }
        throw fromAxiosError(error);
      }
    );
  }

  private async authenticate(): Promise<string> {
    if (this.authInFlight) return this.authInFlight;
    this.authInFlight = (async () => {
      try {
        const res = await axios.post<{ token?: string }>(
          `${BASE_URL}/v1.2/access`,
          null,
          {
            auth: { username: this.login, password: this.password },
            headers: { "X-App-Key": this.appkey },
            timeout: 30000,
          }
        );
        const token = res.data?.token;
        if (!token) {
          throw new TimewebApiError(
            res.status,
            "AUTH_NO_TOKEN",
            "Timeweb /v1.2/access returned no token",
            res.data
          );
        }
        this.token = token;
        return token;
      } catch (err) {
        if (err instanceof TimewebApiError) throw err;
        if (axios.isAxiosError(err)) throw fromAxiosError(err);
        throw err;
      } finally {
        this.authInFlight = null;
      }
    })();
    return this.authInFlight;
  }

  private async ensureAuth(): Promise<void> {
    if (!this.token) await this.authenticate();
  }

  private async request<T>(
    method: "get" | "post" | "put" | "delete",
    url: string,
    opts: { data?: unknown; params?: Record<string, string | number> } = {}
  ): Promise<T> {
    await this.ensureAuth();
    const res = await this.http.request<T>({
      method,
      url,
      data: opts.data,
      params: opts.params,
    });
    return res.data;
  }

  private get accountPath(): string {
    return `/accounts/${encodeURIComponent(this.login)}`;
  }

  async listDomains(): Promise<string[]> {
    return this.request<string[]>("get", `/v1${this.accountPath}/domains`);
  }

  async getDomain(fqdn: string): Promise<unknown> {
    return this.request<unknown>(
      "get",
      `/v1${this.accountPath}/domains/${encodeURIComponent(fqdn)}`
    );
  }

  async getDnsRecords(
    zone: string,
    subdomain?: string,
    limit = 100,
    offset = 0
  ): Promise<unknown> {
    const fqdn = subdomain ? `${subdomain}.${zone}` : zone;
    return this.request<unknown>(
      "get",
      `/v1.2${this.accountPath}/domains/${encodeURIComponent(fqdn)}/user-records`,
      { params: { limit, offset } }
    );
  }

  async deleteDnsRecord(
    zone: string,
    subdomain: string | undefined,
    recordId: number
  ): Promise<void> {
    const fqdn = subdomain ? `${subdomain}.${zone}` : zone;
    await this.request<void>(
      "delete",
      `/v1.2${this.accountPath}/domains/${encodeURIComponent(fqdn)}/user-records/${recordId}/`
    );
  }

  async addSubdomain(zone: string, subdomain: string): Promise<void> {
    await this.request<void>(
      "post",
      `/v1.1${this.accountPath}/domains/${encodeURIComponent(zone)}/subdomains/${encodeURIComponent(subdomain)}`
    );
  }

  async deleteSubdomain(zone: string, subdomain: string): Promise<void> {
    await this.request<void>(
      "delete",
      `/v1.1${this.accountPath}/domains/${encodeURIComponent(zone)}/subdomains/${encodeURIComponent(subdomain)}`
    );
  }

  async ensureSubdomain(zone: string, subdomain: string): Promise<void> {
    try {
      await this.addSubdomain(zone, subdomain);
    } catch (err) {
      if (err instanceof TimewebApiError && err.status === 409) return;
      throw err;
    }
  }

  async addDnsRecord(zone: string, input: AddRecordInput): Promise<unknown> {
    const { type, subdomain, data } = input;
    if (type === "TXT" && subdomain) {
      const body = { type, data: { ...data, subdomain } };
      return this.request<unknown>(
        "post",
        `/v1.2${this.accountPath}/domains/${encodeURIComponent(zone)}/user-records/`,
        { data: body }
      );
    }
    if (subdomain) {
      await this.ensureSubdomain(zone, subdomain);
      const fqdn = `${subdomain}.${zone}`;
      return this.request<unknown>(
        "post",
        `/v1.2${this.accountPath}/domains/${encodeURIComponent(fqdn)}/user-records/`,
        { data: { type, data } }
      );
    }
    return this.request<unknown>(
      "post",
      `/v1.2${this.accountPath}/domains/${encodeURIComponent(zone)}/user-records/`,
      { data: { type, data } }
    );
  }
}
