import { describe, it, expect } from "vitest";
import { withLocalePrefix } from "@/lib/locale-boundary.js";

describe("withLocalePrefix", () => {
  it("prefixes a bare path for nl", () => {
    expect(withLocalePrefix("/e/demo-gots-talent", "", "nl")).toBe("/nl/e/demo-gots-talent");
  });

  it("swaps an existing nl prefix for en", () => {
    expect(withLocalePrefix("/nl/e/demo-gots-talent", "", "en")).toBe("/en/e/demo-gots-talent");
  });

  it("strips the prefix back to bare for fr", () => {
    expect(withLocalePrefix("/en/admin/events/1", "", "fr")).toBe("/admin/events/1");
  });

  it("preserves the query string", () => {
    expect(withLocalePrefix("/e/demo-gots-talent", "?foo=bar", "nl")).toBe(
      "/nl/e/demo-gots-talent?foo=bar",
    );
  });

  it("handles the root path", () => {
    expect(withLocalePrefix("/", "", "nl")).toBe("/nl");
    expect(withLocalePrefix("/nl", "", "en")).toBe("/en");
    expect(withLocalePrefix("/en", "", "fr")).toBe("/");
  });

  it("is a no-op when already on the target locale", () => {
    expect(withLocalePrefix("/nl/e/demo-gots-talent", "", "nl")).toBe("/nl/e/demo-gots-talent");
  });
});
