"use client";

import { useEffect, useState, useCallback } from "react";

type Source = {
  id: number;
  name: string;
  url: string;
  type: "marketplace" | "broker";
  priority: "P0" | "P1" | "P2" | "P3";
  region: string;
  notes: string;
  requires_js: number;
  requires_login: number;
  enabled: number;
};

const EMPTY_FORM: {
  name: string;
  url: string;
  type: "marketplace" | "broker";
  priority: "P0" | "P1" | "P2" | "P3";
  region: string;
  notes: string;
  requires_js: boolean;
  requires_login: boolean;
} = {
  name: "",
  url: "",
  type: "broker",
  priority: "P1",
  region: "",
  notes: "",
  requires_js: false,
  requires_login: false,
};

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchSources = useCallback(async () => {
    const res = await fetch("/api/sources");
    const data = await res.json();
    setSources(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  async function toggleSource(source: Source) {
    await fetch(`/api/sources/${source.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !source.enabled }),
    });
    fetchSources();
  }

  async function deleteSource(id: number) {
    if (!confirm("Delete this source? This cannot be undone.")) return;
    await fetch(`/api/sources/${id}`, { method: "DELETE" });
    fetchSources();
  }

  async function addSource(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm(EMPTY_FORM);
    setShowAdd(false);
    setSaving(false);
    fetchSources();
  }

  const priorityColor: Record<string, string> = {
    P0: "text-red-400 bg-red-400/10",
    P1: "text-amber-400 bg-amber-400/10",
    P2: "text-blue-400 bg-blue-400/10",
    P3: "text-gray-400 bg-gray-400/10",
  };

  const enabledCount = sources.filter((s) => s.enabled).length;
  const marketplaces = sources.filter((s) => s.type === "marketplace").length;
  const brokers = sources.filter((s) => s.type === "broker").length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Scraper Sources</h1>
          <p className="text-sm text-muted mt-1">
            {sources.length} sources ({marketplaces} marketplaces, {brokers} brokers) &middot;{" "}
            {enabledCount} enabled
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
        >
          {showAdd ? "Cancel" : "+ Add Source"}
        </button>
      </div>

      {/* Add Source Form */}
      {showAdd && (
        <form
          onSubmit={addSource}
          className="mb-6 rounded-lg border border-border bg-surface p-5 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
              placeholder="e.g. Sunbelt Business Brokers"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">URL *</label>
            <input
              required
              type="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
              placeholder="https://example.com/listings"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Type *</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as "marketplace" | "broker" })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              <option value="marketplace">Marketplace</option>
              <option value="broker">Broker</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Priority</label>
            <select
              value={form.priority}
              onChange={(e) =>
                setForm({ ...form, priority: e.target.value as "P0" | "P1" | "P2" | "P3" })
              }
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              <option value="P0">P0 - Primary</option>
              <option value="P1">P1 - Weekly</option>
              <option value="P2">P2 - Biweekly</option>
              <option value="P3">P3 - User-added</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Region</label>
            <input
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
              placeholder="e.g. National, Texas, Southeast"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Notes</label>
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
              placeholder="Any scraping notes..."
            />
          </div>
          <div className="flex items-center gap-6 md:col-span-2">
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={form.requires_js}
                onChange={(e) => setForm({ ...form, requires_js: e.target.checked })}
                className="accent-primary"
              />
              Requires JavaScript
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={form.requires_login}
                onChange={(e) => setForm({ ...form, requires_login: e.target.checked })}
                className="accent-primary"
              />
              Requires Login / NDA
            </label>
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add Source"}
            </button>
          </div>
        </form>
      )}

      {/* Sources Table */}
      {loading ? (
        <div className="text-center text-muted py-12">Loading sources...</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface text-left text-xs font-medium text-muted uppercase tracking-wider">
                <th className="px-4 py-3 w-12">On</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Region</th>
                <th className="px-4 py-3 text-center">JS</th>
                <th className="px-4 py-3 text-center">Login</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sources.map((source) => (
                <tr
                  key={source.id}
                  className={`hover:bg-surface-hover transition-colors ${
                    !source.enabled ? "opacity-40" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleSource(source)}
                      className={`h-5 w-9 rounded-full transition-colors relative ${
                        source.enabled ? "bg-emerald-500" : "bg-gray-600"
                      }`}
                      title={source.enabled ? "Disable" : "Enable"}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                          source.enabled ? "left-[18px]" : "left-0.5"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {source.name}
                    </a>
                    <div className="text-xs text-muted truncate max-w-xs">{source.url}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        source.type === "marketplace"
                          ? "bg-purple-400/10 text-purple-400"
                          : "bg-sky-400/10 text-sky-400"
                      }`}
                    >
                      {source.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                        priorityColor[source.priority]
                      }`}
                    >
                      {source.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{source.region || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    {source.requires_js ? (
                      <span className="text-amber-400" title="Requires Playwright">
                        JS
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {source.requires_login ? (
                      <span className="text-red-400" title="Requires login or NDA">
                        NDA
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted max-w-xs truncate">{source.notes}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => deleteSource(source.id)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
