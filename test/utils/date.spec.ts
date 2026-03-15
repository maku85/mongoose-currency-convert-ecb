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

  it("should use local date (not UTC) to avoid timezone shifts at midnight", () => {
    // new Date(year, month, day) constructs a local midnight date.
    // In UTC+ timezones, local midnight is before UTC midnight, so toISOString()
    // would return the previous day. getFullYear/Month/Date always return the local day.
    const d = new Date(2024, 0, 5); // local midnight Jan 5

    expect(normalizeDate(d)).to.equal("2024-01-05");
  });
});
