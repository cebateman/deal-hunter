"use client";

import { useState } from "react";

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

export default function PipelinePage() {
  const [scraping, setScraping] = useState(false);
  const [scraperMsg, setScraperMsg] = useState<string | null>(null);

  const deals = [...SAMPLE_DEALS].sort((a, b) => b.score - a.score);

  async function runScraper() {
    setScraping(true);
    setScraperMsg(null);
    try {
      const res = await fetch("/api/scraper/run", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setScraperMsg("Scraper workflow triggered. Check GitHub Actions for progress.");
      } else {
        setScraperMsg(data.error || "Failed to trigger scraper.");
      }
    } catch {
      setScraperMsg("Network error. Could not reach server.");
    } finally {
      setScraping(false);
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
            {deals.length} deals &middot; Top score: {deals[0]?.score ?? 0}
          </p>
        </div>
        <div className="flex items-center gap-3">
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

      {/* Scraper feedback banner */}
      {scraperMsg && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            scraperMsg.includes("triggered")
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {scraperMsg}
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
            {deals.map((deal, i) => (
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
      <p className="mt-4 text-xs text-muted text-center">
        Showing sample deals. Run the scraper to populate with real listings from your configured
        sources.
      </p>
    </div>
  );
}
