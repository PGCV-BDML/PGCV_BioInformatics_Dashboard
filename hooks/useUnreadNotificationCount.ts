"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase";
import {
  getUnreadNotificationCount,
  subscribeToNotificationChanges,
} from "@/lib/notifications";

/** Live unread notification count for the signed-in user. */
export function useUnreadNotificationCount() {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | undefined;

    async function refresh() {
      const next = await getUnreadNotificationCount();
      if (!cancelled) setCount(next);
    }

    void refresh();

    void getCurrentUser().then((user) => {
      if (!user?.id || cancelled) return;
      unsub = subscribeToNotificationChanges(user.id, () => {
        void refresh();
      });
    });

    function onVisible() {
      if (document.visibilityState === "visible") void refresh();
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      unsub?.();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    void getUnreadNotificationCount().then(setCount);
  }, [pathname]);

  return count;
}
