export interface ECBResponse {
  date: string;
  rates: Record<string, number>;
}

export interface EcbGetRateOptions {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
}
