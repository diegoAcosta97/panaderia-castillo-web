"use client";

import { useEffect, useRef } from "react";

// RF-10.3: caducidad de sesión por inactividad, no límite absoluto de vida de la sesión — un
// uso continuo (aunque esporádico) nunca dispara el timeout.
const IDLE_TIMEOUT_MS = 60 * 60 * 1000;

// mousemove queda afuera a propósito (dispara demasiado seguido); estos eventos ya representan
// interacción real del usuario con el sistema.
const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll"] as const;

// Evita reiniciar el timer en cada evento individual cuando hay ráfagas de actividad (ej. tipear).
const RESET_THROTTLE_MS = 5000;

export function useIdleTimeout(active: boolean, onTimeout: () => void) {
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  useEffect(() => {
    if (!active) return;

    let timer: ReturnType<typeof setTimeout>;
    let lastReset = 0;

    function resetTimer() {
      const now = Date.now();
      if (now - lastReset < RESET_THROTTLE_MS) return;
      lastReset = now;
      clearTimeout(timer);
      timer = setTimeout(() => onTimeoutRef.current(), IDLE_TIMEOUT_MS);
    }

    resetTimer();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, resetTimer));

    return () => {
      clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [active]);
}
