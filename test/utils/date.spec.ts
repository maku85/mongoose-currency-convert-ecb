import { expect } from "chai";

import { normalizeDate } from "../../src/utils/date";

describe("Date utility", () => {
  it("should return empty string for undefined date", () => {
    expect(normalizeDate()).to.equal("");
  });

  it("should format date as YYYY-MM-DD", () => {
    const d = new Date("2024-01-05T10:00:00Z");

    expect(normalizeDate(d)).to.equal("2024-01-05");
  });
});
