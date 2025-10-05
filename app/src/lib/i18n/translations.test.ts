import { describe, it, expect } from "vitest";
import { translations } from "./translations";

describe("translations", () => {
  it("contains required languages", () => {
    for (const lang of ["en", "es", "fr", "de", "it", "pt"]) {
      expect(translations[lang]).toBeTruthy();
    }
  });

  it("each language has sampleText and appTitle", () => {
    for (const lang of Object.keys(translations)) {
      const t = translations[lang];
      expect(typeof t.sampleText).toBe("string");
      expect(t.sampleText.length).toBeGreaterThan(10);
      expect(t.appTitle).toBe("Read-n-Learn");
    }
  });
});
