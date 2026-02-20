import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/scrape/trigger
 * Triggers the GitHub Actions "Weekly Deal Scrape" workflow via the GitHub API.
 *
 * Requires GITHUB_TOKEN and GITHUB_REPO env vars.
 */
export async function POST(req: NextRequest) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO; // e.g. "cebateman/deal-hunter"

  if (!token || !repo) {
    return NextResponse.json(
      { error: "GITHUB_TOKEN and GITHUB_REPO env vars are required" },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const sendDigest = body.send_digest ?? false;

  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/weekly-scrape.yml/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        ref: "main",
        inputs: {
          send_digest: String(sendDigest),
        },
      }),
    }
  );

  if (res.status === 204) {
    return NextResponse.json({ triggered: true });
  }

  const error = await res.text();
  return NextResponse.json(
    { error: `GitHub API returned ${res.status}: ${error}` },
    { status: res.status }
  );
}
