"use client";

import { useEffect, useState } from "react";

export function useTypewriter(text: string, speedMs = 35, startDelayMs = 400) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    let interval: ReturnType<typeof setInterval>;

    const startTimeout = setTimeout(() => {
      interval = setInterval(() => {
        i += 1;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speedMs);
    }, startDelayMs);

    return () => {
      clearTimeout(startTimeout);
      clearInterval(interval);
    };
  }, [text, speedMs, startDelayMs]);

  return { displayed, done };
}
