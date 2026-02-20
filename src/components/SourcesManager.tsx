"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Source {
  id: string;
  name: string;
  url: string;
  priority: string;
  sourceType: string;
  requiresJs: boolean;
  requiresLogin: boolean;
  region: string;
  notes: string;
  enabled: boolean;
  lastScraped: Date | string | null;
}

export function SourcesManager({ sources }: { sources: Source[] }) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    await fetch(`/api/sources/${id}`, { method: "DELETE" });
    setDeleting(null);
    router.refresh();
  }

  async function handleToggle(id: string, enabled: boolean) {
    setToggling(id);
    await fetch(`/api/sources/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    setToggling(null);
    router.refresh();
  }

  return (
    <div>
      {/* Add button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 text-sm bg-brand-gold text-brand-dark font-semibold rounded-lg hover:bg-amber-400 transition-colors"
        >
          {showAdd ? "Cancel" : "Add Source"}
        </button>
      </div>

      {/* Add form */}
      {showAdd && <AddSourceForm onDone={() => { setShowAdd(false); router.refresh(); }} />}

      {/* Sources table */}
      <div className="bg-brand-dark border border-brand-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-brand-border">
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requires</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {sources.map((s) => (
                <tr key={s.id} className={`hover:bg-brand-card/50 transition-colors ${!s.enabled ? "opacity-50" : ""}`}>
                  <td className="px-3 py-3">
                    <div>
                      <span className="font-semibold text-white text-sm">{s.name}</span>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-gray-500 hover:text-brand-gold truncate max-w-[300px]"
                      >
                        {s.url}
                      </a>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      s.sourceType === "marketplace"
                        ? "bg-blue-900/30 text-blue-400"
                        : "bg-purple-900/30 text-purple-400"
                    }`}>
                      {s.sourceType}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 text-xs font-mono rounded ${
                      s.priority === "P0" ? "bg-red-900/30 text-red-400" :
                      s.priority === "P1" ? "bg-amber-900/30 text-amber-400" :
                      "bg-gray-800 text-gray-400"
                    }`}>
                      {s.priority}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-400">
                    {s.region || "—"}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      {s.requiresJs && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-amber-900/30 text-amber-400 rounded">JS</span>
                      )}
                      {s.requiresLogin && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-red-900/30 text-red-400 rounded">Login</span>
                      )}
                      {!s.requiresJs && !s.requiresLogin && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-emerald-900/30 text-emerald-400 rounded">HTTP</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => handleToggle(s.id, s.enabled)}
                      disabled={toggling === s.id}
                      className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                        s.enabled
                          ? "bg-emerald-900/30 text-emerald-400 border-emerald-700 hover:bg-emerald-900/50"
                          : "bg-gray-800 text-gray-500 border-gray-600 hover:bg-gray-700"
                      }`}
                    >
                      {s.enabled ? "Enabled" : "Disabled"}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      onClick={() => handleDelete(s.id, s.name)}
                      disabled={deleting === s.id}
                      className="px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors"
                    >
                      {deleting === s.id ? "..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
              {sources.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-gray-500">
                    No sources configured. Add one to get started.
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

function AddSourceForm({ onDone }: { onDone: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    url: "",
    sourceType: "broker",
    priority: "P1",
    region: "",
    requiresJs: false,
    requiresLogin: false,
    notes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.url) return;
    setSaving(true);
    await fetch("/api/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-brand-dark border border-brand-border rounded-lg p-4 mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Name *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Bristol Group"
            className="w-full px-3 py-2 bg-brand-card border border-brand-border rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">URL *</label>
          <input
            type="url"
            required
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="https://example.com/listings"
            className="w-full px-3 py-2 bg-brand-card border border-brand-border rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Type</label>
          <select
            value={form.sourceType}
            onChange={(e) => setForm({ ...form, sourceType: e.target.value })}
            className="w-full px-3 py-2 bg-brand-card border border-brand-border rounded-lg text-sm text-gray-300 focus:outline-none focus:border-brand-gold"
          >
            <option value="broker">Broker</option>
            <option value="marketplace">Marketplace</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Priority</label>
          <select
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
            className="w-full px-3 py-2 bg-brand-card border border-brand-border rounded-lg text-sm text-gray-300 focus:outline-none focus:border-brand-gold"
          >
            <option value="P0">P0 — Primary</option>
            <option value="P1">P1 — Standard</option>
            <option value="P2">P2 — Low</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Region</label>
          <input
            type="text"
            value={form.region}
            onChange={(e) => setForm({ ...form, region: e.target.value })}
            placeholder="e.g. National, Southeast, Texas"
            className="w-full px-3 py-2 bg-brand-card border border-brand-border rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold"
          />
        </div>
        <div className="flex items-end gap-4 pb-1">
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={form.requiresJs}
              onChange={(e) => setForm({ ...form, requiresJs: e.target.checked })}
              className="rounded border-brand-border"
            />
            Requires JS
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={form.requiresLogin}
              onChange={(e) => setForm({ ...form, requiresLogin: e.target.checked })}
              className="rounded border-brand-border"
            />
            Requires Login
          </label>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button
          type="button"
          onClick={onDone}
          className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !form.name || !form.url}
          className="px-4 py-2 text-sm bg-brand-gold text-brand-dark font-semibold rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Add Source"}
        </button>
      </div>
    </form>
  );
}
