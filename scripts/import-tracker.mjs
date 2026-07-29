#!/usr/bin/env node
/**
 * Import Tracker Excel records (pre-exported JSON) into public.analysis.
 *
 * Prerequisites:
 *   1. Apply migration 20260727150000_analysis_tracker_fields.sql
 *   2. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or
 *      NEXT_PUBLIC_SUPABASE_ANON_KEY if RLS allows staff inserts)
 *
 * Usage:
 *   node scripts/import-tracker.mjs
 *   node scripts/import-tracker.mjs --dry-run
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const dryRun = process.argv.includes("--dry-run");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or anon key).",
  );
  process.exit(1);
}

const payload = JSON.parse(
  readFileSync(resolve(root, "data/tracker-import.json"), "utf8"),
);
const records = payload.records ?? [];
console.log(`Loaded ${records.length} Tracker records (source: ${payload.source})`);

if (dryRun) {
  console.log("Dry run — first 3 records:");
  console.log(JSON.stringify(records.slice(0, 3), null, 2));
  process.exit(0);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let inserted = 0;
let updated = 0;
let skipped = 0;
let failed = 0;

for (const rec of records) {
  const sr = rec.service_report_number;
  const row = {
    project_id: null,
    assignee_id: null,
    pipeline: rec.pipeline,
    pipeline_version: null,
    status: rec.status,
    started_at: rec.started_at,
    completed_at: rec.completed_at,
    output_link: rec.output_link,
    service_report_number: sr,
    service_report_date: rec.service_report_date,
    application: rec.application,
    client_name: rec.client_name,
    client_type: rec.client_type,
    external_client_id: rec.external_client_id,
    external_project_id: rec.external_project_id,
    sample_type: rec.sample_type,
    run_id: rec.run_id,
    status_of_completion: rec.status_of_completion,
    status_of_submission: rec.status_of_submission,
    service_report_link: rec.service_report_link,
    client_sequences_link: rec.client_sequences_link,
    notes: rec.notes,
    updated_at: new Date().toISOString(),
  };

  try {
    if (sr) {
      const { data: existing, error: findErr } = await supabase
        .from("analysis")
        .select("id")
        .eq("service_report_number", sr)
        .maybeSingle();
      if (findErr) throw findErr;

      if (existing?.id) {
        const { error } = await supabase
          .from("analysis")
          .update(row)
          .eq("id", existing.id);
        if (error) throw error;
        updated += 1;
        continue;
      }
    }

    const { error } = await supabase.from("analysis").insert({
      id: randomUUID(),
      ...row,
    });
    if (error) throw error;
    inserted += 1;
  } catch (err) {
    failed += 1;
    console.error(
      `Failed row ${rec.excel_row} (${sr ?? "no SR#"}):`,
      err.message ?? err,
    );
  }
}

console.log(
  JSON.stringify({ inserted, updated, skipped, failed, total: records.length }, null, 2),
);
if (failed > 0) process.exit(1);
