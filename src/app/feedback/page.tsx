import { prisma } from "@/lib/db";
import Link from "next/link";
import { getScoreColor } from "@/lib/scoring";

export const dynamic = "force-dynamic";

const RATING_BADGES: Record<string, { label: string; color: string }> = {
  strong_interest: { label: "Strong Interest", color: "bg-emerald-900/50 text-emerald-400 border-emerald-700" },
  interested: { label: "Interested", color: "bg-blue-900/50 text-blue-400 border-blue-700" },
  maybe: { label: "Maybe", color: "bg-amber-900/50 text-amber-400 border-amber-700" },
  pass: { label: "Pass", color: "bg-gray-800/50 text-gray-400 border-gray-600" },
};

export default async function FeedbackPage() {
  const feedback = await prisma.feedback.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      deal: {
        select: {
          id: true,
          title: true,
          industry: true,
          score: true,
          location: true,
        },
      },
    },
  });

  const ratingCounts = {
    strong_interest: feedback.filter((f) => f.rating === "strong_interest").length,
    interested: feedback.filter((f) => f.rating === "interested").length,
    maybe: feedback.filter((f) => f.rating === "maybe").length,
    pass: feedback.filter((f) => f.rating === "pass").length,
  };

  const totalReviewed = new Set(feedback.map((f) => f.dealId)).size;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Feedback History</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        <div className="bg-brand-dark border border-brand-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-white">{totalReviewed}</div>
          <div className="text-xs text-gray-500 mt-1">Deals Reviewed</div>
        </div>
        {Object.entries(ratingCounts).map(([rating, count]) => {
          const badge = RATING_BADGES[rating];
          return (
            <div key={rating} className="bg-brand-dark border border-brand-border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{count}</div>
              <div className={`text-xs mt-1 ${badge.color.split(" ")[1]}`}>
                {badge.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Feedback List */}
      <div className="bg-brand-dark border border-brand-border rounded-lg overflow-hidden">
        <div className="divide-y divide-brand-border">
          {feedback.map((fb) => {
            const badge = RATING_BADGES[fb.rating];
            return (
              <div key={fb.id} className="p-4 hover:bg-brand-card/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 text-xs rounded border ${badge?.color}`}>
                        {badge?.label || fb.rating}
                      </span>
                      <Link
                        href={`/deals/${fb.deal.id}`}
                        className="font-medium text-white hover:text-brand-gold transition-colors"
                      >
                        {fb.deal.title}
                      </Link>
                      <span className={`text-sm font-bold ${getScoreColor(fb.deal.score)}`}>
                        {fb.deal.score}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {fb.deal.industry} &middot; {fb.deal.location}
                    </p>
                    {fb.notes && (
                      <p className="text-sm text-gray-400 mt-2 pl-2 border-l-2 border-brand-border">
                        {fb.notes}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-600 whitespace-nowrap">
                    {new Date(fb.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
          {feedback.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              No feedback yet. Rate deals from the pipeline to see your history here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
