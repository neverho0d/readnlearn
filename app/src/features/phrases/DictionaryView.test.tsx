import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DictionaryView } from "./DictionaryView";

// This test covers the localStorage fallback only (no SQL plugin in test env)

beforeEach(() => {
  localStorage.clear();
});

describe("DictionaryView", () => {
  it("shows empty state and then data from localStorage", async () => {
    render(<DictionaryView />);
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
    render(<DictionaryView />);
    expect(await screen.findByText("hola")).toBeInTheDocument();
  });
});
