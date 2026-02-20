"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const RATINGS = [
  {
    value: "strong_interest",
    label: "Strong Interest",
    color: "border-emerald-700 bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/60",
    activeColor: "border-emerald-500 bg-emerald-900/60 text-emerald-300 ring-2 ring-emerald-500/50",
  },
  {
    value: "interested",
    label: "Interested",
    color: "border-blue-700 bg-blue-900/30 text-blue-400 hover:bg-blue-900/60",
    activeColor: "border-blue-500 bg-blue-900/60 text-blue-300 ring-2 ring-blue-500/50",
  },
  {
    value: "maybe",
    label: "Maybe",
    color: "border-amber-700 bg-amber-900/30 text-amber-400 hover:bg-amber-900/60",
    activeColor: "border-amber-500 bg-amber-900/60 text-amber-300 ring-2 ring-amber-500/50",
  },
  {
    value: "pass",
    label: "Pass",
    color: "border-gray-600 bg-gray-800/30 text-gray-400 hover:bg-gray-800/60",
    activeColor: "border-gray-500 bg-gray-800/60 text-gray-300 ring-2 ring-gray-500/50",
  },
];

export function RatingForm({
  dealId,
  currentRating,
}: {
  dealId: string;
  currentRating?: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(currentRating || "");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: selected, notes }),
      });

      if (res.ok) {
        setSaved(true);
        setNotes("");
        router.refresh();
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {RATINGS.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => setSelected(r.value)}
            className={`px-3 py-2 text-sm font-medium rounded-lg border transition-all ${
              selected === r.value ? r.activeColor : r.color
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add notes (optional)..."
        className="w-full px-3 py-2 bg-brand-darker border border-brand-border rounded-lg text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-brand-gold resize-none"
        rows={3}
      />
      <button
        type="submit"
        disabled={!selected || saving}
        className="w-full mt-3 px-4 py-2 bg-brand-gold text-brand-dark font-medium text-sm rounded-lg hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        {saving ? "Saving..." : saved ? "Saved!" : "Submit Rating"}
      </button>
    </form>
  );
}
