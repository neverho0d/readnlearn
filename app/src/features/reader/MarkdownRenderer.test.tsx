import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkdownRenderer } from "./MarkdownRenderer";

describe("MarkdownRenderer", () => {
  it("renders headings and links", () => {
    const md = "# Title\n\nA [link](https://example.com).";
    render(<MarkdownRenderer content={md} />);
    expect(screen.getByRole("heading", { name: "Title" })).toBeInTheDocument();
    const link = screen.getByRole("link", {
      name: "link",
    }) as HTMLAnchorElement;
    expect(link.href).toContain("https://example.com");
  });
});
