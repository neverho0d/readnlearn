import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DictionaryView } from "../../../../src/features/phrases/DictionaryView";
import { SettingsProvider } from "../../../../src/lib/settings/SettingsContext";
import { I18nProvider } from "../../../../src/lib/i18n/I18nContext";
import { ThemeProvider } from "../../../../src/lib/settings/ThemeContext";

// This test covers the localStorage fallback only (no SQL plugin in test env)

beforeEach(() => {
    localStorage.clear();
});

describe("DictionaryView", () => {
    it("shows empty state and then data from localStorage", async () => {
        render(
            <SettingsProvider>
                <ThemeProvider>
                    <I18nProvider>
                        <DictionaryView />
                    </I18nProvider>
                </ThemeProvider>
            </SettingsProvider>,
        );
        expect(await screen.findByText(/No phrases yet/i)).toBeInTheDocument();

        // seed one item
        localStorage.setItem(
            "readnlearn-phrases",
            JSON.stringify([
                {
                    id: "1",
                    lang: "es",
                    text: "hola",
                    translation: "hi",
                    context: "hola amigo",
                    tags: ["greeting"],
                    addedAt: new Date().toISOString(),
                },
            ]),
        );

        // re-render to simulate navigation refresh
        render(
            <SettingsProvider>
                <ThemeProvider>
                    <I18nProvider>
                        <DictionaryView />
                    </I18nProvider>
                </ThemeProvider>
            </SettingsProvider>,
        );
        expect(await screen.findByText("hola")).toBeInTheDocument();
    });
});
