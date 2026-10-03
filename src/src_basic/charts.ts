// src/charts.ts — Tool: chart
// Renders vector SVG charts (bar/line/pie) with axes, tick labels,
// value labels, and legend. NEVER uses canvas/Chart.js.
import type { BrandPreset, SlideContent } from "./types";

interface ChartColors {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  muted: string;
  background: string;
}

const SERIES_COLORS = ["primary", "secondary", "accent", "muted"];

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function getColor(palette: ChartColors, key: string): string {
  return (palette as unknown as Record<string, string>)[key] ?? palette.primary;
}

/**
 * Render a bar chart as SVG.
 */
function renderBarChart(
  labels: string[],
  series: { name: string; values: number[] }[],
  colors: ChartColors,
  title?: string,
): string {
  const W = 480, H = 300;
  const padL = 50, padR = 20, padT = title ? 40 : 20, padB = 50;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const maxVal = Math.max(...series.flatMap((s) => s.values), 1);
  const niceMax = Math.ceil(maxVal / 10) * 10 || 10;
  const groupCount = labels.length;
  const groupW = chartW / groupCount;
  const barW = (groupW * 0.7) / series.length;
  const yTicks = 5;

  let gridLines = "";
  let yLabels = "";
  for (let i = 0; i <= yTicks; i++) {
    const y = padT + chartH - (chartH * i) / yTicks;
    const val = Math.round((niceMax * i) / yTicks);
    gridLines += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="${colors.muted}" stroke-width="0.5" opacity="0.3"/>`;
    yLabels += `<text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="${colors.muted}">${val}</text>`;
  }

  let bars = "";
  let valueLabels = "";
  series.forEach((s, si) => {
    const color = getColor(colors, SERIES_COLORS[si % SERIES_COLORS.length]);
    s.values.forEach((v, vi) => {
      const barH = (v / niceMax) * chartH;
      const x = padL + vi * groupW + groupW * 0.15 + si * barW;
      const y = padT + chartH - barH;
      bars += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="${color}" rx="2"/>`;
      valueLabels += `<text x="${x + barW / 2}" y="${y - 4}" text-anchor="middle" font-size="9" fill="${colors.text}">${v}</text>`;
    });
  });

  let xLabels = "";
  labels.forEach((label, i) => {
    const x = padL + i * groupW + groupW / 2;
    xLabels += `<text x="${x}" y="${H - padB + 18}" text-anchor="middle" font-size="10" fill="${colors.text}">${escapeXml(label)}</text>`;
  });

  let legend = "";
  series.forEach((s, si) => {
    const color = getColor(colors, SERIES_COLORS[si % SERIES_COLORS.length]);
    legend += `<rect x="${padL + si * 90}" y="${padT - 23}" width="10" height="10" fill="${color}"/><text x="${padL + si * 90 + 14}" y="${padT - 14}" font-size="10" fill="${colors.text}">${escapeXml(s.name)}</text>`;
  });

  const titleEl = title ? `<text x="${W / 2}" y="18" text-anchor="middle" font-size="13" font-weight="bold" fill="${colors.text}">${escapeXml(title)}</text>` : "";

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="slide-chart" preserveAspectRatio="xMidYMid meet">
    ${titleEl}
    ${gridLines}
    ${yLabels}
    <line x1="${padL}" y1="${padT + chartH}" x2="${W - padR}" y2="${padT + chartH}" stroke="${colors.text}" stroke-width="1.5"/>
    <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + chartH}" stroke="${colors.text}" stroke-width="1.5"/>
    ${bars}
    ${valueLabels}
    ${xLabels}
    ${legend}
  </svg>`;
}

/**
 * Render a line chart as SVG.
 */
function renderLineChart(
  labels: string[],
  series: { name: string; values: number[] }[],
  colors: ChartColors,
  title?: string,
): string {
  const W = 480, H = 300;
  const padL = 50, padR = 20, padT = title ? 40 : 20, padB = 50;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const maxVal = Math.max(...series.flatMap((s) => s.values), 1);
  const niceMax = Math.ceil(maxVal / 10) * 10 || 10;
  const stepX = chartW / Math.max(labels.length - 1, 1);
  const yTicks = 5;

  let gridLines = "";
  let yLabels = "";
  for (let i = 0; i <= yTicks; i++) {
    const y = padT + chartH - (chartH * i) / yTicks;
    const val = Math.round((niceMax * i) / yTicks);
    gridLines += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="${colors.muted}" stroke-width="0.5" opacity="0.3"/>`;
    yLabels += `<text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="${colors.muted}">${val}</text>`;
  }

  let lines = "";
  let dots = "";
  let valueLabels = "";
  let legend = "";
  series.forEach((s, si) => {
    const color = getColor(colors, SERIES_COLORS[si % SERIES_COLORS.length]);
    let pathD = "";
    s.values.forEach((v, vi) => {
      const x = padL + vi * stepX;
      const y = padT + chartH - (v / niceMax) * chartH;
      pathD += (vi === 0 ? "M" : "L") + x + " " + y + " ";
      dots += `<circle cx="${x}" cy="${y}" r="3.5" fill="${color}" stroke="${colors.background}" stroke-width="1"/>`;
      valueLabels += `<text x="${x}" y="${y - 8}" text-anchor="middle" font-size="9" fill="${colors.text}">${v}</text>`;
    });
    lines += `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    legend += `<rect x="${padL + si * 90}" y="${padT - 23}" width="10" height="10" fill="${color}"/><text x="${padL + si * 90 + 14}" y="${padT - 14}" font-size="10" fill="${colors.text}">${escapeXml(s.name)}</text>`;
  });

  let xLabels = "";
  labels.forEach((label, i) => {
    const x = padL + i * stepX;
    xLabels += `<text x="${x}" y="${H - padB + 18}" text-anchor="middle" font-size="10" fill="${colors.text}">${escapeXml(label)}</text>`;
  });

  const titleEl = title ? `<text x="${W / 2}" y="18" text-anchor="middle" font-size="13" font-weight="bold" fill="${colors.text}">${escapeXml(title)}</text>` : "";

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="slide-chart" preserveAspectRatio="xMidYMid meet">
    ${titleEl}
    ${gridLines}
    ${yLabels}
    ${legend}
    <line x1="${padL}" y1="${padT + chartH}" x2="${W - padR}" y2="${padT + chartH}" stroke="${colors.text}" stroke-width="1.5"/>
    <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + chartH}" stroke="${colors.text}" stroke-width="1.5"/>
    ${lines}
    ${dots}
    ${valueLabels}
    ${xLabels}
  </svg>`;
}

/**
 * Render a pie chart as SVG.
 */
function renderPieChart(
  labels: string[],
  series: { name: string; values: number[] }[],
  colors: ChartColors,
  title?: string,
): string {
  const W = 480, H = 300;
  const cx = 160, cy = title ? 160 : 150;
  const r = 90;
  const padT = title ? 40 : 20;

  // Pie uses first series values
  const values = series[0]?.values ?? [];
  const total = values.reduce((a, b) => a + b, 0) || 1;

  let slices = "";
  let labelLines = "";
  let legend = "";
  let cumulativeAngle = -Math.PI / 2;

  values.forEach((v, i) => {
    const angle = (v / total) * 2 * Math.PI;
    const x1 = cx + Math.cos(cumulativeAngle) * r;
    const y1 = cy + Math.sin(cumulativeAngle) * r;
    const x2 = cx + Math.cos(cumulativeAngle + angle) * r;
    const y2 = cy + Math.sin(cumulativeAngle + angle) * r;
    const largeArc = angle > Math.PI ? 1 : 0;
    const color = getColor(colors, SERIES_COLORS[i % SERIES_COLORS.length]);

    slices += `<path d="M${cx} ${cy} L${x1} ${y1} A${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${color}" stroke="${colors.background}" stroke-width="1.5"/>`;

    // Percentage label
    const midAngle = cumulativeAngle + angle / 2;
    const labelR = r * 0.65;
    const lx = cx + Math.cos(midAngle) * labelR;
    const ly = cy + Math.sin(midAngle) * labelR;
    const pct = Math.round((v / total) * 100);
    labelLines += `<text x="${lx}" y="${ly + 4}" text-anchor="middle" font-size="11" font-weight="bold" fill="${colors.background}">${pct}%</text>`;

    // Legend
    const legendY = padT + 20 + i * 22;
    legend += `<rect x="290" y="${legendY}" width="12" height="12" fill="${color}"/><text x="310" y="${legendY + 10}" font-size="11" fill="${colors.text}">${escapeXml(labels[i] || "")}: ${v}</text>`;

    cumulativeAngle += angle;
  });

  const titleEl = title ? `<text x="${W / 2}" y="18" text-anchor="middle" font-size="13" font-weight="bold" fill="${colors.text}">${escapeXml(title)}</text>` : "";

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="slide-chart" preserveAspectRatio="xMidYMid meet">
    ${titleEl}
    ${slices}
    ${labelLines}
    ${legend}
  </svg>`;
}

/**
 * Render a chart for a slide if it has chart data.
 * Returns SVG string or empty string if no chart.
 */
export function renderChart(slide: SlideContent, brand: BrandPreset): string {
  if (!slide.chart) return "";

  const colors: ChartColors = {
    primary: brand.palette.primary,
    secondary: brand.palette.secondary,
    accent: brand.palette.accent,
    text: brand.palette.text,
    muted: brand.palette.muted,
    background: brand.palette.background,
  };

  const { type, labels, series, title } = slide.chart;
  switch (type) {
    case "bar":
      return renderBarChart(labels, series, colors, title);
    case "line":
      return renderLineChart(labels, series, colors, title);
    case "pie":
      return renderPieChart(labels, series, colors, title);
    default:
      return renderBarChart(labels, series, colors, title);
  }
}
