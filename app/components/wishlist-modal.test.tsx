import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WishlistModal from "./wishlist-modal";
import { emptyWishlistForm } from "@/lib/wishlist";

describe("WishlistModal", () => {
  it("requires an item name when staff add a request", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <WishlistModal
        isOpen
        isAdding
        isSaving={false}
        initialData={emptyWishlistForm()}
        canEditDetails
        canChangeStatus
        canEditNotes
        onClose={() => undefined}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Item name is required")).toBeInTheDocument();
  });

  it("locks item fields for the approving officer and still saves notes", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <WishlistModal
        isOpen
        isAdding={false}
        isSaving={false}
        initialData={{
          ...emptyWishlistForm(),
          title: "HDMI cable",
          notes: "",
        }}
        canEditDetails={false}
        canChangeStatus={false}
        canEditNotes
        onClose={() => undefined}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByLabelText("Item name")).toBeDisabled();
    expect(screen.getByLabelText("Status")).toBeDisabled();
    const notes = screen.getByLabelText("Notes");
    expect(notes).toBeEnabled();
    await user.type(notes, "Check DP adapters too");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      title: "HDMI cable",
      notes: "Check DP adapters too",
    });
  });
});
