"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "light") {
      setDark(false);
      document.documentElement.classList.replace("dark", "light");
    }
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.replace(
      next ? "light" : "dark",
      next ? "dark" : "light"
    );
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      className="ml-auto rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? "Light" : "Dark"}
    </button>
  );
}
