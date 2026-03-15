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

/**
 * Creates a `GetRateFn` that fetches exchange rates from the European Central Bank (ECB) Data Portal.
 *
 * Supports all currencies available via the ECB SDMX API as well as the 19 historical eurozone
 * currencies (ITL, DEM, FRF, …) for dates before 1999-01-04 using fixed irrevocable conversion rates.
 *
 * @param options - Optional configuration.
 * @param options.timeoutMs - HTTP request timeout in milliseconds. Default: `10_000`.
 * @param options.retries - Number of retry attempts on network errors or HTTP 5xx responses. Default: `0`.
 * @param options.retryDelayMs - Delay in milliseconds between retry attempts. Default: `500`.
 * @returns A `GetRateFn` compatible with `mongoose-currency-convert`.
 *
 * @example
 * ```ts
 * import { currencyConversionPlugin } from "mongoose-currency-convert";
 * import { createEcbGetRate } from "mongoose-currency-convert-ecb";
 *
 * schema.plugin(currencyConversionPlugin, {
 *   fields: [{ sourcePath: "price", currencyPath: "currency", targetPath: "priceEur", toCurrency: "EUR" }],
 *   getRate: createEcbGetRate({ timeoutMs: 5_000, retries: 2 }),
 * });
 * ```
 */
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
