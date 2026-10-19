import { isSafeModuleId } from "@/lib/module-library";

const PROGRAM_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isProgramId(value: string): boolean {
  return PROGRAM_ID.test(value);
}

export function isDeckId(value: string): boolean {
  return isSafeModuleId(value);
}

/** Viewer path plus the training that shares this poll. */
export function withProgramQuery(
  viewPath: string,
  programId: string,
  deckId: string,
): string {
  const params = new URLSearchParams({ program: programId, deck: deckId });
  return `${viewPath}?${params.toString()}`;
}

type RpcError = { code?: string; message?: string };

export function pollStatusForRpcError(error: RpcError): {
  status: number;
  error: string;
} {
  if (error.code === "42501") {
    return { status: 403, error: "You can't take part in this poll." };
  }
  if (error.code === "P0001" || error.message?.includes("no question")) {
    return { status: 409, error: "Wait for the presenter to open a question." };
  }
  if (error.code === "22023") {
    return { status: 400, error: "That answer doesn't fit this question." };
  }
  return { status: 500, error: "The poll couldn't be updated." };
}
