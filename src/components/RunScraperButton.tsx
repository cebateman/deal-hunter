"use client";

import { useState } from "react";

export function RunScraperButton() {
  const [status, setStatus] = useState<"idle" | "triggering" | "triggered" | "error">("idle");

  async function handleClick() {
    setStatus("triggering");
    try {
      const res = await fetch("/api/scrape/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ send_digest: false }),
      });
      const data = await res.json();
      if (data.triggered) {
        setStatus("triggered");
        setTimeout(() => setStatus("idle"), 5000);
      } else {
        console.error("Trigger failed:", data.error);
        setStatus("error");
        setTimeout(() => setStatus("idle"), 4000);
      }
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
    }
  }

  const label = {
    idle: "Run Scraper",
    triggering: "Starting...",
    triggered: "Scraper Running",
    error: "Failed",
  }[status];

  return (
    <button
      onClick={handleClick}
      disabled={status !== "idle"}
      className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
        status === "triggered"
          ? "bg-emerald-900/50 text-emerald-400 border border-emerald-700"
          : status === "error"
            ? "bg-red-900/50 text-red-400 border border-red-700"
            : "bg-brand-gold text-brand-dark hover:bg-amber-400 disabled:opacity-50"
      }`}
    >
      {label}
    </button>
  );
}
