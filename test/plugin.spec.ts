import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

import * as pluginModule from "../src";

chai.use(chaiAsPromised);
const { expect } = chai;

describe("createEcbGetRate", () => {
  afterEach(() => {
    delete (global as any).fetch;
  });

  it("should return 1 if currencies are equal", async () => {
    const getRate = pluginModule.createEcbGetRate();

    const result = await getRate("USD", "USD");

    expect(result).to.equal(1);
  });

  it("should return direct rate if from is EUR", async () => {
    (global as any).fetch = async () => ({
      ok: true,
      text: async () => '<ObsValue value="1.5"/>'
    }) as Response;

    const getRate = pluginModule.createEcbGetRate();

    const result = await getRate("EUR", "USD");
    expect(result).to.equal(1.5);
  });

  it("should return inverse rate if from is not EUR", async () => {
    (global as any).fetch = async () => ({
      ok: true,
      text: async () => '<ObsValue value="2"/>'
    }) as Response;

    const getRate = pluginModule.createEcbGetRate();

    const result = await getRate("USD", "EUR");
    expect(result).to.equal(2);
  });

  it("should throw if getRateFromECB returns falsy", async () => {
    (global as any).fetch = async () => ({
      ok: true,
      text: async () => '<ObsValue value=""/>'
    }) as Response;

    const getRate = pluginModule.createEcbGetRate();

    await expect(getRate("EUR", "USD")).to.be.rejectedWith(Error);
  });
});
