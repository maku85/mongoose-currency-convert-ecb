import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

import { getRateFromECB } from "../../src/utils/fetchRates";

chai.use(chaiAsPromised);
const { expect } = chai;

describe("FetchRates utility", () => {
  afterEach(() => {
     delete (global as Record<string, unknown>).fetch;
  });

  const sdmxXml = (value: string, date = "2024-01-05") =>
    `<GenericData><DataSet><Series><Obs><ObsDimension value="${date}"/><ObsValue value="${value}"/></Obs></Series></DataSet></GenericData>`;

  it("should convert EUR to USD", async () => {
    (global as Record<string, unknown>).fetch = async () => ({
      ok: true,
      text: async () => sdmxXml("1.12"),
    }) as Response;

    const rate = await getRateFromECB("EUR", "USD");

    expect(rate).to.be.closeTo(1.12, 0.0001);
  });

  it("should convert USD to EUR", async () => {
    (global as Record<string, unknown>).fetch = async () => ({
      ok: true,
      text: async () => sdmxXml("1.25"),
    }) as Response;

    const rate = await getRateFromECB("USD", "EUR");

    expect(rate).to.be.closeTo(1 / 1.25, 0.0001);
  });

  it("should convert USD to GBP via EUR", async () => {
    let call = 0;
    (global as Record<string, unknown>).fetch = async () => {
      call++;
      const xml = sdmxXml(call === 1 ? "1.25" : "0.85");
      return { ok: true, text: async () => xml } as Response;
    };

    const rate = await getRateFromECB("USD", "GBP");

    expect(rate).to.be.closeTo(0.85 / 1.25, 0.0001);
  });

  it("should return 1 for EUR to EUR", async () => {
    const rate = await getRateFromECB("EUR", "EUR");

    expect(rate).to.be.equal(1);
  });

  it("should throw if rate missing for EUR to USD", () => {
    (global as Record<string, unknown>).fetch = async () => ({
      ok: true,
      text: async () => sdmxXml(""),
    }) as Response;

    return expect(getRateFromECB("EUR", "USD")).to.eventually.be.rejectedWith(Error);
  });

  it("should throw if fetch not ok", () => {
    (global as Record<string, unknown>).fetch = async () => ({
      ok: false,
      status: 500,
      statusText: "Internal Error",
      text: async () => "",
    }) as Response;

    return expect(getRateFromECB("EUR", "USD")).to.eventually.be.rejectedWith(Error);
  });

  it("should convert EUR to ITL before 1999-01-04", async () => {
    const oldDate = new Date('1990-01-01');
    const rate = await getRateFromECB("EUR", "ITL", oldDate);

    expect(rate).to.equal(1936.27);
  });

  it("should convert ITL to EUR before 1999-01-04", async () => {
    const oldDate = new Date('1990-01-01');
    const rate = await getRateFromECB("ITL", "EUR", oldDate);

    expect(rate).to.be.closeTo(1 / 1936.27, 1e-8);
  });

  it("should convert ITL to DEM before 1999-01-04", async () => {
    const oldDate = new Date('1990-01-01');
    const rate = await getRateFromECB("ITL", "DEM", oldDate);

    expect(rate).to.be.closeTo(1.95583 / 1936.27, 1e-8);
  });

  it("should throw for unsupported conversion ITL to USD before 1999-01-04", async () => {
    const oldDate = new Date('1990-01-01');

    await expect(getRateFromECB("ITL", "USD", oldDate)).to.be.rejectedWith("Conversion not supported for ITL to USD on 1990-01-01");
  });

  it("should throw when ECB returns a different date than requested (weekend/holiday)", async () => {
    // 2024-01-06 is a Saturday; ECB returns the nearest prior business day (Friday 2024-01-05)
    (global as Record<string, unknown>).fetch = async () => ({
      ok: true,
      text: async () => sdmxXml("1.08", "2024-01-05"),
    }) as Response;
    const saturday = new Date(2024, 0, 6); // local date → normalizeDate → "2024-01-06"

    await expect(getRateFromECB("EUR", "USD", saturday)).to.be.rejectedWith(
      "No ECB rate for USD on 2024-01-06 (nearest available: 2024-01-05)",
    );
  });

  it("should throw specific error for date before 1999-01-04", async () => {
    (global as Record<string, unknown>).fetch = async () => ({
      ok: true,
      text: async () => '<ObsValue value="1.12"/>',
    }) as Response;
    const oldDate = new Date("1990-01-01");

    await expect(getRateFromECB("EUR", "USD", oldDate)).to.be.rejectedWith(
      "No ECB rates available before 4 January 1999",
    );
  });

  it("should throw on network error", () => {
    (global as Record<string, unknown>).fetch = async () => {
      throw new Error("Network failure");
    };

    return expect(getRateFromECB("EUR", "USD")).to.eventually.be.rejectedWith("Network failure");
  });

  it("should throw timeout error when fetch is aborted", () => {
    (global as Record<string, unknown>).fetch = async () => {
      const err = new Error("The operation was aborted.");
      err.name = "AbortError";
      throw err;
    };

    return expect(getRateFromECB("EUR", "USD")).to.eventually.be.rejectedWith(/timed out after/);
  });

  it("should throw for invalid currency code (too short)", () => {
    return expect(getRateFromECB("US", "EUR")).to.eventually.be.rejectedWith(
      'Invalid currency code: "US"',
    );
  });

  it("should throw for currency code with special characters", () => {
    return expect(getRateFromECB("US$", "EUR")).to.eventually.be.rejectedWith(
      'Invalid currency code: "US$"',
    );
  });

  it("should throw for invalid (non-numeric) rate value in XML", () => {
    const xml = sdmxXml(".");
    (global as Record<string, unknown>).fetch = async () => ({
      ok: true,
      text: async () => xml,
    }) as Response;

    return expect(getRateFromECB("EUR", "USD")).to.eventually.be.rejectedWith(/Invalid rate value/);
  });

  it("should use the first observation when XML contains multiple Obs elements", async () => {
    const xml =
      `<GenericData><DataSet><Series>` +
      `<Obs><ObsDimension value="2024-01-05"/><ObsValue value="1.12"/></Obs>` +
      `<Obs><ObsDimension value="2024-01-04"/><ObsValue value="1.10"/></Obs>` +
      `</Series></DataSet></GenericData>`;
    (global as Record<string, unknown>).fetch = async () => ({
      ok: true,
      text: async () => xml,
    }) as Response;

    const rate = await getRateFromECB("EUR", "USD");

    expect(rate).to.be.closeTo(1.12, 0.0001);
  });
});
