import type { GetRateFn } from "mongoose-currency-convert";

import { getRateFromECB } from "./utils/fetchRates";

export function createEcbGetRate(): GetRateFn {
  return async function getRate(from: string, to: string, date?: Date): Promise<number> {
    if (from === to) return 1;

    const rate = await getRateFromECB(from, to, date);
    if (!rate) throw new Error(`No rate for ${to}`);

    return rate;
  };
}
