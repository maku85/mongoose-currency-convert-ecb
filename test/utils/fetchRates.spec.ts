import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

import { getRateFromECB } from "../../src/utils/fetchRates";

chai.use(chaiAsPromised);
const { expect } = chai;

describe("FetchRates utility", () => {
  afterEach(() => {
     delete (global as any).fetch;
  });

  it("should convert EUR to USD", async () => {
    (global as any).fetch = async () => ({
      ok: true,
      text: async () => '<ObsValue value="1.12"/>'
    }) as Response;

    const rate = await getRateFromECB("EUR", "USD");

    expect(rate).to.equal(1.12);
  });

  it("should convert USD to EUR", async () => {
    (global as any).fetch = async () => ({
      ok: true,
      text: async () => '<ObsValue value="1.25"/>'
    }) as Response;

    const rate = await getRateFromECB("USD", "EUR");

    expect(rate).to.be.closeTo(1 / 1.25, 0.0001);
  });

  it("should convert USD to GBP via EUR", async () => {
    let call = 0;
    (global as any).fetch = async () => {
      call++;
      if (call === 1) {
        return { ok: true, text: async () => '<ObsValue value="1.25"/>' } as Response; // USD/EUR
      } else {
        return { ok: true, text: async () => '<ObsValue value="0.85"/>' } as Response; // GBP/EUR
      }
    };

    const rate = await getRateFromECB("USD", "GBP");

    expect(rate).to.be.closeTo(0.85 / 1.25, 0.0001);
  });

  it("should return 1 for EUR to EUR", async () => {
    const rate = await getRateFromECB("EUR", "EUR");

    expect(rate).to.be.equal(1);
  });

  it("should throw if rate missing for EUR to USD", () => {
    (global as any).fetch = async () => ({
      ok: true,
      text: async () => '<ObsValue value=""/>'
    }) as Response;

    return expect(getRateFromECB("EUR", "USD")).to.eventually.be.rejectedWith(Error);
  });

  it("should throw if fetch not ok", () => {
    (global as any).fetch = async () => ({
      ok: false,
      status: 500,
      statusText: "Internal Error",
      text: async () => ""
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

  it("should throw specific error for date before 1999-01-04", async () => {
    (global as any).fetch = async () => ({
      ok: true,
      text: async () => '<ObsValue value="1.12"/>'
    }) as Response;
    const oldDate = new Date('1990-01-01');

    await expect(getRateFromECB("EUR", "USD", oldDate)).to.be.rejectedWith("No ECB rates available before 4 January 1999");
  });
});
