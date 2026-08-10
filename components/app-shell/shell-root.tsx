"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

interface ShellContextValue {
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
}

const ShellContext = createContext<ShellContextValue | null>(null);

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used within ShellRoot");
  return ctx;
}

const THEME_KEY = "f8-dashboard-theme";

export function ShellRoot({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === "dark" || stored === "light") setTheme(stored);
    } catch {
      // localStorage unavailable — stay on default light theme
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        // ignore write failures (private browsing etc.)
      }
      return next;
    });
  }, []);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <ShellContext.Provider value={{ drawerOpen, openDrawer, closeDrawer, theme, toggleTheme }}>
      <div className={`adminator-shell${drawerOpen ? " has-drawer-open" : ""}`} data-theme={theme}>
        <div className="shell">{children}</div>
        <div className="drawer-backdrop" aria-hidden="true" onClick={closeDrawer} />
      </div>
    </ShellContext.Provider>
  );
}
