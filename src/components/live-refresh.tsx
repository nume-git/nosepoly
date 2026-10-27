"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const INTERVAL_MS = 4000;

/**
 * Tiempo real provisorio: vuelve a pedir la página al servidor cada pocos
 * segundos. Con Supabase lo reemplaza la suscripción a canales de Realtime.
 */
export function LiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      const busy =
        document.visibilityState !== "visible" ||
        document.querySelector('[role="dialog"][data-state="open"]') !== null ||
        document.activeElement?.matches("input, select, textarea") === true;
      if (!busy) router.refresh();
    };
    const id = window.setInterval(tick, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [router]);

  return null;
}
