import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatMoney, TRAIT_LABELS, AVOID_LABELS, CRITERIA } from "@/lib/scoring";

export async function GET() {
  const ExcelJS = await import("exceljs");
  const deals = await prisma.deal.findMany({
    orderBy: { score: "desc" },
    include: {
      feedback: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const wb = new ExcelJS.Workbook();

  // --- DEALS SHEET ---
  const ws = wb.addWorksheet("Deal Pipeline");

  const headers = [
    "Score", "Title", "Industry", "Location", "Asking Price",
    "Revenue", "EBITDA/SDE", "Multiple", "Year Est.", "Employees",
    "Positive Traits", "Red Flags", "Description", "Source URL",
    "Date Found", "Rating", "Notes",
  ];

  const headerRow = ws.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.font = { name: "Arial", bold: true, color: { argb: "FFF59E0B" }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1F2E" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  const widths = [8, 40, 22, 20, 14, 14, 14, 10, 10, 10, 30, 20, 60, 45, 12, 15, 40];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  for (const deal of deals) {
    let traits: string[] = [];
    let avoidTraits: string[] = [];
    try { traits = JSON.parse(deal.traits); } catch { /* */ }
    try { avoidTraits = JSON.parse(deal.avoidTraits); } catch { /* */ }

    const earnings = deal.ebitda || deal.cashFlowSde;
    const traitsStr = traits.map((t) => TRAIT_LABELS[t] || t).join(", ");
    const avoidStr = avoidTraits.map((t) => AVOID_LABELS[t] || t).join(", ");
    const rating = deal.feedback[0]?.rating?.replace("_", " ") || "";

    ws.addRow([
      deal.score,
      deal.title,
      deal.industry,
      deal.location,
      deal.askingPrice,
      deal.revenue,
      earnings,
      deal.multiple ? `${deal.multiple.toFixed(1)}x` : "N/A",
      deal.yearEstablished,
      deal.employees,
      traitsStr,
      avoidStr,
      deal.description?.substring(0, 300),
      deal.url,
      new Date(deal.dateFound).toLocaleDateString(),
      rating,
      "",
    ]);
  }

  // Format currency columns
  [5, 6, 7].forEach((col) => {
    ws.getColumn(col).numFmt = "$#,##0";
  });

  ws.views = [{ state: "frozen", ySplit: 1 }];

  // --- CRITERIA SHEET ---
  const cs = wb.addWorksheet("Acquisition Criteria");
  cs.getColumn(1).width = 25;
  cs.getColumn(2).width = 40;

  const criteriaData = [
    ["ACQUISITION CRITERIA", ""],
    ["", ""],
    ["Enterprise Value", "$1M - $5M"],
    ["Revenue Range", "$2M - $15M"],
    ["Minimum EBITDA", "$300K"],
    ["Maximum Multiple", "4.0x EBITDA"],
    ["Geography", "Anywhere in US"],
    ["Structure", "Holding Co - Retain/Install Mgmt"],
    ["", ""],
    ["PREFERRED TRAITS", ""],
    ...CRITERIA.preferred_traits.map((t) => ["", TRAIT_LABELS[t] || t] as [string, string]),
    ["", ""],
    ["AVOID", ""],
    ...CRITERIA.avoid_traits.map((t) => ["", AVOID_LABELS[t] || t] as [string, string]),
    ["", ""],
    ["TARGET INDUSTRIES", ""],
    ...CRITERIA.target_industries.map((ind) => ["", ind] as [string, string]),
  ];

  for (const [a, b] of criteriaData) {
    const row = cs.addRow([a, b]);
    if (a && a === a.toUpperCase() && a.length > 0) {
      row.getCell(1).font = { name: "Arial", bold: true, size: 12, color: { argb: "FFF59E0B" } };
    }
  }

  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="deal_hunter_tracker_${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
