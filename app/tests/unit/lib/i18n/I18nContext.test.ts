import { describe, it, expect } from "vitest";
import { getSampleTextForLanguage } from "../../../../src/lib/i18n/I18nContext";

describe("getSampleTextForLanguage", () => {
    it("returns English sample for unknown language", () => {
        const sample = getSampleTextForLanguage("xx");
        expect(sample).toContain("My Trip to Spain");
    });

    it("returns Spanish sample for es", () => {
        const sample = getSampleTextForLanguage("es");
        expect(sample).toContain("Mi Viaje a España");
    });
});
