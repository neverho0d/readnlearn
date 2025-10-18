import { describe, it, expect } from "vitest";
import { getLanguageNameInUI } from "../../../../src/lib/utils/languageDetection";

describe("getLanguageNameInUI", () => {
    it("returns English names when UI is en", () => {
        expect(getLanguageNameInUI("es", "en")).toBe("Spanish");
        expect(getLanguageNameInUI("en", "en")).toBe("English");
    });

    it("returns Spanish names when UI is es", () => {
        expect(getLanguageNameInUI("en", "es")).toBe("Inglés");
        expect(getLanguageNameInUI("fr", "es")).toBe("Francés");
    });

    it("falls back to code when unknown mapping", () => {
        expect(getLanguageNameInUI("xx", "en")).toBe("xx");
        expect(getLanguageNameInUI("xx", "zz")).toBe("xx");
    });
});
