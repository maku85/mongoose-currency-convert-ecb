import STATIC_EURO_RATES from "./staticRates";
import { normalizeDate } from "./date";

const MIN_ECB_DATE = new Date("1999-01-04");
const OBS_VALUE_REGEX = /ObsValue value="([0-9.]+)"/;

async function fetchBceRate(currency: string, day: string): Promise<number> {
  if (day) {
    const d = new Date(day);
    if (d < MIN_ECB_DATE) {
      throw new Error(`No ECB rates available before 4 January 1999 (requested: ${day})`);
    }
  }

  let url = `https://data-api.ecb.europa.eu/service/data/EXR/D.${currency}.EUR..?detail=dataonly&lastNObservations=1`;
  if (day) url += `&endPeriod=${day}`;
  const res = await fetch(url, { headers: { Accept: "application/xml" } });
  if (!res.ok) throw new Error(`ECB API error: ${res.status} ${res.statusText}`);

  const xml = await res.text();
  const match = xml.match(OBS_VALUE_REGEX);
  if (!match || !match[1]) throw new Error(`Missing rate for ${currency} on ${day}`);

  return parseFloat(match[1]);
}

export async function getRateFromECB(from: string, to: string, date?: Date): Promise<number> {
  const base = from.toUpperCase();
  const symbol = to.toUpperCase();
  if (base === symbol) return 1;

  const day = normalizeDate(date);
  const isStaticDate = day && new Date(day) < MIN_ECB_DATE;
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

  if (base === "EUR") return await fetchBceRate(symbol, day);
  if (symbol === "EUR") return 1 / (await fetchBceRate(base, day));

  const [rateBase, rateSymbol] = await Promise.all([
    fetchBceRate(base, day),
    fetchBceRate(symbol, day),
  ]);
  return rateSymbol / rateBase;
}
