# mongoose-currency-convert-ecb

[![npm version](https://img.shields.io/npm/v/mongoose-currency-convert-ecb)](https://www.npmjs.com/package/mongoose-currency-convert-ecb)
[![license](https://img.shields.io/npm/l/mongoose-currency-convert-ecb)](LICENSE)
[![node](https://img.shields.io/node/v/mongoose-currency-convert-ecb)](package.json)

**ECB currency rate provider for [`mongoose-currency-convert`](https://www.npmjs.com/package/mongoose-currency-convert)**
Fetches exchange rates from the [European Central Bank (ECB) Data Portal API](https://data-api.ecb.europa.eu) and exposes them as a `GetRateFn` compatible with `mongoose-currency-convert`.

---

## Requirements

- Node.js >= 18
- [`mongoose-currency-convert`](https://www.npmjs.com/package/mongoose-currency-convert) (peer dependency)

---

## Installation

```bash
npm install mongoose-currency-convert mongoose-currency-convert-ecb
```

---

## Usage

```ts
import mongoose from "mongoose";
import { currencyConversionPlugin } from "mongoose-currency-convert";
import { createEcbGetRate } from "mongoose-currency-convert-ecb";

const productSchema = new mongoose.Schema({
  price: Number,
  currency: String,
  date: Date,
  priceEur: Number,
});

productSchema.plugin(currencyConversionPlugin, {
  fields: [
    {
      sourcePath: "price",
      currencyPath: "currency",
      datePath: "date",
      targetPath: "priceEur",
      toCurrency: "EUR",
    },
  ],
  getRate: createEcbGetRate(),
});

const Product = mongoose.model("Product", productSchema);

const item = new Product({
  price: 100,
  currency: "USD",
  date: new Date("2024-10-01"),
});

await item.save();

console.log(item.priceEur); // → 93.48 (approximate)
```

---

## API

### `createEcbGetRate(options?)`

Creates a `GetRateFn` that fetches exchange rates from the ECB.

```ts
import { createEcbGetRate } from "mongoose-currency-convert-ecb";

const getRate = createEcbGetRate({
  timeoutMs: 5_000,  // default: 10_000
  retries: 2,        // default: 0
  retryDelayMs: 300, // default: 500
});
```

| Option | Type | Default | Description |
|---|---|---|---|
| `timeoutMs` | `number` | `10000` | HTTP request timeout in milliseconds |
| `retries` | `number` | `0` | Retry attempts on network errors or HTTP 5xx responses |
| `retryDelayMs` | `number` | `500` | Delay in milliseconds between retry attempts |

The returned function has the signature `(from: string, to: string, date?: Date) => Promise<number>`.

---

## How it works

All conversions are **EUR-based**:

- `EUR → X` — one API call fetching the X/EUR rate
- `X → EUR` — one API call, result is inverted (`1 / rate`)
- `X → Y` — two parallel API calls (X/EUR and Y/EUR), result is `rateY / rateX`

When `date` is omitted, the latest available rate is returned. When provided, the exact date is requested. If the ECB has no data for that date (e.g. a weekend or public holiday), `EcbRateNotFoundError` is thrown — no automatic fallback to the nearest business day occurs.

**Date and timezone:** the `date` parameter is formatted using local date methods (`getFullYear`, `getMonth`, `getDate`) rather than UTC. This avoids off-by-one date shifts when running in UTC+ timezones where local midnight precedes UTC midnight.

Rate caching across conversions is handled by the parent package `mongoose-currency-convert`.

---

## Historical currencies

For dates before **4 January 1999**, fixed irrevocable ECB conversion rates are used automatically for the 19 former eurozone currencies:

| Code | Currency |
|---|---|
| ITL | Italian lira |
| DEM | German mark |
| FRF | French franc |
| ESP | Spanish peseta |
| ATS | Austrian schilling |
| BEF | Belgian franc |
| FIM | Finnish markka |
| GRD | Greek drachma |
| IEP | Irish pound |
| LUF | Luxembourg franc |
| NLG | Dutch guilder |
| PTE | Portuguese escudo |
| CYP | Cypriot pound |
| EEK | Estonian kroon |
| MTL | Maltese lira |
| SIT | Slovenian tolar |
| SKK | Slovak koruna |
| LVL | Latvian lats |
| LTL | Lithuanian litas |

The list of supported codes is exported as `HISTORICAL_CURRENCY_CODES`:

```ts
import { HISTORICAL_CURRENCY_CODES } from "mongoose-currency-convert-ecb";

console.log(HISTORICAL_CURRENCY_CODES); // ["ITL", "DEM", "FRF", ...]
```

```ts
// Convert 100,000 Italian lira to EUR (pre-1999)
const getRate = createEcbGetRate();
const rate = await getRate("ITL", "EUR", new Date("1990-01-01"));
console.log(100_000 * rate); // → 51.65
```

---

## Error handling

All errors thrown by this package extend `Error` and have a typed class:

| Class | When thrown |
|---|---|
| `EcbInvalidCurrencyError` | Currency code is not a valid 3-letter ISO 4217 code |
| `EcbDateOutOfRangeError` | Date is before 1999-01-04 and the currency is not historical |
| `EcbUnsupportedConversionError` | Pre-1999 pair mixes a historical currency with a non-historical one (e.g. ITL→USD) |
| `EcbRateNotFoundError` | ECB response does not contain a valid rate for the requested date/currency |
| `EcbNetworkError` | HTTP request failed, timed out, or returned a 5xx after all retry attempts |

```ts
import {
  createEcbGetRate,
  EcbNetworkError,
  EcbRateNotFoundError,
  EcbInvalidCurrencyError,
  EcbDateOutOfRangeError,
  EcbUnsupportedConversionError,
} from "mongoose-currency-convert-ecb";

const getRate = createEcbGetRate({ retries: 2 });

try {
  const rate = await getRate("USD", "GBP", new Date("2024-01-06"));
} catch (err) {
  if (err instanceof EcbNetworkError) {
    // transient failure — consider retrying or using a fallback
  } else if (err instanceof EcbRateNotFoundError) {
    // weekend / holiday — no ECB data for that date
  } else {
    throw err;
  }
}
```

---

## ECB data limitations

- Rates are published on **business days only**. Requesting a weekend or public holiday date throws `EcbRateNotFoundError`.
- Data is available from **4 January 1999** onwards for non-historical currencies.
- Conversions between a historical currency and a non-historical one on pre-1999 dates are not supported and throw `EcbUnsupportedConversionError`.

---

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on branching, commit conventions, and running the test suite locally.

---

## Related packages

| Package | Description |
|---|---|
| [`mongoose-currency-convert`](https://www.npmjs.com/package/mongoose-currency-convert) | Base Mongoose plugin for automatic currency conversion |
| [`mongoose-currency-convert-ecb`](https://www.npmjs.com/package/mongoose-currency-convert-ecb) | ECB rate provider (this package) |

---

## License

MIT © [maku85](https://github.com/maku85)
