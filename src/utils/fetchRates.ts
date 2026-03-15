import { XMLParser } from "fast-xml-parser";

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

async function fetchBceRate(currency: string, day: string, timeoutMs: number): Promise<number> {
  if (day) {
    const d = new Date(day);
    if (d < MIN_ECB_DATE) {
      throw new Error(`No ECB rates available before 4 January 1999 (requested: ${day})`);
    }
  }

  let url = `https://data-api.ecb.europa.eu/service/data/EXR/D.${currency}.EUR..?detail=dataonly&lastNObservations=1`;
  if (day) url += `&endPeriod=${day}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: "application/xml" }, signal: controller.signal });
  } catch (err) {
    if ((err as Error).name === "AbortError")
      throw new Error(`ECB API request timed out after ${timeoutMs}ms`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error(`ECB API error: ${res.status} ${res.statusText}`);

  const xml = await res.text();

  let parsed: unknown;
  try {
    parsed = XML_PARSER.parse(xml);
  } catch {
    throw new Error(`Failed to parse ECB response for ${currency} on ${day}`);
  }

  const rawObs = (parsed as EcbXmlParsed)?.GenericData?.DataSet?.Series?.Obs;
  const obs = Array.isArray(rawObs) ? rawObs[0] : rawObs;
  if (!obs) throw new Error(`Missing rate for ${currency} on ${day}`);

  const actualDate: string | undefined = obs?.ObsDimension?.["@_value"];
  if (day && actualDate && actualDate !== day) {
    throw new Error(`No ECB rate for ${currency} on ${day} (nearest available: ${actualDate})`);
  }

  const rawValue: string | undefined = obs?.ObsValue?.["@_value"];
  if (!rawValue) throw new Error(`Missing rate for ${currency} on ${day}`);

  const value = parseFloat(rawValue);
  if (!Number.isFinite(value) || value <= 0)
    throw new Error(`Invalid rate value for ${currency} on ${day}: "${rawValue}"`);
  return value;
}

export async function getRateFromECB(
  from: string,
  to: string,
  date?: Date,
  timeoutMs = 10_000,
): Promise<number> {
  const base = from.toUpperCase();
  const symbol = to.toUpperCase();

  const ISO4217 = /^[A-Z]{3}$/;
  if (!ISO4217.test(base)) throw new Error(`Invalid currency code: "${from}"`);
  if (!ISO4217.test(symbol)) throw new Error(`Invalid currency code: "${to}"`);

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
    throw new Error(`Conversion not supported for ${base} to ${symbol} on ${day}`);
  }

  if (base === "EUR") return await fetchBceRate(symbol, day, timeoutMs);
  if (symbol === "EUR") return 1 / (await fetchBceRate(base, day, timeoutMs));

  const [rateBase, rateSymbol] = await Promise.all([
    fetchBceRate(base, day, timeoutMs),
    fetchBceRate(symbol, day, timeoutMs),
  ]);
  return rateSymbol / rateBase;
}
