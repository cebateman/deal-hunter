import { prisma } from "@/lib/db";
import { DealPipeline } from "@/components/DealPipeline";
import { RunScraperButton } from "@/components/RunScraperButton";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const industry = typeof params.industry === "string" ? params.industry : undefined;
  const status = typeof params.status === "string" ? params.status : undefined;
  const rating = typeof params.rating === "string" ? params.rating : undefined;
  const sort = typeof params.sort === "string" ? params.sort : "score";
  const dir = typeof params.dir === "string" ? params.dir : "desc";
  const search = typeof params.search === "string" ? params.search : undefined;

  const where: Record<string, unknown> = {};
  if (industry && industry !== "all") where.industry = industry;
  if (status && status !== "all") where.status = status;
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
      { location: { contains: search } },
    ];
  }

  const orderBy: Record<string, string> = {};
  const validSorts = ["score", "askingPrice", "ebitda", "multiple", "dateFound", "title"];
  orderBy[validSorts.includes(sort) ? sort : "score"] = dir === "asc" ? "asc" : "desc";

  const deals = await prisma.deal.findMany({
    where,
    orderBy,
    include: {
      feedback: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const industries = await prisma.deal.groupBy({
    by: ["industry"],
    _count: true,
    orderBy: { _count: { industry: "desc" } },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Deal Pipeline</h1>
          <p className="text-sm text-gray-500 mt-1">
            {deals.length} deal{deals.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <div className="flex gap-2">
          <RunScraperButton />
          <a
            href="/api/export"
            className="px-4 py-2 text-sm bg-brand-card border border-brand-border rounded-lg text-gray-300 hover:text-white hover:border-brand-gold transition-colors"
          >
            Export Excel
          </a>
        </div>
      </div>
      <DealPipeline
        deals={deals}
        industries={industries.map((i) => ({
          name: i.industry,
          count: i._count,
        }))}
        filters={{ industry, status, rating, sort, dir, search }}
      />
    </div>
  );
}
