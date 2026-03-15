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
    let res: Response;
    try {
      res = await fetch(url, { headers: { Accept: "application/xml" }, signal: controller.signal });
    } catch (err) {
      clearTimeout(timer);
      lastError =
        (err as Error).name === "AbortError"
          ? new EcbNetworkError(`ECB API request timed out after ${timeoutMs}ms`)
          : new EcbNetworkError((err as Error).message);
      continue;
    }
    clearTimeout(timer);

    if (res.status >= 500) {
      lastError = new EcbNetworkError(`ECB API error: ${res.status} ${res.statusText}`);
      continue;
    }
    if (!res.ok) throw new EcbNetworkError(`ECB API error: ${res.status} ${res.statusText}`);

    const xml = await res.text();

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

  const ISO4217 = /^[A-Z]{3}$/;
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
