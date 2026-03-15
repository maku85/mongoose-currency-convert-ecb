# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [0.1.3](https://github.com/maku85/mongoose-currency-convert-ecb/compare/v0.1.2...v0.1.3) (2026-03-15)


### Bug Fixes

* add date matching for ECB rates in fetchBceRate function ([e1e892b](https://github.com/maku85/mongoose-currency-convert-ecb/commit/e1e892bb8fd461d44358f825942834c65ba8a9a9))
* add detailed JSDoc comments for createEcbGetRate and getRateFromECB functions ([78675de](https://github.com/maku85/mongoose-currency-convert-ecb/commit/78675de52c212b2934fb311963f71a5ef6033860))
* add fast-xml-parser dependency and refactor XML parsing ([b1c17b1](https://github.com/maku85/mongoose-currency-convert-ecb/commit/b1c17b16ddce1ffc27f615acbca9fdae830060d5))
* add retries and retryDelayMs options to ECB rate fetching functions ([7133462](https://github.com/maku85/mongoose-currency-convert-ecb/commit/71334624580d249c5a7a7ea35526f620740af096))
* add timeout option to ECB rate fetching functions and enhance error handling ([172f155](https://github.com/maku85/mongoose-currency-convert-ecb/commit/172f155098c9a6a0790deb4539d9574d347354e5))
* enhance date handling in tests and improve error messages for fetchRates utility ([65160e0](https://github.com/maku85/mongoose-currency-convert-ecb/commit/65160e0030fd87e8f71605639b8dd07b6e9b71c5))
* enhance error handling for invalid exchange rates in getRate and fetchBceRate functions ([ae4ac64](https://github.com/maku85/mongoose-currency-convert-ecb/commit/ae4ac64b755c56142928453a2768cf8c7dc9ca37))
* ensure proper boolean evaluation for static date check in getRateFromECB function ([c2ecf5b](https://github.com/maku85/mongoose-currency-convert-ecb/commit/c2ecf5b60288ba0b579292264cb37be0a9dd8daf))
* export HISTORICAL_CURRENCY_CODES from staticRates module ([3486e0f](https://github.com/maku85/mongoose-currency-convert-ecb/commit/3486e0fde571f8532eb7bde72434d2cc476568b3))
* improve error handling in fetchBceRate and update HISTORICAL_CURRENCY_CODES export ([3b3a1ea](https://github.com/maku85/mongoose-currency-convert-ecb/commit/3b3a1eaa6165b59c8d4ccff4ca8068c18039cbe7))
* improve error message for missing exchange rate in getRate function ([d5ea139](https://github.com/maku85/mongoose-currency-convert-ecb/commit/d5ea1393f8d2f25c3256fa84dc6bfb147e5b9e85))
* refactor date normalization and enhance error handling in fetchBceRate function ([36208bc](https://github.com/maku85/mongoose-currency-convert-ecb/commit/36208bc095bb4f054a26573a18806f3120189de0))
* refactor error handling to use custom error classes for ECB rate fetching ([bee3c3a](https://github.com/maku85/mongoose-currency-convert-ecb/commit/bee3c3abde3e69547dfba704bbe2f5e37bd4b4bd))
* update CONTRIBUTING.md and README.md for clarity and consistency ([b453063](https://github.com/maku85/mongoose-currency-convert-ecb/commit/b453063dfa9b94e07a0c30fd66c237be493ac678))
* update release workflow to use latest actions and improve release notes extraction ([4614d20](https://github.com/maku85/mongoose-currency-convert-ecb/commit/4614d205b8c1f5ebfaec8c21ae2ea7ab9afdd601))
* update repository URL and homepage in package.json; remove unused ECBResponse interface ([0bb7a5a](https://github.com/maku85/mongoose-currency-convert-ecb/commit/0bb7a5ab1d7476adcb7d175ac7c0d512e79c3708))
* update TypeScript configuration for test and build processes ([956189a](https://github.com/maku85/mongoose-currency-convert-ecb/commit/956189af3259d3af795e2d01e5989f2d221f795a))
* validate currency codes in getRateFromECB function ([b25b13b](https://github.com/maku85/mongoose-currency-convert-ecb/commit/b25b13b3149e2b62c0f5bfc9d49d8a130de48d14))
