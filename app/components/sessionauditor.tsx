"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

/**
 * SessionAuditor — mounts the Supabase auth state listener and writes
 * user_login / user_logout events to audit_log via the
 * audit_session_event() RPC. Runs once at the root layout level.
 *
 * Filters out INITIAL_SESSION, TOKEN_REFRESHED, USER_UPDATED —
 * only real SIGNED_IN and SIGNED_OUT events are logged.
 *
 * ponytail: render returns null. Audit writes are fire-and-forget;
 * a failed RPC must not block the user.
 */
export default function SessionAuditor() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "SIGNED_IN") {
          supabase
            .rpc("audit_session_event", {
              event_type: "user_login",
              event_details: { source: "onAuthStateChange" },
            })
            .then(({ error }) => {
              if (error) console.error("audit_session_event (login) failed:", error);
            });
        } else if (event === "SIGNED_OUT") {
          supabase
            .rpc("audit_session_event", {
              event_type: "user_logout",
              event_details: { source: "onAuthStateChange" },
            })
            .then(({ error }) => {
              if (error) console.error("audit_session_event (logout) failed:", error);
            });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
