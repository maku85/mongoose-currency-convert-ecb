import type { GetRateFn } from "mongoose-currency-convert";

import type { EcbGetRateOptions } from "./types";
import { getRateFromECB } from "./utils/fetchRates";

export function createEcbGetRate(options: EcbGetRateOptions = {}): GetRateFn {
  const { timeoutMs = 10_000 } = options;

  return async function getRate(from: string, to: string, date?: Date): Promise<number> {
    if (from === to) return 1;

    const rate = await getRateFromECB(from, to, date, timeoutMs);
    if (!Number.isFinite(rate) || rate <= 0) throw new Error(`No rate for ${from} to ${to}`);

    return rate;
  };
}
