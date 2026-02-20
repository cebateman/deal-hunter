import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatMoney, getScoreColor, TRAIT_LABELS, AVOID_LABELS, CRITERIA } from "@/lib/scoring";
import { RatingForm } from "@/components/RatingForm";

export const dynamic = "force-dynamic";

function parseTraits(json: string): string[] {
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      feedback: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!deal) return notFound();

  const traits = parseTraits(deal.traits);
  const avoidTraits = parseTraits(deal.avoidTraits);
  const earnings = deal.ebitda || deal.cashFlowSde;
  const latestRating = deal.feedback[0]?.rating;

  return (
    <div>
      <Link
        href="/"
        className="text-sm text-gray-500 hover:text-brand-gold transition-colors mb-4 inline-block"
      >
        &larr; Back to Pipeline
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="bg-brand-dark border border-brand-border rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">{deal.title}</h1>
                <p className="text-gray-400 mt-1">
                  {deal.industry} &middot; {deal.location}
                </p>
                {deal.source && (
                  <p className="text-gray-500 text-sm mt-1">
                    Source: {deal.source}
                    {deal.brokerName && ` &middot; Broker: ${deal.brokerName}`}
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className={`text-4xl font-bold ${getScoreColor(deal.score)}`}>
                  {deal.score}
                </div>
                <div className="text-xs text-gray-500 uppercase mt-1">Score</div>
              </div>
            </div>
          </div>

          {/* Financials */}
          <div className="bg-brand-dark border border-brand-border rounded-lg p-6">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
              Financials
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-gray-500">Asking Price</div>
                <div className="text-lg font-bold text-white">
                  {formatMoney(deal.askingPrice)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Revenue</div>
                <div className="text-lg font-bold text-white">
                  {formatMoney(deal.revenue)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">
                  {deal.ebitda ? "EBITDA" : "Cash Flow (SDE)"}
                </div>
                <div className="text-lg font-bold text-white">
                  {formatMoney(earnings)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Multiple</div>
                <div
                  className={`text-lg font-bold ${
                    deal.multiple
                      ? deal.multiple <= 3.0
                        ? "text-score-high"
                        : deal.multiple <= 4.0
                          ? "text-score-low"
                          : "text-red-400"
                      : "text-gray-500"
                  }`}
                >
                  {deal.multiple ? `${deal.multiple.toFixed(1)}x` : "N/A"}
                </div>
              </div>
            </div>
            {(deal.yearEstablished || deal.employees) && (
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-brand-border">
                {deal.yearEstablished && (
                  <div>
                    <div className="text-xs text-gray-500">Year Established</div>
                    <div className="text-white">{deal.yearEstablished}</div>
                  </div>
                )}
                {deal.employees && (
                  <div>
                    <div className="text-xs text-gray-500">Employees</div>
                    <div className="text-white">{deal.employees}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="bg-brand-dark border border-brand-border rounded-lg p-6">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
              Description
            </h2>
            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
              {deal.description || "No description available."}
            </p>
          </div>

          {/* Traits */}
          <div className="bg-brand-dark border border-brand-border rounded-lg p-6">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
              Trait Analysis
            </h2>
            {traits.length > 0 && (
              <div className="mb-4">
                <div className="text-xs text-emerald-400 font-medium mb-2">
                  Positive Traits
                </div>
                <div className="flex flex-wrap gap-2">
                  {traits.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-1 text-sm bg-emerald-900/30 text-emerald-400 rounded-md border border-emerald-800/50"
                    >
                      {TRAIT_LABELS[t] || t}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {avoidTraits.length > 0 && (
              <div>
                <div className="text-xs text-red-400 font-medium mb-2">
                  Red Flags
                </div>
                <div className="flex flex-wrap gap-2">
                  {avoidTraits.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-1 text-sm bg-red-900/30 text-red-400 rounded-md border border-red-800/50"
                    >
                      {AVOID_LABELS[t] || t}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {traits.length === 0 && avoidTraits.length === 0 && (
              <p className="text-gray-500 text-sm">
                No traits detected from the listing description.
              </p>
            )}
          </div>

          {/* Feedback History */}
          {deal.feedback.length > 0 && (
            <div className="bg-brand-dark border border-brand-border rounded-lg p-6">
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                Feedback History
              </h2>
              <div className="space-y-3">
                {deal.feedback.map((fb) => (
                  <div
                    key={fb.id}
                    className="flex items-start gap-3 text-sm border-b border-brand-border pb-3 last:border-0"
                  >
                    <span
                      className={`px-2 py-0.5 rounded text-xs border ${
                        fb.rating === "strong_interest"
                          ? "bg-emerald-900/50 text-emerald-400 border-emerald-700"
                          : fb.rating === "interested"
                            ? "bg-blue-900/50 text-blue-400 border-blue-700"
                            : fb.rating === "maybe"
                              ? "bg-amber-900/50 text-amber-400 border-amber-700"
                              : "bg-gray-800/50 text-gray-400 border-gray-600"
                      }`}
                    >
                      {fb.rating.replace("_", " ")}
                    </span>
                    {fb.notes && <p className="text-gray-400">{fb.notes}</p>}
                    <span className="text-gray-600 text-xs ml-auto">
                      {new Date(fb.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Rating */}
          <div className="bg-brand-dark border border-brand-border rounded-lg p-6">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
              Rate This Deal
            </h2>
            <RatingForm dealId={deal.id} currentRating={latestRating} />
          </div>

          {/* Links */}
          <div className="bg-brand-dark border border-brand-border rounded-lg p-6">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
              Links
            </h2>
            {deal.url && (
              <a
                href={deal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-blue-400 hover:text-blue-300 transition-colors mb-2 break-all"
              >
                View Original Listing &rarr;
              </a>
            )}
            {deal.brokerName && (
              <div className="text-sm text-gray-400 mt-3">
                <div className="text-xs text-gray-500">Broker</div>
                <div>{deal.brokerName}</div>
                {deal.brokerContact && (
                  <div className="text-gray-500">{deal.brokerContact}</div>
                )}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-brand-dark border border-brand-border rounded-lg p-6">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
              Details
            </h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Date Found</dt>
                <dd className="text-gray-300">
                  {new Date(deal.dateFound).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Status</dt>
                <dd className="text-gray-300 capitalize">{deal.status}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Source</dt>
                <dd className="text-gray-300">{deal.source}</dd>
              </div>
              {deal.listingId && (
                <div>
                  <dt className="text-gray-500">Listing ID</dt>
                  <dd className="text-gray-300">{deal.listingId}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
