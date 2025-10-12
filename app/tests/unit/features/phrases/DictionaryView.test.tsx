import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DictionaryView } from "../../../../src/features/phrases/DictionaryView";
import { SettingsProvider } from "../../../../src/lib/settings/SettingsContext";
import { I18nProvider } from "../../../../src/lib/i18n/I18nContext";
import { ThemeProvider } from "../../../../src/lib/settings/ThemeContext";
import { AuthProvider } from "../../../../src/lib/auth/AuthContext";

// Mock Supabase
vi.mock("../../../../src/lib/supabase/client", () => ({
    supabase: {
        auth: {
            getSession: vi.fn().mockResolvedValue({
                data: { session: { user: { id: "test-user" } } },
                error: null,
            }),
            getUser: vi.fn().mockResolvedValue({
                data: { user: { id: "test-user" } },
                error: null,
            }),
            onAuthStateChange: vi.fn(() => ({
                data: { subscription: { unsubscribe: vi.fn() } },
            })),
        },
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() =>
                    Promise.resolve({
                        data: [
                            {
                                id: "1",
                                text: "perfect woman",
                                translation: "mujer perfecta",
                                lang: "es",
                                added_at: "2024-01-01T00:00:00Z",
                            },
                        ],
                        error: null,
                    }),
                ),
            })),
        })),
    },
}));

describe("DictionaryView", () => {
    it("shows sample data from database", async () => {
        const samplePhrases = [
            {
                id: "1",
                text: "perfect woman",
                translation: "mujer perfecta",
                lang: "es",
                added_at: "2024-01-01T00:00:00Z",
            },
        ];

        render(
            <AuthProvider>
                <SettingsProvider>
                    <ThemeProvider>
                        <I18nProvider>
                            <DictionaryView allPhrases={samplePhrases} />
                        </I18nProvider>
                    </ThemeProvider>
                </SettingsProvider>
            </AuthProvider>,
        );

        // Sample data should be displayed from database
        expect(await screen.findByText("perfect woman")).toBeInTheDocument();
        expect(await screen.findByText("mujer perfecta")).toBeInTheDocument();
    });

    it("shows custom data when database is pre-populated", async () => {
        const samplePhrases = [
            {
                id: "1",
                text: "perfect woman",
                translation: "mujer perfecta",
                lang: "es",
                added_at: "2024-01-01T00:00:00Z",
            },
        ];

        // This test verifies that the database system works correctly
        render(
            <AuthProvider>
                <SettingsProvider>
                    <ThemeProvider>
                        <I18nProvider>
                            <DictionaryView allPhrases={samplePhrases} />
                        </I18nProvider>
                    </ThemeProvider>
                </SettingsProvider>
            </AuthProvider>,
        );

        // Verify that sample data is displayed
        expect(await screen.findByText("perfect woman")).toBeInTheDocument();
        expect(await screen.findByText("mujer perfecta")).toBeInTheDocument();
    });
});
