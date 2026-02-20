"use client";

import { useEffect, useState, useCallback } from "react";

type Criteria = {
  id: number;
  ev_min: number;
  ev_max: number;
  revenue_min: number;
  revenue_max: number;
  ebitda_min: number;
  max_multiple: number;
  geography: string;
  preferred_traits: string[];
  avoid_traits: string[];
  target_industries: string[];
  search_keywords: string[];
  updated_at: string;
};

const ALL_PREFERRED_TRAITS = [
  { value: "recurring_revenue", label: "Recurring Revenue" },
  { value: "regulatory_moat", label: "Regulatory Moat" },
  { value: "labor_accessible", label: "Trainable Labor" },
  { value: "high_switching_costs", label: "High Switching Costs" },
  { value: "non_cyclical", label: "Non-Cyclical Demand" },
  { value: "unglamorous", label: "Unglamorous / Overlooked" },
  { value: "essential_service", label: "Essential Service" },
];

const ALL_AVOID_TRAITS = [
  { value: "commodity_exposure", label: "Commodity Price Exposure" },
  { value: "cyclical_demand", label: "Cyclical Demand" },
  { value: "specialized_labor_required", label: "Specialized Labor Required" },
  { value: "asset_light_digital", label: "Asset-Light / Digital" },
  { value: "construction_tied", label: "Construction-Tied" },
];

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${(n / 1_000).toFixed(0)}K`;
}

export default function CriteriaPage() {
  const [criteria, setCriteria] = useState<Criteria | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable fields
  const [evMin, setEvMin] = useState(1_000_000);
  const [evMax, setEvMax] = useState(5_000_000);
  const [revenueMin, setRevenueMin] = useState(2_000_000);
  const [revenueMax, setRevenueMax] = useState(15_000_000);
  const [ebitdaMin, setEbitdaMin] = useState(300_000);
  const [maxMultiple, setMaxMultiple] = useState(4.0);
  const [geography, setGeography] = useState("United States");
  const [preferredTraits, setPreferredTraits] = useState<string[]>([]);
  const [avoidTraits, setAvoidTraits] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newIndustry, setNewIndustry] = useState("");
  const [newKeyword, setNewKeyword] = useState("");

  const loadCriteria = useCallback(async () => {
    try {
      const res = await fetch("/api/criteria");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Criteria = await res.json();
      setCriteria(data);
      setEvMin(data.ev_min);
      setEvMax(data.ev_max);
      setRevenueMin(data.revenue_min);
      setRevenueMax(data.revenue_max);
      setEbitdaMin(data.ebitda_min);
      setMaxMultiple(data.max_multiple);
      setGeography(data.geography);
      setPreferredTraits(data.preferred_traits);
      setAvoidTraits(data.avoid_traits);
      setIndustries(data.target_industries);
      setKeywords(data.search_keywords);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCriteria();
  }, [loadCriteria]);

  async function saveCriteria(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const res = await fetch("/api/criteria", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ev_min: evMin,
          ev_max: evMax,
          revenue_min: revenueMin,
          revenue_max: revenueMax,
          ebitda_min: ebitdaMin,
          max_multiple: maxMultiple,
          geography,
          preferred_traits: preferredTraits,
          avoid_traits: avoidTraits,
          target_industries: industries,
          search_keywords: keywords,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Criteria = await res.json();
      setCriteria(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  function toggleTrait(trait: string, list: string[], setList: (v: string[]) => void) {
    setList(list.includes(trait) ? list.filter((t) => t !== trait) : [...list, trait]);
  }

  function removeItem(item: string, list: string[], setList: (v: string[]) => void) {
    setList(list.filter((i) => i !== item));
  }

  function addIndustry() {
    const trimmed = newIndustry.trim();
    if (trimmed && !industries.includes(trimmed)) {
      setIndustries([...industries, trimmed]);
      setNewIndustry("");
    }
  }

  function addKeyword() {
    const trimmed = newKeyword.trim().toLowerCase();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setNewKeyword("");
    }
  }

  if (loading) {
    return <div className="text-center text-muted py-12">Loading criteria...</div>;
  }

  const inputClass =
    "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-amber focus:outline-none";
  const labelClass = "block text-xs font-medium text-muted mb-1";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Deal Criteria</h1>
          <p className="text-sm text-muted mt-1">
            Configure the financial filters, traits, and industries the scraper uses to find and
            score deals.
            {criteria?.updated_at && (
              <span>
                {" "}
                &middot; Last updated{" "}
                {new Date(criteria.updated_at).toLocaleDateString()}
              </span>
            )}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {saved && (
        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          Criteria saved. Changes will apply to the next scraper run.
        </div>
      )}

      <form onSubmit={saveCriteria} className="space-y-8">
        {/* Financial Filters */}
        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
            Financial Filters
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Enterprise Value Min</label>
              <div className="relative">
                <input
                  type="number"
                  value={evMin}
                  onChange={(e) => setEvMin(Number(e.target.value))}
                  className={inputClass}
                  step={100000}
                  min={0}
                />
                <span className="absolute right-3 top-2 text-xs text-muted">
                  {formatMoney(evMin)}
                </span>
              </div>
            </div>
            <div>
              <label className={labelClass}>Enterprise Value Max</label>
              <div className="relative">
                <input
                  type="number"
                  value={evMax}
                  onChange={(e) => setEvMax(Number(e.target.value))}
                  className={inputClass}
                  step={100000}
                  min={0}
                />
                <span className="absolute right-3 top-2 text-xs text-muted">
                  {formatMoney(evMax)}
                </span>
              </div>
            </div>
            <div>
              <label className={labelClass}>Revenue Min</label>
              <div className="relative">
                <input
                  type="number"
                  value={revenueMin}
                  onChange={(e) => setRevenueMin(Number(e.target.value))}
                  className={inputClass}
                  step={100000}
                  min={0}
                />
                <span className="absolute right-3 top-2 text-xs text-muted">
                  {formatMoney(revenueMin)}
                </span>
              </div>
            </div>
            <div>
              <label className={labelClass}>Revenue Max</label>
              <div className="relative">
                <input
                  type="number"
                  value={revenueMax}
                  onChange={(e) => setRevenueMax(Number(e.target.value))}
                  className={inputClass}
                  step={100000}
                  min={0}
                />
                <span className="absolute right-3 top-2 text-xs text-muted">
                  {formatMoney(revenueMax)}
                </span>
              </div>
            </div>
            <div>
              <label className={labelClass}>EBITDA Min</label>
              <div className="relative">
                <input
                  type="number"
                  value={ebitdaMin}
                  onChange={(e) => setEbitdaMin(Number(e.target.value))}
                  className={inputClass}
                  step={50000}
                  min={0}
                />
                <span className="absolute right-3 top-2 text-xs text-muted">
                  {formatMoney(ebitdaMin)}
                </span>
              </div>
            </div>
            <div>
              <label className={labelClass}>Max Multiple (x EBITDA)</label>
              <input
                type="number"
                value={maxMultiple}
                onChange={(e) => setMaxMultiple(Number(e.target.value))}
                className={inputClass}
                step={0.5}
                min={0}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className={labelClass}>Geography</label>
            <input
              value={geography}
              onChange={(e) => setGeography(e.target.value)}
              className={inputClass + " max-w-sm"}
              placeholder="e.g. United States"
            />
          </div>
        </section>

        {/* Preferred Traits */}
        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">
            Preferred Traits
          </h2>
          <p className="text-xs text-muted mb-4">
            Deals with these traits score higher. Toggle to include or exclude.
          </p>
          <div className="flex flex-wrap gap-2">
            {ALL_PREFERRED_TRAITS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => toggleTrait(t.value, preferredTraits, setPreferredTraits)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  preferredTraits.includes(t.value)
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : "bg-surface-hover text-muted border border-border"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </section>

        {/* Avoid Traits */}
        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">
            Red-Flag Traits
          </h2>
          <p className="text-xs text-muted mb-4">
            Deals with these traits are penalized in scoring. Toggle to include or exclude.
          </p>
          <div className="flex flex-wrap gap-2">
            {ALL_AVOID_TRAITS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => toggleTrait(t.value, avoidTraits, setAvoidTraits)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  avoidTraits.includes(t.value)
                    ? "bg-red-500/20 text-red-400 border border-red-500/40"
                    : "bg-surface-hover text-muted border border-border"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </section>

        {/* Target Industries */}
        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">
            Target Industries
          </h2>
          <p className="text-xs text-muted mb-4">
            Deals in these industries receive a scoring boost. Click to remove, or add new ones
            below.
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {industries.map((ind) => (
              <span
                key={ind}
                className="group flex items-center gap-1.5 rounded-full bg-amber/10 px-3 py-1.5 text-xs font-medium text-amber border border-amber/30"
              >
                {ind}
                <button
                  type="button"
                  onClick={() => removeItem(ind, industries, setIndustries)}
                  className="text-amber/60 hover:text-red-400 transition-colors"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2 max-w-md">
            <input
              value={newIndustry}
              onChange={(e) => setNewIndustry(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addIndustry();
                }
              }}
              className={inputClass}
              placeholder="Add industry..."
            />
            <button
              type="button"
              onClick={addIndustry}
              className="rounded-md border border-border bg-surface-hover px-3 py-2 text-sm text-foreground hover:bg-amber hover:text-black transition-colors whitespace-nowrap"
            >
              Add
            </button>
          </div>
        </section>

        {/* Search Keywords */}
        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">
            Search Keywords
          </h2>
          <p className="text-xs text-muted mb-4">
            Keywords used to search BizBuySell and broker sites. Click to remove, or add new ones
            below.
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {keywords.map((kw) => (
              <span
                key={kw}
                className="group flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 border border-blue-500/30"
              >
                {kw}
                <button
                  type="button"
                  onClick={() => removeItem(kw, keywords, setKeywords)}
                  className="text-blue-400/60 hover:text-red-400 transition-colors"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2 max-w-md">
            <input
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addKeyword();
                }
              }}
              className={inputClass}
              placeholder="Add keyword..."
            />
            <button
              type="button"
              onClick={addKeyword}
              className="rounded-md border border-border bg-surface-hover px-3 py-2 text-sm text-foreground hover:bg-amber hover:text-black transition-colors whitespace-nowrap"
            >
              Add
            </button>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-amber px-6 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Criteria"}
          </button>
          <p className="text-xs text-muted">
            Changes take effect on the next scraper run.
          </p>
        </div>
      </form>
    </div>
  );
}
