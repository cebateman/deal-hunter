import { CRITERIA, TRAIT_LABELS, AVOID_LABELS } from "@/lib/scoring";

export default function CriteriaPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-white mb-6">Acquisition Criteria</h1>

      {/* Financial Parameters */}
      <div className="bg-brand-dark border border-brand-border rounded-lg p-6 mb-6">
        <h2 className="text-sm font-medium text-brand-gold uppercase tracking-wider mb-4">
          Financial Parameters
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "Enterprise Value", value: "$1M - $5M" },
            { label: "Revenue Range", value: "$2M - $15M" },
            { label: "Minimum EBITDA", value: "$300K" },
            { label: "Maximum Multiple", value: "4.0x EBITDA" },
            { label: "Geography", value: "Anywhere in US" },
            { label: "Structure", value: "Holding Co - Retain/Install Mgmt" },
          ].map((item) => (
            <div key={item.label} className="flex justify-between py-2 border-b border-brand-border last:border-0">
              <span className="text-gray-400 text-sm">{item.label}</span>
              <span className="text-white font-medium text-sm">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Preferred Traits */}
      <div className="bg-brand-dark border border-brand-border rounded-lg p-6 mb-6">
        <h2 className="text-sm font-medium text-brand-gold uppercase tracking-wider mb-4">
          Preferred Traits
        </h2>
        <div className="flex flex-wrap gap-2">
          {CRITERIA.preferred_traits.map((trait) => (
            <span
              key={trait}
              className="px-3 py-1.5 text-sm bg-emerald-900/30 text-emerald-400 rounded-md border border-emerald-800/50"
            >
              {TRAIT_LABELS[trait] || trait}
            </span>
          ))}
        </div>
        <div className="mt-4 text-sm text-gray-500">
          <p>
            Essential-service businesses with regulatory moats, recurring revenue, and non-cyclical
            demand. Labor-intensive operations where floor workers can be trained on the job with
            minimal prior experience.
          </p>
        </div>
      </div>

      {/* Traits to Avoid */}
      <div className="bg-brand-dark border border-brand-border rounded-lg p-6 mb-6">
        <h2 className="text-sm font-medium text-brand-gold uppercase tracking-wider mb-4">
          Traits to Avoid
        </h2>
        <div className="flex flex-wrap gap-2">
          {CRITERIA.avoid_traits.map((trait) => (
            <span
              key={trait}
              className="px-3 py-1.5 text-sm bg-red-900/30 text-red-400 rounded-md border border-red-800/50"
            >
              {AVOID_LABELS[trait] || trait}
            </span>
          ))}
        </div>
      </div>

      {/* Target Industries */}
      <div className="bg-brand-dark border border-brand-border rounded-lg p-6 mb-6">
        <h2 className="text-sm font-medium text-brand-gold uppercase tracking-wider mb-4">
          Target Industries
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {CRITERIA.target_industries.map((ind) => (
            <div
              key={ind}
              className="px-3 py-2 text-sm text-gray-300 bg-brand-card rounded-md border border-brand-border"
            >
              {ind}
            </div>
          ))}
        </div>
      </div>

      {/* Scoring Methodology */}
      <div className="bg-brand-dark border border-brand-border rounded-lg p-6">
        <h2 className="text-sm font-medium text-brand-gold uppercase tracking-wider mb-4">
          Scoring Methodology
        </h2>
        <div className="space-y-4 text-sm text-gray-400">
          <div>
            <div className="flex justify-between text-gray-300 mb-1">
              <span>Trait Match</span>
              <span className="font-medium">50% weight</span>
            </div>
            <p>Each preferred trait detected = +10 points. Each avoid trait = -15 points. Normalized to 0-100.</p>
          </div>
          <div>
            <div className="flex justify-between text-gray-300 mb-1">
              <span>Multiple</span>
              <span className="font-medium">30% weight</span>
            </div>
            <p>
              &le;2.5x = 100, &le;3.0x = 90, &le;3.5x = 75, &le;4.0x = 50, &gt;4.0x = 0.
              Neutral (40) if not calculable.
            </p>
          </div>
          <div>
            <div className="flex justify-between text-gray-300 mb-1">
              <span>Industry Match</span>
              <span className="font-medium">20% weight</span>
            </div>
            <p>Exact match to target list = 100. No match = 20.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
