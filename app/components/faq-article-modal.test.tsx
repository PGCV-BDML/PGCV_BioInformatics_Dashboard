import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FaqArticleModal from "./faq-article-modal";
import { emptyFaqArticleForm } from "@/lib/faq-articles";

describe("FaqArticleModal", () => {
  it("requires a title, answer, and at least one tag", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <FaqArticleModal
        isOpen
        isAdding
        isSaving={false}
        initialData={emptyFaqArticleForm()}
        onClose={() => undefined}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save FAQ" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("A question title is required")).toBeInTheDocument();
    expect(screen.getByText("Write an answer")).toBeInTheDocument();
    expect(screen.getByText("Choose at least one tag")).toBeInTheDocument();
  });
});
