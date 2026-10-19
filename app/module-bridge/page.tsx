"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { isSafeModuleId } from "@/lib/module-library";
import { sanitizeProgressItems } from "@/lib/module-progress";

type ModuleMessage = {
  source?: unknown;
  type?: unknown;
  moduleId?: unknown;
  items?: unknown;
};

/**
 * Hidden page that library modules embed (same origin, see the
 * /module-bridge headers in next.config.ts) to load and save checklist
 * progress with the signed-in learner's own session. The protocol is
 * described in lib/module-progress.ts.
 */
export default function ModuleBridgePage() {
  useEffect(() => {
    const origin = window.location.origin;
    const reply = (message: Record<string, unknown>) =>
      window.parent.postMessage({ source: "pgcv-bridge", ...message }, origin);

    async function handle(event: MessageEvent) {
      if (event.origin !== origin || event.source !== window.parent) return;
      const data = event.data as ModuleMessage | null;
      if (!data || data.source !== "pgcv-module") return;
      const moduleId = typeof data.moduleId === "string" ? data.moduleId : "";
      if (!isSafeModuleId(moduleId)) return;

      const { data: auth } = await supabase.auth.getSession();
      const userId = auth.session?.user.id;

      if (data.type === "load") {
        if (!userId) {
          reply({ type: "state", moduleId, signedIn: false });
          return;
        }
        const { data: rows, error } = await supabase
          .from("module_progress")
          .select("item_id, done, evidence, platform, completed_at, updated_at")
          .eq("user_id", userId)
          .eq("module_id", moduleId);
        if (error) console.error("module-bridge load failed:", error);
        reply({ type: "state", moduleId, signedIn: true, items: rows ?? [] });
        return;
      }

      if (data.type === "save") {
        if (!userId) {
          reply({ type: "saved", moduleId, ok: false, error: "signed-out" });
          return;
        }
        const items = sanitizeProgressItems(data.items);
        if (items.length) {
          const { error } = await supabase.from("module_progress").upsert(
            items.map((item) => ({ ...item, user_id: userId, module_id: moduleId })),
            { onConflict: "user_id,module_id,item_id" },
          );
          if (error) {
            console.error("module-bridge save failed:", error);
            reply({ type: "saved", moduleId, ok: false, error: error.message });
            return;
          }
        }
        reply({ type: "saved", moduleId, ok: true, at: new Date().toISOString() });
      }
    }

    const listener = (event: MessageEvent) => {
      void handle(event);
    };
    window.addEventListener("message", listener);
    reply({ type: "ready" });
    return () => window.removeEventListener("message", listener);
  }, []);

  return null;
}
