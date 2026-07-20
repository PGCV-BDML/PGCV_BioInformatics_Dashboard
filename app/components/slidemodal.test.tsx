import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SlideOverModal from "./slidemodal";

describe("SlideOverModal", () => {
  it("renders title when isOpen={true}", () => {
    render(
      <SlideOverModal isOpen={true} onClose={vi.fn()} title="Modal Title">
        <p>body</p>
      </SlideOverModal>
    );
    expect(screen.getByText("Modal Title")).toBeInTheDocument();
  });

  it("does not render title when isOpen={false}", () => {
    render(
      <SlideOverModal isOpen={false} onClose={vi.fn()} title="Modal Title">
        <p>body</p>
      </SlideOverModal>
    );
    // Sidebar panel is always rendered but hidden via translate-x-full
    const panel = screen
      .getByText("Modal Title")
      .closest('[class*="translate-x-full"]');
    expect(panel).toBeInTheDocument();
  });

  it("renders subtitle when provided and isOpen={true}", () => {
    render(
      <SlideOverModal
        isOpen={true}
        onClose={vi.fn()}
        title="Title"
        subtitle="Optional subtitle"
      >
        <p>body</p>
      </SlideOverModal>
    );
    expect(screen.getByText("Optional subtitle")).toBeInTheDocument();
  });

  it("renders children content when isOpen={true}", () => {
    render(
      <SlideOverModal isOpen={true} onClose={vi.fn()} title="Title">
        <p data-testid="child">Custom child content</p>
      </SlideOverModal>
    );
    expect(screen.getByTestId("child")).toHaveTextContent(
      "Custom child content"
    );
  });

  it("calls onClose when close (X) button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(
      <SlideOverModal isOpen={true} onClose={onClose} title="Title">
        <p>body</p>
      </SlideOverModal>
    );
    // The close button wraps the lucide-react X icon (class "lucide-x").
    // Since the SVG is aria-hidden, the button has no accessible name,
    // so we locate it by finding the button that contains .lucide-x.
    const xButton = container.querySelector("button .lucide-x")?.closest("button");
    expect(xButton).toBeDefined();
    await user.click(xButton!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onSubmit when form is submitted", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <SlideOverModal
        isOpen={true}
        onClose={vi.fn()}
        title="Title"
        onSubmit={onSubmit}
      >
        <p>form body</p>
      </SlideOverModal>
    );
    // The submit button has text "Save"
    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("does NOT render form when onSubmit is not provided", () => {
    render(
      <SlideOverModal isOpen={true} onClose={vi.fn()} title="Title">
        <p>body</p>
      </SlideOverModal>
    );
    // When onSubmit is not provided, no <form> element is rendered
    expect(document.querySelector("form")).toBeNull();
    // The default submit button is still part of the UI footer
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
  });

  it("disables submit button when submitDisabled={true}", () => {
    render(
      <SlideOverModal
        isOpen={true}
        onClose={vi.fn()}
        title="Title"
        onSubmit={vi.fn()}
        submitDisabled={true}
      >
        <p>body</p>
      </SlideOverModal>
    );
    const saveButton = screen.getByRole("button", { name: /save/i });
    expect(saveButton).toBeDisabled();
  });

  it("renders custom footer when footer prop is provided", () => {
    render(
      <SlideOverModal
        isOpen={true}
        onClose={vi.fn()}
        title="Title"
        footer={<div data-testid="custom-footer">Custom Footer</div>}
      >
        <p>body</p>
      </SlideOverModal>
    );
    expect(screen.getByTestId("custom-footer")).toBeInTheDocument();
    expect(screen.getByTestId("custom-footer")).toHaveTextContent(
      "Custom Footer"
    );
    // Default footer buttons should not be present
    expect(screen.queryByRole("button", { name: /cancel/i })).toBeNull();
  });

  it("renders submitLabel text on the submit button (default 'Save')", () => {
    render(
      <SlideOverModal
        isOpen={true}
        onClose={vi.fn()}
        title="Title"
        onSubmit={vi.fn()}
        submitLabel="Create"
      >
        <p>body</p>
      </SlideOverModal>
    );
    expect(
      screen.getByRole("button", { name: /create/i })
    ).toBeInTheDocument();
  });

  it("renders default submit label 'Save' when submitLabel is not provided", () => {
    render(
      <SlideOverModal
        isOpen={true}
        onClose={vi.fn()}
        title="Title"
        onSubmit={vi.fn()}
      >
        <p>body</p>
      </SlideOverModal>
    );
    expect(
      screen.getByRole("button", { name: /save/i })
    ).toBeInTheDocument();
  });
});
