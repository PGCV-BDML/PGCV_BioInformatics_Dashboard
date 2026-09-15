import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FaqAskModal from "./faq-ask-modal";
import { emptyFaqForm } from "@/lib/faqs";

describe("FaqAskModal", () => {
  it("requires a title, body, and at least one tag", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <FaqAskModal
        isOpen
        isAdding
        isSaving={false}
        initialData={emptyFaqForm()}
        onClose={() => undefined}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Post question" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("A question title is required")).toBeInTheDocument();
    expect(screen.getByText("Write a question body")).toBeInTheDocument();
    expect(screen.getByText("Choose at least one tag")).toBeInTheDocument();
  });
});
