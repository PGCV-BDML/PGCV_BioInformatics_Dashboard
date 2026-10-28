import { supabase } from "@/lib/supabase";

/** Tables whose rows hold a unique (program_id, "order") position. */
export type OrderedMaterialTable = "module" | "presentation";

export type MaterialPosition = { id: string; order: number | null };

export type OrderWrite = { id: string; order: number };

/**
 * Writes that put a program's rows in the requested order without two rows
 * ever sharing a position, which unique (program_id, "order") rejects. Rows
 * that move are first parked below every stored position, then given their
 * final 1..n place. Rows already in place are not written.
 *
 * The plan starts from the stored rows, not the list on screen, so a row
 * left at a parked position by an interrupted save is put back in order.
 * Stored rows the caller did not list keep their order after the listed ones.
 */
export function planMaterialOrder(
  stored: MaterialPosition[],
  orderedIds: string[],
): { park: OrderWrite[]; place: OrderWrite[] } {
  const byId = new Map(stored.map((row) => [row.id, row]));
  const sequence: MaterialPosition[] = [];
  const listed = new Set<string>();
  for (const id of orderedIds) {
    const row = byId.get(id);
    if (!row || listed.has(id)) continue;
    listed.add(id);
    sequence.push(row);
  }
  const unlisted = stored
    .filter((row) => !listed.has(row.id))
    .sort(
      (a, b) =>
        (a.order ?? Number.MAX_SAFE_INTEGER) -
        (b.order ?? Number.MAX_SAFE_INTEGER),
    );
  sequence.push(...unlisted);

  const moving = sequence
    .map((row, index) => ({ id: row.id, from: row.order, order: index + 1 }))
    .filter((row) => row.from !== row.order);

  const floor = Math.min(0, ...stored.map((row) => row.order ?? 0));
  return {
    park: moving.map((row, index) => ({
      id: row.id,
      order: floor - (index + 1),
    })),
    place: moving.map(({ id, order }) => ({ id, order })),
  };
}

async function writeOrders(
  table: OrderedMaterialTable,
  programId: string,
  writes: OrderWrite[],
) {
  // Wait for every write before failing, so a retry reads settled rows.
  const results = await Promise.allSettled(
    writes.map(async ({ id, order }) => {
      const { data, error } = await supabase
        .from(table)
        .update({ order })
        .eq("id", id)
        .eq("program_id", programId)
        .select("id");
      if (error) throw error;
      if (!data?.length) {
        throw new Error(`The ${table} ${id} could not be moved.`);
      }
    }),
  );
  const failed = results.find((result) => result.status === "rejected");
  if (failed) throw failed.reason;
}

/** Save the order of a program's modules or presentations. */
export async function saveMaterialOrder(
  table: OrderedMaterialTable,
  programId: string,
  orderedIds: string[],
): Promise<void> {
  const { data, error } = await supabase
    .from(table)
    .select("id, order")
    .eq("program_id", programId);
  if (error) {
    console.error(`Error retrieving ${table} order:`, error);
    throw error;
  }

  const { park, place } = planMaterialOrder(
    (data ?? []) as MaterialPosition[],
    orderedIds,
  );
  await writeOrders(table, programId, park);
  await writeOrders(table, programId, place);
}
