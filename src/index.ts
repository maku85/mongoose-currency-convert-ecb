import type { GetRateFn } from "mongoose-currency-convert";

import {
  type EcbGetRateOptions,
  EcbDateOutOfRangeError,
  EcbInvalidCurrencyError,
  EcbNetworkError,
  EcbRateNotFoundError,
  EcbUnsupportedConversionError,
} from "./types";
import { getRateFromECB } from "./utils/fetchRates";

export {
  EcbDateOutOfRangeError,
  EcbInvalidCurrencyError,
  EcbNetworkError,
  EcbRateNotFoundError,
  EcbUnsupportedConversionError,
};
export type { EcbGetRateOptions };
export { HISTORICAL_CURRENCY_CODES } from "./utils/staticRates";

export function createEcbGetRate(options: EcbGetRateOptions = {}): GetRateFn {
  const { timeoutMs = 10_000, retries = 0, retryDelayMs = 500 } = options;

  return async function getRate(from: string, to: string, date?: Date): Promise<number> {
    if (from === to) return 1;

    const rate = await getRateFromECB(from, to, date, timeoutMs, retries, retryDelayMs);
    if (!Number.isFinite(rate) || rate <= 0)
      throw new EcbRateNotFoundError(`No rate for ${from} to ${to}`);

    return rate;
  };
}
