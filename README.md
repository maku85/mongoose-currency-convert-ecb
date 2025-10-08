# mongoose-currency-convert-ecb

**ECB currency rate provider for [`mongoose-currency-convert`](https://www.npmjs.com/package/mongoose-currency-convert)**  
Converts currencies using the [European Central Bank (ECB)](https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml) rates via the [ECB Data Portal API](https://data-api.ecb.europa.eu).

---

## 🚀 Overview

This package is an **extension plugin** for [`mongoose-currency-convert`](https://www.npmjs.com/package/mongoose-currency-convert).  
It provides a simple provider that retrieves historical and current exchange rates from the **European Central Bank (ECB)**.

You can use it to automatically convert and store currency values at document save time - without worrying about managing APIs, caching, or rate normalization.

---

## 📦 Installation

```bash
npm install mongoose-currency-convert mongoose-currency-convert-ecb
```

---

## ⚙️ Usage Example

```ts
import mongoose from "mongoose";
import { currencyConversionPlugin } from 'mongoose-currency-convert';
import { createEcbGetRate } from "mongoose-currency-convert-ecb";

const productSchema = new mongoose.Schema({
  price: {
    amount: Number,
    currency: String,
    date: Date
  },
  priceConversion: {
    amount: Number,
    currency: String,
    date: Date
  }
});

productSchema.plugin(currencyConverter, {
  targetCurrency: "EUR",
  fields: [
    {
      source: "price.amount",
      currencyField: "price.currency",
      dateField: "price.date",
      target: "priceConversion"
    }
  ],
  getRate: createEcbGetRate(),
});

const Product = mongoose.model("Product", productSchema);

// Example
const item = new Product({
  price: { amount: 100, currency: "USD", date: new Date("2024-10-01") }
});

await item.save();

console.log(item.priceConversion);
// → { amount: 93.48, currency: "EUR", date: "2024-10-01" }
```
---

## 🌐 Supported Currencies

This provider supports:

- All ECB official currencies (EUR, USD, GBP, CHF, JPY, etc.)
- All historical eurozone currencies for dates before 1999-01-04:
  - ITL (Italian lira)
  - DEM (German mark)
  - FRF (French franc)
  - ESP (Spanish peseta)
  - ATS (Austrian schilling)
  - BEF (Belgian franc)
  - FIM (Finnish markka)
  - GRD (Greek drachma)
  - IEP (Irish pound)
  - LUF (Luxembourg franc)
  - NLG (Dutch guilder)
  - PTE (Portuguese escudo)
  - CYP (Cypriot pound)
  - EEK (Estonian kroon)
  - MTL (Maltese lira)
  - SIT (Slovenian tolar)
  - SKK (Slovak koruna)
  - LVL (Latvian lats)
  - LTL (Lithuanian litas)

---

## ⚠️ ECB Data Limitations

- Rates are available from 4 January 1999 onwards for most currencies.
- For historical eurozone currencies, fixed conversion rates are used for dates before 1999-01-04.
- If you request a conversion for a currency/date not supported, an error is thrown.

---

## 🏛️ Example: Historical Currency Conversion

```ts
// Convert 100,000 Italian lira to euro (before 1999)
import { createEcbGetRate } from "mongoose-currency-convert-ecb";

const getRate = createEcbGetRate();
const rate = await getRate("ITL", "EUR", new Date("1990-01-01"));
console.log("ITL to EUR rate:", rate); // → ~0.000516
console.log("100000 ITL in EUR:", 100000 * rate); // → ~51.65
```

---

## 🧠 How It Works

When a document is saved:

1. The base plugin reads the configured field(s).
2. It calls the `getRate(from, to, date)` function from this package.
3. The ECB provider fetches the exchange rate from the official API.
4. The result is cached (if enabled) and returned.
5. The converted value and metadata (currency, date) are stored in the defined target field.

---

## 🪪 License

MIT © 2025

## 🌍 Related Packages

| Package | Description |
|---------|-------------|
| `mongoose-currency-convert`     | Base plugin for currency conversion and field mapping. |
| `mongoose-currency-convert-ecb` | ECB provider for automatic exchange rate lookup.       |
