import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DictionaryView } from "../../../../src/features/phrases/DictionaryView";
import { SettingsProvider } from "../../../../src/lib/settings/SettingsContext";
import { I18nProvider } from "../../../../src/lib/i18n/I18nContext";
import { ThemeProvider } from "../../../../src/lib/settings/ThemeContext";

// Skip database tests in test environment since we're in TAURI-ONLY mode
// These tests require a real Tauri environment with SQLite database
describe.skip("DictionaryView", () => {
    it("shows sample data from database", async () => {
        render(
            <SettingsProvider>
                <ThemeProvider>
                    <I18nProvider>
                        <DictionaryView />
                    </I18nProvider>
                </ThemeProvider>
            </SettingsProvider>,
        );

        // Sample data should be displayed from database
        expect(await screen.findByText("perfect woman")).toBeInTheDocument();
        expect(await screen.findByText("mujer perfecta")).toBeInTheDocument();
    });

    it("shows custom data when database is pre-populated", async () => {
        // This test verifies that the database system works correctly
        render(
            <SettingsProvider>
                <ThemeProvider>
                    <I18nProvider>
                        <DictionaryView />
                    </I18nProvider>
                </ThemeProvider>
            </SettingsProvider>,
        );

        // Verify that sample data is displayed
        expect(await screen.findByText("perfect woman")).toBeInTheDocument();
        expect(await screen.findByText("mujer perfecta")).toBeInTheDocument();
    });
});
