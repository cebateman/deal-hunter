import { NextResponse } from "next/server";

export async function POST() {
  const token = process.env.GITHUB_PAT;
  if (!token) {
    return NextResponse.json(
      { error: "GITHUB_PAT env var not set. Add a personal access token with actions:write scope." },
      { status: 500 }
    );
  }

  const owner = process.env.GITHUB_OWNER || "cebateman";
  const repo = process.env.GITHUB_REPO || "deal-hunter";
  const workflowFile = "weekly-scrape.yml";
  const ref = process.env.GITHUB_REF || "main";

  const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowFile}/dispatches`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ ref }),
  });

  if (res.status === 204) {
    return NextResponse.json({ ok: true, message: "Scraper workflow triggered successfully." });
  }

  const body = await res.text();
  return NextResponse.json(
    { error: `GitHub API returned ${res.status}`, details: body },
    { status: res.status }
  );
}
