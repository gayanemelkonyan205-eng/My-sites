"use client";

import { Moon, SunMoon } from "lucide-react";

export function ThemeToggle() {
  function toggle() {
    const current = document.documentElement.dataset.theme;
    const next = current === "dark" ? "light" : current === "light" ? "" : "dark";
    if (next) document.documentElement.dataset.theme = next;
    else delete document.documentElement.dataset.theme;
    localStorage.setItem("class-portal-theme", next || "system");
  }

  return <button onClick={toggle} aria-label="Փոխել գունային ռեժիմը" className="grid size-10 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-soft)]"><SunMoon className="size-5 dark:hidden" /><Moon className="size-5" /></button>;
}
