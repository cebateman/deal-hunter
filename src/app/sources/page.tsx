import { prisma } from "@/lib/db";
import { SourcesManager } from "@/components/SourcesManager";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const sources = await prisma.scraperSource.findMany({
    orderBy: [{ priority: "asc" }, { name: "asc" }],
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Scraper Sources</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage the broker sites and marketplaces that get scraped for deals.
        </p>
      </div>
      <SourcesManager sources={sources} />
    </div>
  );
}
