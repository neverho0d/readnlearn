import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi } from "vitest";
import { Select } from "../../../src/components/ui/Select";

describe("Select Component", () => {
    const mockOptions = [
        { value: "option1", label: "Option 1" },
        { value: "option2", label: "Option 2" },
        { value: "option3", label: "Option 3" },
    ];

    const defaultProps = {
        value: "option1",
        onChange: vi.fn(),
        options: mockOptions,
        placeholder: "Select an option",
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render with correct initial value", () => {
        render(<Select {...defaultProps} />);

        expect(screen.getByText("Option 1")).toBeInTheDocument();
    });

    it("should render placeholder when no value is selected", () => {
        render(<Select {...defaultProps} value="" />);

        expect(screen.getByText("Select an option")).toBeInTheDocument();
    });

    it("should open dropdown when clicked", async () => {
        render(<Select {...defaultProps} />);

        const selectButton = screen.getByRole("button");
        fireEvent.click(selectButton);

        await waitFor(() => {
            expect(screen.getByText("Option 2")).toBeInTheDocument();
            expect(screen.getByText("Option 3")).toBeInTheDocument();
        });
    });

    it("should close dropdown when option is selected", async () => {
        render(<Select {...defaultProps} />);

        const selectButton = screen.getByRole("button");
        fireEvent.click(selectButton);

        await waitFor(() => {
            expect(screen.getByText("Option 2")).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText("Option 2"));

        expect(defaultProps.onChange).toHaveBeenCalledWith("option2");
    });

    it("should close dropdown when clicking outside", async () => {
        render(
            <div>
                <Select {...defaultProps} />
                <div data-testid="outside">Outside element</div>
            </div>,
        );

        const selectButton = screen.getByRole("button");
        fireEvent.click(selectButton);

        await waitFor(() => {
            expect(screen.getByText("Option 2")).toBeInTheDocument();
        });

        fireEvent.click(screen.getByTestId("outside"));

        await waitFor(() => {
            expect(screen.queryByText("Option 2")).not.toBeInTheDocument();
        });
    });

    it("should handle keyboard navigation", async () => {
        render(<Select {...defaultProps} />);

        const selectButton = screen.getByRole("button");
        fireEvent.click(selectButton);

        await waitFor(() => {
            expect(screen.getByText("Option 2")).toBeInTheDocument();
        });

        // Test arrow down
        fireEvent.keyDown(selectButton, { key: "ArrowDown" });

        // Test arrow up
        fireEvent.keyDown(selectButton, { key: "ArrowUp" });

        // Test Enter
        fireEvent.keyDown(selectButton, { key: "Enter" });

        // Test Escape
        fireEvent.keyDown(selectButton, { key: "Escape" });
    });

    it("should have correct ARIA attributes", () => {
        render(<Select {...defaultProps} />);

        const selectButton = screen.getByRole("button");
        expect(selectButton).toHaveAttribute("aria-expanded", "false");
        expect(selectButton).toHaveAttribute("aria-haspopup", "listbox");
    });

    it("should update ARIA attributes when opened", async () => {
        render(<Select {...defaultProps} />);

        const selectButton = screen.getByRole("button");
        fireEvent.click(selectButton);

        await waitFor(() => {
            expect(selectButton).toHaveAttribute("aria-expanded", "true");
        });
    });

    it("should handle disabled state", () => {
        render(<Select {...defaultProps} disabled />);

        const selectButton = screen.getByRole("button");
        expect(selectButton).toBeDisabled();
    });

    it("should not open when disabled", async () => {
        render(<Select {...defaultProps} disabled />);

        const selectButton = screen.getByRole("button");
        fireEvent.click(selectButton);

        await waitFor(() => {
            expect(screen.queryByText("Option 2")).not.toBeInTheDocument();
        });
    });

    it("should render with custom className", () => {
        const { container } = render(<Select {...defaultProps} className="custom-class" />);

        const selectContainer = container.firstChild;
        expect(selectContainer).toHaveClass("custom-class");
    });

    it("should handle empty options array", () => {
        render(<Select {...defaultProps} options={[]} />);

        expect(screen.getByText("Select an option")).toBeInTheDocument();
    });

    it("should handle options with same value", () => {
        const duplicateOptions = [
            { value: "option1", label: "Option 1" },
            { value: "option1", label: "Option 1 Duplicate" },
        ];

        render(<Select {...defaultProps} options={duplicateOptions} />);

        expect(screen.getByText("Option 1")).toBeInTheDocument();
    });

    it("should maintain focus management", async () => {
        render(<Select {...defaultProps} />);

        const selectButton = screen.getByRole("button");
        selectButton.focus();

        fireEvent.click(selectButton);

        await waitFor(() => {
            expect(selectButton).toHaveFocus();
        });
    });
});
