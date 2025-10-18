import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PhraseSelector } from "../../../../src/features/reader/PhraseSelector";
import { I18nProvider } from "../../../../src/lib/i18n/I18nContext";
import { SettingsProvider } from "../../../../src/lib/settings/SettingsContext";

const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <SettingsProvider>
        <I18nProvider>{children}</I18nProvider>
    </SettingsProvider>
);

describe("PhraseSelector", () => {
    it("renders phrase as plain text and emits save payload", () => {
        const onSave = vi.fn();
        const onClear = vi.fn();
        render(
            <Providers>
                <PhraseSelector selectedText="hola" onPhraseSelect={onSave} onClear={onClear} />
            </Providers>,
        );

        // phrase is visible as text
        expect(screen.getByText("hola")).toBeInTheDocument();

        // click Save
        screen.getByText(/Save Phrase/i).click();
        expect(onSave).toHaveBeenCalledTimes(1);
        const payload = onSave.mock.calls[0][0];
        expect(payload.phrase).toBe("hola");
        expect(payload.translation).toBe("");
    });
});
