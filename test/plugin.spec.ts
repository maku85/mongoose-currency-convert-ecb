import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

import * as pluginModule from "../src";

chai.use(chaiAsPromised);
const { expect } = chai;

describe("createEcbGetRate", () => {
  afterEach(() => {
    delete (global as Record<string, unknown>).fetch;
  });

  it("should return 1 if currencies are equal", async () => {
    const getRate = pluginModule.createEcbGetRate();

    const result = await getRate("USD", "USD");

    expect(result).to.equal(1);
  });

  const sdmxXml = (value: string) =>
    `<GenericData><DataSet><Series><Obs><ObsDimension value="2024-01-05"/><ObsValue value="${value}"/></Obs></Series></DataSet></GenericData>`;

  it("should return direct rate if from is EUR", async () => {
    (global as Record<string, unknown>).fetch = async () => ({
      ok: true,
      text: async () => sdmxXml("1.5"),
    }) as Response;

    const getRate = pluginModule.createEcbGetRate();

    const result = await getRate("EUR", "USD");
    expect(result).to.be.equal(1.5);
  });

  it("should return inverse rate if from is not EUR", async () => {
    (global as Record<string, unknown>).fetch = async () => ({
      ok: true,
      text: async () => sdmxXml("2"),
    }) as Response;

    const getRate = pluginModule.createEcbGetRate();

    const result = await getRate("USD", "EUR");
    expect(result).to.be.closeTo(1 / 2, 0.0001);
  });

  it("should throw if getRateFromECB returns falsy", async () => {
    (global as Record<string, unknown>).fetch = async () => ({
      ok: true,
      text: async () => sdmxXml(""),
    }) as Response;

    const getRate = pluginModule.createEcbGetRate();

    await expect(getRate("EUR", "USD")).to.be.rejectedWith(Error);
  });
});
