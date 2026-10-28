import { beforeEach, describe, expect, it, vi } from "vitest";
import { planMaterialOrder, saveMaterialOrder } from "./material-order";

type Row = { id: string; program_id: string; order: number | null };

// In-memory table that rejects two rows of one program sharing an order,
// like unique (program_id, "order") does.
const table = vi.hoisted(() => ({ rows: [] as Row[] }));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => {
      let patch: { order: number } | null = null;
      const filters: Partial<Row> = {};
      const run = () => {
        const matches = table.rows.filter((row) =>
          Object.entries(filters).every(
            ([key, value]) => row[key as keyof Row] === value,
          ),
        );
        if (!patch) {
          return {
            data: matches.map(({ id, order }) => ({ id, order })),
            error: null,
          };
        }
        for (const row of matches) {
          const clash = table.rows.some(
            (other) =>
              other.id !== row.id &&
              other.program_id === row.program_id &&
              other.order === patch?.order,
          );
          if (clash) {
            return {
              data: null,
              error: { code: "23505", message: "duplicate key value" },
            };
          }
          row.order = patch.order;
        }
        return { data: matches.map(({ id }) => ({ id })), error: null };
      };
      const builder = {
        select: () => builder,
        update: (value: { order: number }) => {
          patch = value;
          return builder;
        },
        eq: (column: keyof Row, value: string) => {
          Object.assign(filters, { [column]: value });
          return builder;
        },
        then: (
          resolve: (value: ReturnType<typeof run>) => unknown,
          reject: (reason: unknown) => unknown,
        ) => Promise.resolve().then(run).then(resolve, reject),
      };
      return builder;
    },
  },
}));

function ordersFor(programId: string) {
  return table.rows
    .filter((row) => row.program_id === programId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(({ id, order }) => [id, order]);
}

describe("planMaterialOrder", () => {
  it("moves only the swapped rows, parking them below every position", () => {
    const plan = planMaterialOrder(
      [
        { id: "a", order: 1 },
        { id: "b", order: 2 },
        { id: "c", order: 3 },
      ],
      ["a", "c", "b"],
    );

    expect(plan.park).toEqual([
      { id: "c", order: -1 },
      { id: "b", order: -2 },
    ]);
    expect(plan.place).toEqual([
      { id: "c", order: 2 },
      { id: "b", order: 3 },
    ]);
  });

  it("parks below rows left negative by an interrupted save", () => {
    const plan = planMaterialOrder(
      [
        { id: "a", order: -2 },
        { id: "b", order: -1 },
        { id: "c", order: 3 },
      ],
      ["b", "a", "c"],
    );

    expect(plan.park.map((write) => write.order)).toEqual([-3, -4]);
    expect(plan.place).toEqual([
      { id: "b", order: 1 },
      { id: "a", order: 2 },
    ]);
  });

  it("keeps stored rows the caller did not list after the listed ones", () => {
    const plan = planMaterialOrder(
      [
        { id: "a", order: 1 },
        { id: "b", order: 2 },
        { id: "new", order: 3 },
      ],
      ["b", "a", "gone"],
    );

    expect(plan.place).toEqual([
      { id: "b", order: 1 },
      { id: "a", order: 2 },
    ]);
  });

  it("writes nothing when the order is unchanged", () => {
    expect(
      planMaterialOrder(
        [
          { id: "a", order: 1 },
          { id: "b", order: 2 },
        ],
        ["a", "b"],
      ),
    ).toEqual({ park: [], place: [] });
  });
});

describe("saveMaterialOrder", () => {
  beforeEach(() => {
    table.rows = [];
  });

  it("swaps two presentations without a duplicate order", async () => {
    table.rows = [
      { id: "a", program_id: "p1", order: 1 },
      { id: "b", program_id: "p1", order: 2 },
      { id: "other", program_id: "p2", order: 1 },
    ];

    await saveMaterialOrder("presentation", "p1", ["b", "a"]);

    expect(ordersFor("p1")).toEqual([
      ["b", 1],
      ["a", 2],
    ]);
    expect(ordersFor("p2")).toEqual([["other", 1]]);
  });

  it("repairs rows stuck at negative orders by an earlier failed save", async () => {
    table.rows = [
      { id: "a", program_id: "p1", order: -1 },
      { id: "b", program_id: "p1", order: -2 },
      { id: "c", program_id: "p1", order: 2 },
    ];

    await saveMaterialOrder("module", "p1", ["a", "b", "c"]);

    expect(ordersFor("p1")).toEqual([
      ["a", 1],
      ["b", 2],
      ["c", 3],
    ]);
  });

  it("numbers modules that never had an order", async () => {
    table.rows = [
      { id: "a", program_id: "p1", order: null },
      { id: "b", program_id: "p1", order: null },
    ];

    await saveMaterialOrder("module", "p1", ["b", "a"]);

    expect(ordersFor("p1")).toEqual([
      ["b", 1],
      ["a", 2],
    ]);
  });
});
