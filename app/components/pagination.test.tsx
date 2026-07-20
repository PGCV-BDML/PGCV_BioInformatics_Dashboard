import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Pagination from "./pagination";

describe("Pagination", () => {
  it("renders correct number of page buttons when totalPages <= 5", () => {
    render(
      <Pagination
        totalItems={50}
        itemsPerPage={10}
        currentPage={1}
        onPageChange={vi.fn()}
      />
    );
    // 50 items / 10 per page = 5 pages; all 5 shown as buttons
    const pageButtons = screen
      .getAllByRole("button")
      .filter((btn) => /^\d+$/.test(btn.textContent ?? ""));
    expect(pageButtons).toHaveLength(5);
  });

  it("renders correct number of page buttons when totalPages > 5", () => {
    render(
      <Pagination
        totalItems={100}
        itemsPerPage={10}
        currentPage={5}
        onPageChange={vi.fn()}
      />
    );
    // 10 pages, current=5, should show [1, "...", 5, "...", 10] => 3 buttons + 2 dots
    const pageButtons = screen
      .getAllByRole("button")
      .filter((btn) => /^\d+$/.test(btn.textContent ?? ""));
    expect(pageButtons).toHaveLength(3);
  });

  it("highlights the current page", () => {
    render(
      <Pagination
        totalItems={50}
        itemsPerPage={10}
        currentPage={3}
        onPageChange={vi.fn()}
      />
    );
    const currentPageButton = screen.getByText("3");
    expect(currentPageButton).toBeInTheDocument();
    // Current page button has a specific background class
    expect(currentPageButton.className).toContain("bg-[#2a7797]");
  });

  it("calls onPageChange when a page button is clicked", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination
        totalItems={50}
        itemsPerPage={10}
        currentPage={1}
        onPageChange={onPageChange}
      />
    );
    const page2Button = screen.getByText("2");
    await user.click(page2Button);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("disables Previous button when on first page", () => {
    render(
      <Pagination
        totalItems={50}
        itemsPerPage={10}
        currentPage={1}
        onPageChange={vi.fn()}
      />
    );
    // Previous button is the first button (ChevronLeft icon)
    const buttons = screen.getAllByRole("button");
    const prevButton = buttons[0];
    expect(prevButton).toBeDisabled();
  });

  it("disables Next button when on last page", () => {
    render(
      <Pagination
        totalItems={50}
        itemsPerPage={10}
        currentPage={5}
        onPageChange={vi.fn()}
      />
    );
    // Next button is the last button (ChevronRight icon)
    const buttons = screen.getAllByRole("button");
    const nextButton = buttons[buttons.length - 1];
    expect(nextButton).toBeDisabled();
  });

  it("enables Previous button when not on first page", () => {
    render(
      <Pagination
        totalItems={50}
        itemsPerPage={10}
        currentPage={3}
        onPageChange={vi.fn()}
      />
    );
    const buttons = screen.getAllByRole("button");
    const prevButton = buttons[0];
    expect(prevButton).not.toBeDisabled();
  });

  it("enables Next button when not on last page", () => {
    render(
      <Pagination
        totalItems={50}
        itemsPerPage={10}
        currentPage={3}
        onPageChange={vi.fn()}
      />
    );
    const buttons = screen.getAllByRole("button");
    const nextButton = buttons[buttons.length - 1];
    expect(nextButton).not.toBeDisabled();
  });

  it("shows correct total/items info", () => {
    render(
      <Pagination
        totalItems={50}
        itemsPerPage={10}
        currentPage={1}
        onPageChange={vi.fn()}
      />
    );
    // Page 1: Showing 1 to 10 of 50 entries
    expect(screen.getByText(/Showing/i)).toBeInTheDocument();
    expect(screen.getByText(/entries/i)).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
  });

  it("returns null when totalItems is 0", () => {
    const { container } = render(
      <Pagination
        totalItems={0}
        itemsPerPage={10}
        currentPage={1}
        onPageChange={vi.fn()}
      />
    );
    expect(container.innerHTML).toBe("");
  });
});
