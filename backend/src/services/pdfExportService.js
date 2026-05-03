/**
 * PDF export service.
 * Builds researcher reports for documentation and analysis.
 */

const PDFDocument = require("pdfkit");

const TITLE = "Health Lab Researcher Export";
const MARGIN = 50;
const FONT_TITLE = 18;
const FONT_SUBTITLE = 10;
const FONT_ROW = 9;
const FONT_DETAIL = 10;

const BRAND = "#023047";
const BRAND_SOFT = "#E8F5FB";
const TABLE_HEADER = "#0B5F77";
const BORDER = "#D1D5DB";
const TEXT_DARK = "#1F2937";

function toIsoLocal(date = new Date()) {
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function drawResearchersTableHeader(doc, startX, startY, columns) {
  const rowHeight = 22;
  doc.save();
  doc.rect(startX, startY, columns.reduce((sum, c) => sum + c.width, 0), rowHeight).fill(TABLE_HEADER);
  doc.fillColor("white").fontSize(9).font("Helvetica-Bold");
  let x = startX;
  columns.forEach((col) => {
    doc.text(col.label, x + 6, startY + 7, {
      width: col.width - 10,
      height: rowHeight - 8,
      ellipsis: true,
      lineBreak: false,
    });
    x += col.width;
  });
  doc.restore();
  return startY + rowHeight;
}

function drawResearchersRow(doc, startX, y, columns, values) {
  const rowHeight = 24;
  let x = startX;

  columns.forEach((col, idx) => {
    doc.save();
    doc.rect(x, y, col.width, rowHeight).strokeColor(BORDER).lineWidth(0.6).stroke();
    doc.fillColor("#1F2937").fontSize(FONT_ROW).font("Helvetica").text(String(values[idx] || "-"), x + 6, y + 7, {
      width: col.width - 10,
      height: rowHeight - 8,
      ellipsis: true,
      lineBreak: false,
    });
    doc.restore();
    x += col.width;
  });

  return y + rowHeight;
}

function fitColumnsToWidth(columns, totalWidth) {
  const baseTotal = columns.reduce((sum, c) => sum + c.width, 0);
  if (baseTotal <= 0 || totalWidth <= 0) return columns;

  const ratio = totalWidth / baseTotal;
  let used = 0;

  const scaled = columns.map((col, idx) => {
    if (idx === columns.length - 1) {
      return { ...col, width: Math.max(totalWidth - used, 40) };
    }
    const width = Math.max(Math.floor(col.width * ratio), 45);
    used += width;
    return { ...col, width };
  });

  return scaled;
}

function ensurePageSpace(doc, neededHeight) {
  if (doc.y + neededHeight > doc.page.height - MARGIN) {
    doc.addPage();
    doc.y = MARGIN;
  }
}

function drawOverviewBanner(doc, title, generatedAt, days) {
  doc.save();
  doc.rect(0, 0, doc.page.width, 120).fill(BRAND);
  doc.restore();

  doc.fillColor("white").font("Helvetica-Bold").fontSize(28).text(title, MARGIN, 30, { align: "left" });
  doc.font("Helvetica").fontSize(13).text(`Generated ${generatedAt}`, MARGIN, 74);
  doc.font("Helvetica").fontSize(13).text(`Range: Last ${days} days`, MARGIN, 95);
  doc.y = 138;
}

function drawKpiCards(doc, metrics) {
  const gap = 10;
  const cardHeight = 62;
  const cardsPerRow = 3;
  const usableWidth = doc.page.width - (MARGIN * 2);
  const cardWidth = (usableWidth - (gap * (cardsPerRow - 1))) / cardsPerRow;

  for (let i = 0; i < metrics.length; i += cardsPerRow) {
    ensurePageSpace(doc, cardHeight + 8);
    const y = doc.y;
    const row = metrics.slice(i, i + cardsPerRow);

    row.forEach((metric, idx) => {
      const x = MARGIN + idx * (cardWidth + gap);
      doc.save();
      doc.roundedRect(x, y, cardWidth, cardHeight, 8).fillAndStroke(BRAND_SOFT, BORDER);
      doc.restore();

      doc.fillColor("#4B5563").font("Helvetica-Bold").fontSize(8)
        .text(metric.label.toUpperCase(), x + 8, y + 8, {
          width: cardWidth - 16,
          height: 26,
          ellipsis: true,
        });
      doc.fillColor(BRAND).font("Helvetica-Bold").fontSize(13)
        .text(String(metric.value), x + 8, y + 38, {
          width: cardWidth - 16,
          height: 16,
          ellipsis: true,
          lineBreak: false,
        });
    });

    doc.y = y + cardHeight + 10;
  }
}

function drawSimpleListSection(doc, title, lines, emptyText = "No data available.") {
  ensurePageSpace(doc, 28);
  doc.fillColor(TEXT_DARK).font("Helvetica-Bold").fontSize(13).text(title, MARGIN, doc.y);
  doc.y += 8;

  if (!lines.length) {
    ensurePageSpace(doc, 18);
    doc.fillColor("#6B7280").font("Helvetica").fontSize(10).text(emptyText, MARGIN, doc.y);
    doc.y += 14;
    return;
  }

  lines.forEach((line) => {
    ensurePageSpace(doc, 16);
    doc.fillColor(TEXT_DARK).font("Helvetica").fontSize(10).text(line, MARGIN, doc.y, {
      width: doc.page.width - (MARGIN * 2),
      ellipsis: true,
      lineBreak: false,
    });
    doc.y += 14;
  });

  doc.y += 6;
}

function drawTableSection(doc, title, columns, rows) {
  ensurePageSpace(doc, 34);
  doc.fillColor(TEXT_DARK).font("Helvetica-Bold").fontSize(13).text(title, MARGIN, doc.y);
  doc.y += 8;

  const tableWidth = doc.page.width - (MARGIN * 2);
  const fitted = fitColumnsToWidth(columns, tableWidth);
  const rowHeight = 22;

  const drawHeader = () => {
    ensurePageSpace(doc, rowHeight);
    const startY = doc.y;
    doc.save();
    doc.rect(MARGIN, startY, tableWidth, rowHeight).fill(TABLE_HEADER);
    doc.restore();
    let x = MARGIN;
    doc.fillColor("white").font("Helvetica-Bold").fontSize(9);
    fitted.forEach((col) => {
      doc.text(col.label, x + 6, startY + 7, {
        width: col.width - 10,
        height: rowHeight - 8,
        ellipsis: true,
        lineBreak: false,
      });
      x += col.width;
    });
    doc.y = startY + rowHeight;
  };

  drawHeader();

  if (!rows.length) {
    ensurePageSpace(doc, rowHeight);
    doc.rect(MARGIN, doc.y, tableWidth, rowHeight).strokeColor(BORDER).lineWidth(0.6).stroke();
    doc.fillColor("#6B7280").font("Helvetica").fontSize(9)
      .text("No data available.", MARGIN + 8, doc.y + 7, { width: tableWidth - 16, lineBreak: false });
    doc.y += rowHeight + 10;
    return;
  }

  rows.forEach((row) => {
    if (doc.y + rowHeight > doc.page.height - MARGIN) {
      doc.addPage();
      doc.y = MARGIN;
      drawHeader();
    }

    let x = MARGIN;
    fitted.forEach((col, idx) => {
      doc.rect(x, doc.y, col.width, rowHeight).strokeColor(BORDER).lineWidth(0.6).stroke();
      doc.fillColor(TEXT_DARK).font("Helvetica").fontSize(9)
        .text(String(row[idx] ?? "-"), x + 6, doc.y + 7, {
          width: col.width - 10,
          height: rowHeight - 8,
          ellipsis: true,
          lineBreak: false,
        });
      x += col.width;
    });
    doc.y += rowHeight;
  });

  doc.y += 10;
}

/**
 * Pipe a researcher report PDF to the given response stream.
 * @param {Array} researchers - List of researcher docs (with populated user, reviewedBy)
 * @param {object} res - Express response object (stream)
 */
function pipeResearchersReportToResponse(researchers, res) {
  const filename = `researchers-report-${new Date().toISOString().slice(0, 10)}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const doc = new PDFDocument({ margin: MARGIN, size: "A4" });
  doc.pipe(res);

  const generatedAt = toIsoLocal(new Date());

  // Top banner
  doc.save();
  doc.rect(0, 0, doc.page.width, 120).fill(BRAND);
  doc.restore();
  doc.fillColor("white").font("Helvetica-Bold").fontSize(30).text(TITLE, MARGIN, 30, { align: "left" });
  doc.font("Helvetica").fontSize(15).text(`Generated ${generatedAt}`, MARGIN, 72);
  doc.font("Helvetica").fontSize(15).text(`Total researchers: ${researchers.length}`, MARGIN, 95);

  const tableStartX = MARGIN;
  let y = 145;
  const baseColumns = [
    { label: "ID", width: 65 },
    { label: "Name", width: 130 },
    { label: "Email", width: 170 },
    { label: "Qualification", width: 90 },
    { label: "Type", width: 70 },
    { label: "Status", width: 60 },
  ];
  const tableWidth = doc.page.width - (MARGIN * 2);
  const columns = fitColumnsToWidth(baseColumns, tableWidth);

  y = drawResearchersTableHeader(doc, tableStartX, y, columns);

  const bottomLimit = doc.page.height - MARGIN;

  researchers.forEach((r) => {
    if (y + 28 > bottomLimit) {
      doc.addPage();
      y = MARGIN;
      y = drawResearchersTableHeader(doc, tableStartX, y, columns);
    }

    const user = r.user || {};
    const row = [
      r.status === "approved" ? (r.researcherId || "-") : "-",
      r.fullName || user.name || "-",
      user.email || "-",
      r.highestAcademicQualification || "-",
      r.researcherType || "-",
      r.status || "pending",
    ];

    y = drawResearchersRow(doc, tableStartX, y, columns, row);
  });

  if (researchers.length === 0) {
    doc.fillColor("#6B7280").font("Helvetica").fontSize(11).text("No researcher records found for the selected filters.", MARGIN, y + 18);
  }

  doc.end();
}

/**
 * Pipe an admin overview analytics report PDF to the given response stream.
 * @param {object} analytics - Analytics payload from analyticsService.getDashboardStats
 * @param {object} res - Express response object (stream)
 * @param {number} days - Number of days used for trend generation
 */
function pipeOverviewReportToResponse(analytics, res, days) {
  const filename = `admin-overview-report-${new Date().toISOString().slice(0, 10)}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const doc = new PDFDocument({ margin: MARGIN });
  doc.pipe(res);

  const summary = analytics?.summary || {};
  const userRoles = analytics?.userRoles || {};
  const qualifications = Array.isArray(analytics?.qualifications) ? analytics.qualifications : [];

  drawOverviewBanner(doc, "HealthLab Overview Summary", toIsoLocal(new Date()), days);

  drawKpiCards(doc, [
    { label: "Total Users", value: Number(summary.totalUsers || 0) },
    { label: "Total Researchers", value: Number(summary.totalResearchers || 0) },
    { label: "Pending Researchers", value: Number(summary.pendingResearchers || 0) },
    { label: "Approved Researchers", value: Number(summary.approvedResearchers || 0) },
    { label: "Rejected Researchers", value: Number(summary.rejectedResearchers || 0) },
    { label: "New Users This Week", value: Number(summary.newUsersThisWeek || 0) },
    { label: "Growth Rate", value: `${Number(summary.growthRate || 0)}%` },
  ]);

  const totalRoleCount = Object.values(userRoles).reduce((sum, value) => sum + Number(value || 0), 0);
  const roleDistributionPercentRows = Object.entries(userRoles).map(([name, value]) => {
    const count = Number(value || 0);
    const pct = totalRoleCount > 0 ? ((count / totalRoleCount) * 100) : 0;
    return `${name} - ${pct.toFixed(1)}%`;
  });

  drawSimpleListSection(
    doc,
    "User Role Distribution",
    roleDistributionPercentRows,
    "No role distribution data available."
  );

  const topQualificationLines = qualifications.slice(0, 8).map((row) => (
    `${row?.name || "Unspecified"} - ${Number(row?.count || 0)}`
  ));

  drawSimpleListSection(
    doc,
    "Top Qualifications",
    topQualificationLines,
    "No qualification data available."
  );

  doc.end();
}

module.exports = {
  pipeResearchersReportToResponse,
  pipeOverviewReportToResponse,
};
