"use client";

import { useEffect, useRef } from "react";

import { WS_URL } from "@/lib/api/client";
import type { WsEvent } from "@/lib/api/types";
import { useLiveStore } from "@/lib/store/liveStore";

/**
 * Single global WebSocket connection with auto-reconnect + backoff.
 * Feeds the zustand live store. Mount once (in the AppShell).
 */
export function useEventStream() {
  const setStatus = useLiveStore((s) => s.setStatus);
  const push = useLiveStore((s) => s.push);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const stoppedRef = useRef(false);

  useEffect(() => {
    stoppedRef.current = false;

    const connect = () => {
      if (stoppedRef.current) return;
      setStatus(retryRef.current === 0 ? "connecting" : "connecting");
      let ws: WebSocket;
      try {
        ws = new WebSocket(WS_URL);
      } catch {
        scheduleReconnect();
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        retryRef.current = 0;
        setStatus("connected");
      };
      ws.onmessage = (ev) => {
        try {
          const parsed = JSON.parse(ev.data) as WsEvent;
          push(parsed);
        } catch {
          /* ignore malformed frame */
        }
      };
      ws.onclose = () => {
        setStatus("disconnected");
        scheduleReconnect();
      };
      ws.onerror = () => {
        ws.close();
      };
    };

    const scheduleReconnect = () => {
      if (stoppedRef.current) return;
      const delay = Math.min(1000 * 2 ** retryRef.current, 15000);
      retryRef.current += 1;
      setTimeout(connect, delay);
    };

    connect();
    return () => {
      stoppedRef.current = true;
      wsRef.current?.close();
    };
  }, [setStatus, push]);
}
