import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DataTable, { Column } from "./datatable";

interface TestRow {
  id: string;
  name: string;
  age: number;
}

const testData: TestRow[] = [
  { id: "1", name: "Alice", age: 25 },
  { id: "2", name: "Bob", age: 30 },
];

const columns: Column<TestRow>[] = [
  { key: "name", label: "Name", render: (row) => row.name },
  { key: "age", label: "Age", render: (row) => String(row.age) },
];

describe("DataTable", () => {
  it("renders column headers from config", () => {
    render(
      <DataTable
        columns={columns}
        data={testData}
        sortConfig={null}
      />
    );
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Age")).toBeInTheDocument();
  });

  it("renders one row per data item", () => {
    const { container } = render(
      <DataTable
        columns={columns}
        data={testData}
        sortConfig={null}
      />
    );
    // Each data item renders a <tr> in <tbody>
    const rows = container.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(2);
  });

  it("renders empty state when data is empty array", () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        sortConfig={null}
      />
    );
    expect(
      screen.getByText("No active records found matching your criteria.")
    ).toBeInTheDocument();
  });

  it("renders cell values using the render function from column config", () => {
    render(
      <DataTable
        columns={columns}
        data={testData}
        sortConfig={null}
      />
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
  });

  it("calls onSort when a sortable column header is clicked", async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();
    const sortableColumns: Column<TestRow>[] = [
      { key: "name", label: "Name", sortable: true, render: (row) => row.name },
      { key: "age", label: "Age", render: (row) => String(row.age) },
    ];

    render(
      <DataTable
        columns={sortableColumns}
        data={testData}
        sortConfig={null}
        onSort={onSort}
      />
    );
    // Click the sortable "Name" header
    const nameHeader = screen.getByText("Name");
    await user.click(nameHeader);
    expect(onSort).toHaveBeenCalledWith("name");
  });

  it("does NOT call onSort for non-sortable columns", async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();

    render(
      <DataTable
        columns={columns}
        data={testData}
        sortConfig={null}
        onSort={onSort}
      />
    );
    // "Age" column is not sortable
    const ageHeader = screen.getByText("Age");
    await user.click(ageHeader);
    expect(onSort).not.toHaveBeenCalled();
  });
});
