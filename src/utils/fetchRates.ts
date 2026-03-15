import { XMLParser } from "fast-xml-parser";

import {
  EcbDateOutOfRangeError,
  EcbInvalidCurrencyError,
  EcbNetworkError,
  EcbRateNotFoundError,
  EcbUnsupportedConversionError,
} from "../types";
import STATIC_EURO_RATES from "./staticRates";
import { normalizeDate } from "./date";

interface EcbXmlObs {
  ObsDimension?: { "@_value"?: string };
  ObsValue?: { "@_value"?: string };
}

interface EcbXmlParsed {
  GenericData?: { DataSet?: { Series?: { Obs?: EcbXmlObs | EcbXmlObs[] } } };
}

const ISO4217 = /^[A-Z]{3}$/;
const MIN_ECB_DATE = new Date("1999-01-04");
const XML_PARSER = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
});

async function fetchBceRate(
  currency: string,
  day: string,
  timeoutMs: number,
  retries: number,
  retryDelayMs: number,
): Promise<number> {
  if (day) {
    const d = new Date(day);
    if (d < MIN_ECB_DATE) {
      throw new EcbDateOutOfRangeError(
        `No ECB rates available before 4 January 1999 (requested: ${day})`,
      );
    }
  }

  let url = `https://data-api.ecb.europa.eu/service/data/EXR/D.${currency}.EUR..?detail=dataonly&lastNObservations=1`;
  if (day) url += `&endPeriod=${day}`;

  let lastError: Error = new EcbNetworkError("Unknown error");
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, retryDelayMs));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let xml: string;
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/xml" },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.status >= 500) {
        lastError = new EcbNetworkError(`ECB API error: ${res.status} ${res.statusText}`);
        continue;
      }
      if (!res.ok) throw new EcbNetworkError(`ECB API error: ${res.status} ${res.statusText}`);

      xml = await res.text();
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof EcbNetworkError) throw err;
      lastError =
        (err as Error).name === "AbortError"
          ? new EcbNetworkError(`ECB API request timed out after ${timeoutMs}ms`)
          : new EcbNetworkError((err as Error).message);
      continue;
    }

    let parsed: unknown;
    try {
      parsed = XML_PARSER.parse(xml);
    } catch {
      throw new EcbRateNotFoundError(`Failed to parse ECB response for ${currency} on ${day}`);
    }

    const rawObs = (parsed as EcbXmlParsed)?.GenericData?.DataSet?.Series?.Obs;
    const obs = Array.isArray(rawObs) ? rawObs[0] : rawObs;
    if (!obs) throw new EcbRateNotFoundError(`Missing rate for ${currency} on ${day}`);

    const actualDate: string | undefined = obs?.ObsDimension?.["@_value"];
    if (day && actualDate && actualDate !== day) {
      throw new EcbRateNotFoundError(
        `No ECB rate for ${currency} on ${day} (nearest available: ${actualDate})`,
      );
    }

    const rawValue: string | undefined = obs?.ObsValue?.["@_value"];
    if (!rawValue) throw new EcbRateNotFoundError(`Missing rate for ${currency} on ${day}`);

    const value = parseFloat(rawValue);
    if (!Number.isFinite(value) || value <= 0)
      throw new EcbRateNotFoundError(`Invalid rate value for ${currency} on ${day}: "${rawValue}"`);
    return value;
  }

  throw lastError;
}

/**
 * Fetches the exchange rate between two currencies using the ECB Data Portal API.
 *
 * All conversions are EUR-based: non-EUR pairs are resolved via two API calls (X→EUR and Y→EUR).
 * For dates before 1999-01-04, fixed irrevocable eurozone rates are used for the 19 historical
 * currencies; non-historical currencies on those dates will throw {@link EcbUnsupportedConversionError}.
 *
 * @param from - ISO 4217 source currency code (e.g. `"USD"`).
 * @param to - ISO 4217 target currency code (e.g. `"EUR"`).
 * @param date - Optional reference date. Uses the latest available rate when omitted.
 * @param timeoutMs - HTTP request timeout in milliseconds. Default: `10_000`.
 * @param retries - Number of retry attempts on network errors or HTTP 5xx responses. Default: `0`.
 * @param retryDelayMs - Delay in milliseconds between retry attempts. Default: `500`.
 * @returns The exchange rate as a positive number (amount of `to` per 1 unit of `from`).
 *
 * @throws {EcbInvalidCurrencyError} If either currency code is not a valid 3-letter ISO 4217 code.
 * @throws {EcbDateOutOfRangeError} If `date` is before 1999-01-04 and the currencies require an API call.
 * @throws {EcbUnsupportedConversionError} If `date` is before 1999-01-04 and the pair cannot be resolved with static rates.
 * @throws {EcbRateNotFoundError} If the ECB response does not contain a valid rate.
 * @throws {EcbNetworkError} If the HTTP request fails or times out after all retry attempts.
 */
export async function getRateFromECB(
  from: string,
  to: string,
  date?: Date,
  timeoutMs = 10_000,
  retries = 0,
  retryDelayMs = 500,
): Promise<number> {
  const base = from.toUpperCase();
  const symbol = to.toUpperCase();

  if (!ISO4217.test(base)) throw new EcbInvalidCurrencyError(`Invalid currency code: "${from}"`);
  if (!ISO4217.test(symbol)) throw new EcbInvalidCurrencyError(`Invalid currency code: "${to}"`);

  if (base === symbol) return 1;

  const day = normalizeDate(date);
  const isStaticDate = !!day && new Date(day) < MIN_ECB_DATE;
  const isBaseStatic = base in STATIC_EURO_RATES;
  const isSymbolStatic = symbol in STATIC_EURO_RATES;

  if (isStaticDate && (isBaseStatic || isSymbolStatic)) {
    if (base === "EUR" && isSymbolStatic) return STATIC_EURO_RATES[symbol];
    if (symbol === "EUR" && isBaseStatic) return 1 / STATIC_EURO_RATES[base];
    if (isBaseStatic && isSymbolStatic) {
      return STATIC_EURO_RATES[symbol] / STATIC_EURO_RATES[base];
    }
    throw new EcbUnsupportedConversionError(
      `Conversion not supported for ${base} to ${symbol} on ${day}`,
    );
  }

  if (base === "EUR") return await fetchBceRate(symbol, day, timeoutMs, retries, retryDelayMs);
  if (symbol === "EUR")
    return 1 / (await fetchBceRate(base, day, timeoutMs, retries, retryDelayMs));

  const [rateBase, rateSymbol] = await Promise.all([
    fetchBceRate(base, day, timeoutMs, retries, retryDelayMs),
    fetchBceRate(symbol, day, timeoutMs, retries, retryDelayMs),
  ]);
  return rateSymbol / rateBase;
}
