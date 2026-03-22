import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { EntityList } from "./EntityList";

type Props = Parameters<typeof EntityList>[0];

const defaultProps: Props = {
  buttonLabel: "Neu",
  placeholder: "Name eingeben",
  emptyMessage: "Keine Einträge",
  items: [],
  isLoading: false,
  onCreateSubmit: vi.fn(),
  onDelete: vi.fn(),
  onNavigate: vi.fn(),
};

function renderList(overrides: Partial<Props> = {}) {
  return render(<EntityList {...defaultProps} {...overrides} />);
}

describe("EntityList", () => {
  it("opens create form and focuses input on button click", async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole("button", { name: "Neu" }));

    expect(screen.getByPlaceholderText("Name eingeben")).toHaveFocus();
  });

  it("Escape closes form and clears input", async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole("button", { name: "Neu" }));
    const input = screen.getByPlaceholderText("Name eingeben");
    await user.type(input, "test");
    await user.keyboard("{Escape}");

    expect(
      screen.queryByPlaceholderText("Name eingeben"),
    ).not.toBeInTheDocument();
  });

  it("Enter submits the form", async () => {
    const user = userEvent.setup();
    const onCreateSubmit = vi.fn().mockResolvedValue(undefined);
    renderList({ onCreateSubmit });

    await user.click(screen.getByRole("button", { name: "Neu" }));
    await user.type(screen.getByPlaceholderText("Name eingeben"), "New Item");
    await user.keyboard("{Enter}");

    expect(onCreateSubmit).toHaveBeenCalledWith("New Item");
  });

  it("shows empty state when no items", () => {
    renderList();
    expect(screen.getByText("Keine Einträge")).toBeInTheDocument();
  });

  it("calls onNavigate when card is clicked", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    renderList({
      items: [{ id: "1", label: "Item One" }],
      onNavigate,
    });

    await user.click(screen.getByRole("button", { name: /Item One/ }));

    expect(onNavigate).toHaveBeenCalledWith("1");
  });

  it("calls onDelete when delete button is clicked", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderList({
      items: [{ id: "1", label: "Item One" }],
      onDelete,
    });

    await user.click(screen.getByRole("button", { name: "Löschen" }));

    expect(onDelete).toHaveBeenCalledWith({ id: "1", label: "Item One" });
  });

  it("shows create error message when form is open", async () => {
    const user = userEvent.setup();
    const onCreateSubmit = vi
      .fn()
      .mockRejectedValue(new Error("Name already exists"));
    const { rerender } = render(
      <EntityList {...defaultProps} onCreateSubmit={onCreateSubmit} />,
    );

    await user.click(screen.getByRole("button", { name: "Neu" }));
    await user.type(screen.getByPlaceholderText("Name eingeben"), "Dup");
    await user.keyboard("{Enter}");

    // After the submit rejects, re-render with the createError prop set
    rerender(
      <EntityList
        {...defaultProps}
        onCreateSubmit={onCreateSubmit}
        createError={new Error("Name already exists")}
      />,
    );

    expect(screen.getByText("Name already exists")).toBeInTheDocument();
  });
});
