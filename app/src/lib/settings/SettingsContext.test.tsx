import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsProvider, useSettings } from "./SettingsContext";

const Probe: React.FC = () => {
    const { settings, updateSettings } = useSettings();
    return (
        <div>
            <span data-testid="l1">{settings.l1}</span>
            <button onClick={() => updateSettings({ l1: "fr" })}>set</button>
        </div>
    );
};

describe("SettingsProvider", () => {
    it("persists to localStorage", async () => {
        render(
            <SettingsProvider>
                <Probe />
            </SettingsProvider>,
        );

        // default
        expect(screen.getByTestId("l1").textContent).toBe("en");

        // update
        await userEvent.click(screen.getByText("set"));
        await waitFor(() => expect(screen.getByTestId("l1").textContent).toBe("fr"));

        const raw = localStorage.getItem("readnlearn-settings");
        expect(raw).toBeTruthy();
        const parsed = JSON.parse(raw as string);
        expect(parsed.l1).toBe("fr");
    });
});
