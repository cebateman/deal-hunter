import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type WorkflowRun = {
  id: number;
  status: string;        // "queued" | "in_progress" | "completed"
  conclusion: string | null; // "success" | "failure" | "cancelled" | null
  created_at: string;
  updated_at: string;
  html_url: string;
  run_number: number;
  jobs_url: string;
};

type Job = {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
  steps: {
    name: string;
    status: string;        // "queued" | "in_progress" | "completed"
    conclusion: string | null;
    number: number;
  }[];
};

export async function GET() {
  const token = process.env.GITHUB_PAT;
  if (!token) {
    return NextResponse.json(
      { error: "GITHUB_PAT not configured" },
      { status: 500 }
    );
  }

  const owner = process.env.GITHUB_OWNER || "cebateman";
  const repo = process.env.GITHUB_REPO || "deal-hunter";

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // Fetch the most recent runs for the scrape workflow
  const runsRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/scrape.yml/runs?per_page=1`,
    { headers, cache: "no-store" }
  );

  if (!runsRes.ok) {
    // Try the other workflow file
    const runsRes2 = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/weekly-scrape.yml/runs?per_page=1`,
      { headers, cache: "no-store" }
    );
    if (!runsRes2.ok) {
      return NextResponse.json(
        { error: `GitHub API error: ${runsRes.status}` },
        { status: runsRes.status }
      );
    }
    return handleRunsResponse(runsRes2, headers);
  }

  return handleRunsResponse(runsRes, headers);
}

async function handleRunsResponse(runsRes: Response, headers: Record<string, string>) {
  const runsData = await runsRes.json();
  const runs: WorkflowRun[] = runsData.workflow_runs || [];

  if (runs.length === 0) {
    return NextResponse.json({
      status: "no_runs",
      message: "No scraper runs found. Click 'Run Scraper' to start one.",
    });
  }

  const run = runs[0];

  // Fetch job details to get step-level progress
  let steps: { name: string; status: string; conclusion: string | null }[] = [];
  try {
    const jobsRes = await fetch(run.jobs_url, { headers, cache: "no-store" });
    if (jobsRes.ok) {
      const jobsData = await jobsRes.json();
      const jobs: Job[] = jobsData.jobs || [];
      if (jobs.length > 0) {
        steps = jobs[0].steps.map((s) => ({
          name: s.name,
          status: s.status,
          conclusion: s.conclusion,
        }));
      }
    }
  } catch {
    // Steps are optional, continue without them
  }

  const totalSteps = steps.length || 1;
  const completedSteps = steps.filter((s) => s.status === "completed").length;
  const progress = run.status === "completed"
    ? 100
    : totalSteps > 0
      ? Math.round((completedSteps / totalSteps) * 100)
      : 0;

  return NextResponse.json({
    status: run.status,
    conclusion: run.conclusion,
    progress,
    run_number: run.run_number,
    created_at: run.created_at,
    updated_at: run.updated_at,
    html_url: run.html_url,
    steps,
  });
}
