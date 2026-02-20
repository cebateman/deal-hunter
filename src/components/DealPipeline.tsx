"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatMoney, getScoreColor, TRAIT_LABELS, AVOID_LABELS } from "@/lib/scoring";

interface DealWithFeedback {
  id: string;
  title: string;
  url: string;
  source: string;
  industry: string;
  location: string;
  askingPrice: number | null;
  revenue: number | null;
  ebitda: number | null;
  cashFlowSde: number | null;
  multiple: number | null;
  score: number;
  traits: string;
  avoidTraits: string;
  dateFound: Date;
  status: string;
  description: string;
  feedback: { rating: string }[];
}

interface Props {
  deals: DealWithFeedback[];
  industries: { name: string; count: number }[];
  filters: {
    industry?: string;
    status?: string;
    rating?: string;
    sort?: string;
    dir?: string;
    search?: string;
  };
}

function parseTraits(json: string): string[] {
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

const RATING_BADGES: Record<string, { label: string; color: string }> = {
  strong_interest: { label: "Strong Interest", color: "bg-emerald-900/50 text-emerald-400 border-emerald-700" },
  interested: { label: "Interested", color: "bg-blue-900/50 text-blue-400 border-blue-700" },
  maybe: { label: "Maybe", color: "bg-amber-900/50 text-amber-400 border-amber-700" },
  pass: { label: "Pass", color: "bg-gray-800/50 text-gray-400 border-gray-600" },
};

export function DealPipeline({ deals, industries, filters }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(filters.search || "");

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/?${params.toString()}`);
  }

  function handleSort(col: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (filters.sort === col && filters.dir === "desc") {
      params.set("dir", "asc");
    } else if (filters.sort === col && filters.dir === "asc") {
      params.delete("sort");
      params.delete("dir");
    } else {
      params.set("sort", col);
      params.set("dir", "desc");
    }
    router.push(`/?${params.toString()}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateFilter("search", searchValue);
  }

  function SortHeader({ col, children }: { col: string; children: React.ReactNode }) {
    const active = filters.sort === col;
    const arrow = active ? (filters.dir === "asc" ? " ↑" : " ↓") : "";
    return (
      <th
        className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-brand-gold transition-colors select-none"
        onClick={() => handleSort(col)}
      >
        {children}{arrow}
      </th>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search deals..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full px-3 py-2 bg-brand-card border border-brand-border rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold"
          />
        </form>
        <select
          value={filters.industry || "all"}
          onChange={(e) => updateFilter("industry", e.target.value)}
          className="px-3 py-2 bg-brand-card border border-brand-border rounded-lg text-sm text-gray-300 focus:outline-none focus:border-brand-gold"
        >
          <option value="all">All Industries</option>
          {industries.map((i) => (
            <option key={i.name} value={i.name}>
              {i.name} ({i.count})
            </option>
          ))}
        </select>
        <select
          value={filters.status || "all"}
          onChange={(e) => updateFilter("status", e.target.value)}
          className="px-3 py-2 bg-brand-card border border-brand-border rounded-lg text-sm text-gray-300 focus:outline-none focus:border-brand-gold"
        >
          <option value="all">All Status</option>
          <option value="new">New</option>
          <option value="reviewed">Reviewed</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-brand-dark border border-brand-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-brand-border">
                <SortHeader col="score">Score</SortHeader>
                <SortHeader col="title">Deal</SortHeader>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Industry</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <SortHeader col="askingPrice">Ask</SortHeader>
                <SortHeader col="ebitda">EBITDA</SortHeader>
                <SortHeader col="multiple">Multiple</SortHeader>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Traits</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {deals.map((deal) => {
                const traits = parseTraits(deal.traits);
                const avoidTraits = parseTraits(deal.avoidTraits);
                const earnings = deal.ebitda || deal.cashFlowSde;
                const latestRating = deal.feedback[0]?.rating;
                const badge = latestRating ? RATING_BADGES[latestRating] : null;
                const isNew = deal.status === "new";

                return (
                  <tr
                    key={deal.id}
                    className="hover:bg-brand-card/50 transition-colors group"
                  >
                    <td className="px-3 py-3">
                      <span className={`text-lg font-bold ${getScoreColor(deal.score)}`}>
                        {deal.score}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/deals/${deal.id}`}
                        className="font-semibold text-white hover:text-brand-gold transition-colors"
                      >
                        {deal.title}
                      </Link>
                      {isNew && (
                        <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-brand-gold/20 text-brand-gold rounded">
                          NEW
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-400">{deal.industry}</td>
                    <td className="px-3 py-3 text-sm text-gray-400">{deal.location}</td>
                    <td className="px-3 py-3 text-sm text-gray-300 font-mono">
                      {formatMoney(deal.askingPrice)}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-300 font-mono">
                      {formatMoney(earnings)}
                    </td>
                    <td className="px-3 py-3 text-sm font-mono text-center">
                      {deal.multiple ? (
                        <span
                          className={
                            deal.multiple <= 3.0
                              ? "text-score-high font-bold"
                              : deal.multiple <= 4.0
                                ? "text-score-low"
                                : "text-red-400"
                          }
                        >
                          {deal.multiple.toFixed(1)}x
                        </span>
                      ) : (
                        <span className="text-gray-600">N/A</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {traits.slice(0, 2).map((t) => (
                          <span
                            key={t}
                            className="px-1.5 py-0.5 text-[10px] bg-emerald-900/30 text-emerald-400 rounded"
                          >
                            {TRAIT_LABELS[t] || t}
                          </span>
                        ))}
                        {avoidTraits.slice(0, 1).map((t) => (
                          <span
                            key={t}
                            className="px-1.5 py-0.5 text-[10px] bg-red-900/30 text-red-400 rounded"
                          >
                            {AVOID_LABELS[t] || t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {badge ? (
                        <span className={`px-2 py-0.5 text-xs rounded border ${badge.color}`}>
                          {badge.label}
                        </span>
                      ) : (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {deals.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-12 text-center text-gray-500">
                    No deals found. Run the scraper or adjust your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
