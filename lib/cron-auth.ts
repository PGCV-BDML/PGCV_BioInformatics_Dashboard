import { readDispatchBearer, secretsEqual } from "@/lib/push-server";

function cronSecrets(): string[] {
  return [process.env.CRON_SECRET, process.env.PUSH_DISPATCH_SECRET]
    .map((value) => value?.trim() ?? "")
    .filter((value) => value.length >= 16);
}

/** Vercel Cron sends CRON_SECRET; local/manual runs may use PUSH_DISPATCH_SECRET. */
export function isAuthorizedCronRequest(request: Request): boolean {
  const provided = readDispatchBearer(request);
  if (!provided) return false;
  return cronSecrets().some((secret) => secretsEqual(provided, secret));
}
