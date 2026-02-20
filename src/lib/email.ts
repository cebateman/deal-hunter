/**
 * Deal Hunter — Email System
 * Generates HTML email digests and sends via Resend.
 */

import type { Deal } from "@prisma/client";
import { formatMoney, getScoreHexColor, TRAIT_LABELS, AVOID_LABELS } from "./scoring";

function parseDealTraits(deal: Deal): { traits: string[]; avoidTraits: string[] } {
  let traits: string[] = [];
  let avoidTraits: string[] = [];
  try {
    traits = JSON.parse(deal.traits);
  } catch { /* empty */ }
  try {
    avoidTraits = JSON.parse(deal.avoidTraits);
  } catch { /* empty */ }
  return { traits, avoidTraits };
}

export function generateWeeklyDigestHtml(deals: Deal[], weekDate?: string): string {
  const date = weekDate || new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const sorted = [...deals].sort((a, b) => b.score - a.score).slice(0, 25);
  const dealsWithMultiple = sorted.filter((d) => d.multiple !== null);
  const avgMultiple = dealsWithMultiple.length > 0
    ? (dealsWithMultiple.reduce((sum, d) => sum + (d.multiple || 0), 0) / dealsWithMultiple.length).toFixed(1)
    : "N/A";

  const dealRows = sorted
    .map((d, i) => {
      const earnings = d.ebitda || d.cashFlowSde;
      const multStr = d.multiple ? `${d.multiple.toFixed(1)}x` : "N/A";
      const bg = i % 2 === 0 ? "#f8f9fa" : "#ffffff";
      const scoreColor = getScoreHexColor(d.score);
      const multColor =
        d.multiple && d.multiple <= 3.5
          ? "#059669"
          : d.multiple && d.multiple <= 4.0
            ? "#d97706"
            : "#6b7280";

      return `
        <tr style="background:${bg}">
          <td style="padding:12px 8px;text-align:center;font-weight:bold;color:${scoreColor};font-size:16px">${d.score}</td>
          <td style="padding:12px 8px">
            <a href="${d.url}" style="color:#1a1a1a;font-weight:600;text-decoration:none">${d.title}</a><br>
            <span style="color:#6b7280;font-size:12px">${d.industry} &middot; ${d.location}</span>
          </td>
          <td style="padding:12px 8px;text-align:right;font-family:monospace">${formatMoney(d.askingPrice)}</td>
          <td style="padding:12px 8px;text-align:right;font-family:monospace">${formatMoney(earnings)}</td>
          <td style="padding:12px 8px;text-align:center;font-family:monospace;color:${multColor}">${multStr}</td>
        </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:700px;margin:20px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
  <div style="background:#0c0f14;padding:24px 32px">
    <h1 style="margin:0;color:#f59e0b;font-size:24px">DEAL HUNTER</h1>
    <p style="margin:4px 0 0;color:#6b7280;font-size:13px;letter-spacing:1px">WEEKLY ACQUISITION DIGEST &mdash; ${date.toUpperCase()}</p>
  </div>
  <div style="padding:20px 32px;background:#f8f9fa;border-bottom:1px solid #e5e7eb">
    <p style="margin:0;font-size:15px;color:#374151">
      Found <strong>${sorted.length} deals</strong> matching your criteria this week.
      Top score: <strong style="color:#059669">${sorted[0]?.score || 0}</strong> &middot;
      Avg multiple: <strong>${avgMultiple}x</strong>
    </p>
  </div>
  <div style="padding:16px 32px">
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <thead>
        <tr style="border-bottom:2px solid #e5e7eb">
          <th style="padding:8px;text-align:center;color:#6b7280;font-size:11px;letter-spacing:1px">SCORE</th>
          <th style="padding:8px;text-align:left;color:#6b7280;font-size:11px;letter-spacing:1px">DEAL</th>
          <th style="padding:8px;text-align:right;color:#6b7280;font-size:11px;letter-spacing:1px">ASK</th>
          <th style="padding:8px;text-align:right;color:#6b7280;font-size:11px;letter-spacing:1px">EBITDA</th>
          <th style="padding:8px;text-align:center;color:#6b7280;font-size:11px;letter-spacing:1px">MULT</th>
        </tr>
      </thead>
      <tbody>${dealRows}</tbody>
    </table>
  </div>
  <div style="padding:20px 32px;background:#f8f9fa;border-top:1px solid #e5e7eb">
    <p style="margin:0;font-size:13px;color:#6b7280">
      <strong>Reply to this email with feedback:</strong> Rate deals as Pass / Maybe / Interested / Strong Interest.
      Your feedback sharpens future results.
    </p>
    <p style="margin:8px 0 0;font-size:12px;color:#9ca3af">
      Deal Hunter v1.0 &middot; Sources: BizBuySell &middot; Criteria: Essential services, regulatory moats, trainable labor, &le;4x EBITDA
    </p>
  </div>
</div>
</body>
</html>`;
}

export function generateIntroEmailHtml(): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:700px;margin:20px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
  <div style="background:#0c0f14;padding:32px">
    <h1 style="margin:0;color:#f59e0b;font-size:28px">DEAL HUNTER</h1>
    <p style="margin:8px 0 0;color:#e2e4e9;font-size:16px">Your weekly acquisition opportunity digest</p>
  </div>
  <div style="padding:32px">
    <p style="font-size:15px;line-height:1.7;color:#374151;margin:0 0 16px">
      Welcome to Deal Hunter — your automated system for finding acquisition opportunities that match your investment thesis.
    </p>
    <h2 style="font-size:17px;color:#1a1a1a;margin:24px 0 12px">What you'll get each week</h2>
    <p style="font-size:15px;line-height:1.7;color:#374151;margin:0 0 16px">
      Every Monday morning, you'll receive an email with <strong>10-25 scored deals</strong> from BizBuySell and other listing platforms. Each deal is automatically scored against your acquisition criteria on a 0-100 scale.
    </p>
    <h2 style="font-size:17px;color:#1a1a1a;margin:24px 0 12px">Your criteria</h2>
    <div style="background:#f8f9fa;border-radius:8px;padding:20px;margin:0 0 16px">
      <table style="width:100%;font-size:14px;border-collapse:collapse">
        <tr><td style="padding:6px 0;color:#6b7280;width:40%">Enterprise Value</td><td style="padding:6px 0;font-weight:600">$1M &ndash; $5M</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Revenue</td><td style="padding:6px 0;font-weight:600">$2M &ndash; $15M</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Min EBITDA</td><td style="padding:6px 0;font-weight:600">$300K</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Max Multiple</td><td style="padding:6px 0;font-weight:600">4.0x EBITDA</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Geography</td><td style="padding:6px 0;font-weight:600">Anywhere in US</td></tr>
      </table>
    </div>
    <h2 style="font-size:17px;color:#1a1a1a;margin:24px 0 12px">How to give feedback</h2>
    <p style="font-size:15px;line-height:1.7;color:#374151;margin:0 0 16px">
      Just <strong>reply to any weekly email</strong> with your ratings:
    </p>
    <div style="background:#f8f9fa;border-radius:8px;padding:16px 20px;margin:0 0 16px">
      <p style="margin:4px 0;font-size:14px"><span style="color:#059669;font-weight:bold">Strong Interest</span> — I want to pursue this</p>
      <p style="margin:4px 0;font-size:14px"><span style="color:#2563eb;font-weight:bold">Interested</span> — Worth a closer look</p>
      <p style="margin:4px 0;font-size:14px"><span style="color:#d97706;font-weight:bold">Maybe</span> — Not sure yet</p>
      <p style="margin:4px 0;font-size:14px"><span style="color:#6b7280;font-weight:bold">Pass</span> — Not for me (tell me why!)</p>
    </div>
  </div>
  <div style="padding:20px 32px;background:#0c0f14">
    <p style="margin:0;font-size:13px;color:#6b7280">
      Deal Hunter v1.0 &middot; Built for Christian Ellis-Bateman &middot; christianellisbateman@gmail.com
    </p>
  </div>
</div>
</body>
</html>`;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: process.env.EMAIL_FROM || "Deal Hunter <deals@yourdomain.com>",
      to: [to],
      subject,
      html,
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
