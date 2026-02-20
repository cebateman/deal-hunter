"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type Deal = {
  score: number;
  title: string;
  industry: string;
  location: string;
  asking_price: number | null;
  ebitda: number | null;
  multiple: number | null;
  traits: string[];
  url: string;
  date_found: string;
};

type StepInfo = { name: string; status: string; conclusion: string | null };

type ScraperStatus = {
  status: string;
  conclusion?: string | null;
  progress?: number;
  run_number?: number;
  created_at?: string;
  updated_at?: string;
  html_url?: string;
  steps?: StepInfo[];
  message?: string;
  error?: string;
};

// Sample data from the scraper's demo deals — replaced by real DB data once the scraper runs.
const SAMPLE_DEALS: Deal[] = [
  {
    score: 82,
    title: "ABC Commercial Laundry Services",
    industry: "Commercial Laundry",
    location: "Memphis, TN",
    asking_price: 2_200_000,
    ebitda: 620_000,
    multiple: 3.55,
    traits: ["recurring_revenue", "labor_accessible", "essential_service"],
    url: "#",
    date_found: "2026-02-17",
  },
  {
    score: 91,
    title: "Southeastern Fire Sprinkler Co.",
    industry: "Fire Protection",
    location: "Atlanta, GA",
    asking_price: 3_100_000,
    ebitda: 880_000,
    multiple: 3.52,
    traits: ["regulatory_moat", "recurring_revenue", "non_cyclical"],
    url: "#",
    date_found: "2026-02-17",
  },
  {
    score: 76,
    title: "Pacific Fresh-Cut Produce",
    industry: "Produce Packing",
    location: "Salinas, CA",
    asking_price: 4_500_000,
    ebitda: 1_200_000,
    multiple: 3.75,
    traits: ["regulatory_moat", "labor_accessible"],
    url: "#",
    date_found: "2026-02-17",
  },
  {
    score: 85,
    title: "Heritage Hide & Leather",
    industry: "Hide/Leather Tanning",
    location: "Gloversville, NY",
    asking_price: 1_800_000,
    ebitda: 520_000,
    multiple: 3.46,
    traits: ["regulatory_moat", "unglamorous", "labor_accessible"],
    url: "#",
    date_found: "2026-02-17",
  },
];

function formatMoney(n: number | null): string {
  if (n === null) return "N/A";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${(n / 1_000).toFixed(0)}K`;
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-blue-400";
  if (score >= 40) return "text-amber-400";
  return "text-gray-400";
}

function multipleColor(m: number | null): string {
  if (m === null) return "text-muted";
  if (m <= 3.0) return "text-emerald-400";
  if (m <= 4.0) return "text-amber-400";
  return "text-red-400";
}

const TRAIT_LABELS: Record<string, string> = {
  recurring_revenue: "Recurring Rev",
  regulatory_moat: "Reg. Moat",
  labor_accessible: "Trainable Labor",
  high_switching_costs: "Switch Cost",
  non_cyclical: "Non-Cyclical",
  unglamorous: "Unglamorous",
  essential_service: "Essential Svc",
};

function formatElapsed(start: string): string {
  const ms = Date.now() - new Date(start).getTime();
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remSecs = secs % 60;
  return `${mins}m ${remSecs}s`;
}

function stepIcon(step: StepInfo): string {
  if (step.status === "completed") {
    return step.conclusion === "success" ? "\u2713" : "\u2717";
  }
  if (step.status === "in_progress") return "\u25B6";
  return "\u25CB";
}

function stepColor(step: StepInfo): string {
  if (step.status === "completed") {
    return step.conclusion === "success"
      ? "text-emerald-400"
      : "text-red-400";
  }
  if (step.status === "in_progress") return "text-amber";
  return "text-muted";
}

/* ---------- Scraper Progress Panel ---------- */

function ScraperPanel({
  status,
  onDismiss,
}: {
  status: ScraperStatus;
  onDismiss: () => void;
}) {
  const isActive = status.status === "queued" || status.status === "in_progress";
  const isDone = status.status === "completed";
  const isSuccess = isDone && status.conclusion === "success";
  const isFailed = isDone && status.conclusion !== "success";

  const borderColor = isActive
    ? "border-amber/40"
    : isSuccess
      ? "border-emerald-500/40"
      : isFailed
        ? "border-red-500/40"
        : "border-border";

  const bgColor = isActive
    ? "bg-amber/5"
    : isSuccess
      ? "bg-emerald-500/5"
      : isFailed
        ? "bg-red-500/5"
        : "bg-surface";

  const progress = status.progress ?? 0;

  const barColor = isActive
    ? "bg-amber"
    : isSuccess
      ? "bg-emerald-500"
      : "bg-red-500";

  const statusLabel = status.status === "queued"
    ? "Queued"
    : status.status === "in_progress"
      ? "Running"
      : isSuccess
        ? "Completed"
        : status.conclusion === "cancelled"
          ? "Cancelled"
          : "Failed";

  return (
    <div className={`mb-6 rounded-lg border ${borderColor} ${bgColor} p-4`}>
      {/* Top row: title + dismiss */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-foreground">
            Scraper Run #{status.run_number ?? "?"}
          </h3>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              isActive
                ? "bg-amber/20 text-amber"
                : isSuccess
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-red-500/20 text-red-400"
            }`}
          >
            {statusLabel}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {status.html_url && (
            <a
              href={status.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted hover:text-foreground transition-colors underline"
            >
              View on GitHub
            </a>
          )}
          {isDone && (
            <button
              onClick={onDismiss}
              className="text-muted hover:text-foreground transition-colors text-lg leading-none"
              title="Dismiss"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full bg-surface overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor} ${
            isActive ? "animate-pulse" : ""
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Progress label + elapsed */}
      <div className="flex items-center justify-between text-xs text-muted mb-3">
        <span>{progress}% complete</span>
        {status.created_at && (
          <span>
            {isActive
              ? `Elapsed: ${formatElapsed(status.created_at)}`
              : status.updated_at
                ? `Finished in ${formatElapsed(status.created_at)}`
                : ""}
          </span>
        )}
      </div>

      {/* Steps breakdown */}
      {status.steps && status.steps.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
          {status.steps.map((step, i) => (
            <div key={i} className={`flex items-center gap-2 text-xs ${stepColor(step)}`}>
              <span className="w-3 text-center font-mono">{stepIcon(step)}</span>
              <span className={step.status === "in_progress" ? "font-medium" : ""}>
                {step.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Main Page ---------- */

export default function PipelinePage() {
  const [scraping, setScraping] = useState(false);
  const [scraperMsg, setScraperMsg] = useState<string | null>(null);
  const [scraperStatus, setScraperStatus] = useState<ScraperStatus | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [deals, setDeals] = useState<Deal[]>(SAMPLE_DEALS);
  const [usingLive, setUsingLive] = useState(false);
  const [dealsLoading, setDealsLoading] = useState(true);

  const fetchDeals = useCallback(async () => {
    try {
      const res = await fetch("/api/deals");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.deals) && data.deals.length > 0) {
        setDeals(data.deals);
        setUsingLive(true);
      } else {
        setDeals(SAMPLE_DEALS);
        setUsingLive(false);
      }
    } catch {
      // API not available — keep sample data
    } finally {
      setDealsLoading(false);
    }
  }, []);

  // Fetch real deals on mount
  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/scraper/status");
      if (!res.ok) return;
      const data: ScraperStatus = await res.json();
      setScraperStatus(data);

      // Stop polling once the run completes
      if (data.status === "completed" || data.status === "no_runs") {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        // Refresh deals when scraper finishes
        if (data.status === "completed") {
          fetchDeals();
        }
      }
    } catch {
      // Network error — keep polling
    }
  }, [fetchDeals]);

  // Start polling when the panel is shown
  useEffect(() => {
    if (!showPanel) return;
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [showPanel, fetchStatus]);

  const sortedDeals = [...deals].sort((a, b) => b.score - a.score);

  async function runScraper() {
    setScraping(true);
    setScraperMsg(null);
    try {
      const res = await fetch("/api/scraper/run", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setScraperMsg("Scraper workflow triggered successfully.");
        setShowPanel(true);
        // Give GitHub a moment to register the run, then start polling
        setTimeout(fetchStatus, 3000);
        pollRef.current = setInterval(fetchStatus, 5000);
      } else {
        setScraperMsg(data.error || "Failed to trigger scraper.");
      }
    } catch {
      setScraperMsg("Network error. Could not reach server.");
    } finally {
      setScraping(false);
    }
  }

  function checkStatus() {
    setShowPanel(true);
    fetchStatus();
    if (!pollRef.current) {
      pollRef.current = setInterval(fetchStatus, 5000);
    }
  }

  function exportExcel() {
    alert(
      "Export Excel will call the Python scraper's write_deals_to_excel() via an API route. " +
        "Connect the database first to enable this."
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Deal Pipeline</h1>
          <p className="text-sm text-muted mt-1">
            {sortedDeals.length} deals &middot; Top score: {sortedDeals[0]?.score ?? 0}
            {!usingLive && !dealsLoading && " (sample data)"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={checkStatus}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-hover transition-colors"
          >
            Check Status
          </button>
          <button
            onClick={exportExcel}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-hover transition-colors"
          >
            Export Excel
          </button>
          <button
            onClick={runScraper}
            disabled={scraping}
            className="rounded-lg bg-amber px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400 transition-colors disabled:opacity-50"
          >
            {scraping ? "Triggering..." : "Run Scraper"}
          </button>
        </div>
      </div>

      {/* Scraper trigger feedback */}
      {scraperMsg && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            scraperMsg.includes("successfully")
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {scraperMsg}
        </div>
      )}

      {/* Scraper progress panel */}
      {showPanel && scraperStatus && scraperStatus.status !== "no_runs" && (
        <ScraperPanel
          status={scraperStatus}
          onDismiss={() => setShowPanel(false)}
        />
      )}

      {showPanel && scraperStatus?.status === "no_runs" && (
        <div className="mb-6 rounded-lg border border-border bg-surface p-4 text-sm text-muted">
          No scraper runs found yet. Click &quot;Run Scraper&quot; to start one.
          <button
            onClick={() => setShowPanel(false)}
            className="ml-3 text-foreground hover:text-amber transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Deals Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface text-left text-xs font-medium text-muted uppercase tracking-wider">
              <th className="px-4 py-3 text-center">Score</th>
              <th className="px-4 py-3">Deal</th>
              <th className="px-4 py-3">Industry</th>
              <th className="px-4 py-3 text-right">Ask</th>
              <th className="px-4 py-3 text-right">EBITDA</th>
              <th className="px-4 py-3 text-center">Multiple</th>
              <th className="px-4 py-3">Traits</th>
              <th className="px-4 py-3">Found</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedDeals.map((deal, i) => (
              <tr key={i} className="hover:bg-surface-hover transition-colors">
                <td className={`px-4 py-3 text-center font-bold text-lg ${scoreColor(deal.score)}`}>
                  {deal.score}
                </td>
                <td className="px-4 py-3">
                  <a
                    href={deal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-foreground hover:text-amber transition-colors"
                  >
                    {deal.title}
                  </a>
                  <div className="text-xs text-muted">{deal.location}</div>
                </td>
                <td className="px-4 py-3 text-muted">{deal.industry}</td>
                <td className="px-4 py-3 text-right font-mono">
                  {formatMoney(deal.asking_price)}
                </td>
                <td className="px-4 py-3 text-right font-mono">{formatMoney(deal.ebitda)}</td>
                <td
                  className={`px-4 py-3 text-center font-mono font-semibold ${multipleColor(
                    deal.multiple
                  )}`}
                >
                  {deal.multiple ? `${deal.multiple.toFixed(1)}x` : "N/A"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {deal.traits.map((t) => (
                      <span
                        key={t}
                        className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-xs text-emerald-400"
                      >
                        {TRAIT_LABELS[t] || t}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-muted">{deal.date_found}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty state hint */}
      {!usingLive && !dealsLoading && (
        <p className="mt-4 text-xs text-muted text-center">
          Showing sample deals. Run the scraper to populate with real listings from your configured
          sources.
        </p>
      )}
    </div>
  );
}
