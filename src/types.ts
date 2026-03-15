export interface EcbGetRateOptions {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
}

export class EcbInvalidCurrencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EcbInvalidCurrencyError";
  }
}

export class EcbNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EcbNetworkError";
  }
}

export class EcbDateOutOfRangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EcbDateOutOfRangeError";
  }
}

export class EcbRateNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EcbRateNotFoundError";
  }
}

export class EcbUnsupportedConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EcbUnsupportedConversionError";
  }
}
