"use client";

import { useEffect, useCallback } from "react";

type SyncEvent = {
  type: "installs" | "transactions" | "reviews" | "error";
  timestamp: string;
  message: string;
};

export function useSyncEvents(onEvent: (e: SyncEvent) => void) {
  const handler = useCallback(onEvent, []);

  useEffect(() => {
    const es = new EventSource("/api/events");
    es.onmessage = (e) => {
      try {
        handler(JSON.parse(e.data));
      } catch {}
    };
    return () => es.close();
  }, [handler]);
}
