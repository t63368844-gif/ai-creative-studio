// src/pdf.ts — Tool: render_pdf
// Renders a branded 16:9 PDF via Browser Rendering (Puppeteer).
// Direct download (Content-Disposition: attachment).
//
// HARD PDF HYGIENE RULES (learned in production):
// - NO backdrop-filter, NO blurred box-shadow, NO canvas in PDF HTML
// - glassmorphism = translucent gradients + crisp 1-2px borders ONLY
// - all decoration must be vector; target: 8-slide PDF under 300 KB
import puppeteer from "@cloudflare/puppeteer";
import type { BrandPreset, ContentPayload, SlideContent, ToolContext, ToolResult } from "./types";
import { getIllustration } from "./svg";
import { renderChart } from "./charts";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildPdfSlide(
  slide: SlideContent,
  brand: BrandPreset,
  index: number,
  total: number,
): string {
  const illustration = getIllustration(slide.illustration || "star", brand);
  const chartSvg = renderChart(slide, brand);
  const hasChart = !!slide.chart && !!chartSvg;

  let inner: string;
  if (hasChart) {
    inner = `
      <div class="content chart-layout">
        <div class="text">
          <h2>${escapeHtml(slide.title)}</h2>
          ${slide.subtitle ? `<p class="subtitle">${escapeHtml(slide.subtitle)}</p>` : ""}
          <ul>${slide.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("\n")}</ul>
        </div>
        <div class="visual">${chartSvg}<div class="illus-mini">${illustration}</div></div>
      </div>`;
  } else if (brand.layout === "centered") {
    inner = `
      <div class="content centered">
        <div class="illus-wrap">${illustration}</div>
        <h2>${escapeHtml(slide.title)}</h2>
        ${slide.subtitle ? `<p class="subtitle">${escapeHtml(slide.subtitle)}</p>` : ""}
        <ul>${slide.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("\n")}</ul>
      </div>`;
  } else if (brand.layout === "fullbleed") {
    inner = `
      <div class="content fullbleed">
        <div class="illus-wrap">${illustration}</div>
        <div class="text">
          <h2>${escapeHtml(slide.title)}</h2>
          ${slide.subtitle ? `<p class="subtitle">${escapeHtml(slide.subtitle)}</p>` : ""}
          <ul>${slide.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("\n")}</ul>
        </div>
      </div>`;
  } else {
    inner = `
      <div class="content split">
        <div class="text">
          <h2>${escapeHtml(slide.title)}</h2>
          ${slide.subtitle ? `<p class="subtitle">${escapeHtml(slide.subtitle)}</p>` : ""}
          <ul>${slide.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("\n")}</ul>
        </div>
        <div class="illus-wrap">${illustration}</div>
      </div>`;
  }

  return `
    <div class="page">
      ${inner}
      <div class="footer">
        <span class="brand">${escapeHtml(brand.name)}</span>
        <span class="page-num">${index + 2} / ${total + 1}</span>
      </div>
    </div>`;
}

/**
 * Build the full HTML string for PDF rendering.
 * This HTML is loaded into Puppeteer and printed to PDF.
 * It follows all hard PDF hygiene rules: no backdrop-filter, no canvas,
 * no blurred shadows — only vector decoration and translucent gradients.
 */
export function buildPdfHtml(content: ContentPayload, brand: BrandPreset): string {
  const slidesHtml = content.slides
    .map((slide, i) => buildPdfSlide(slide, brand, i, content.slides.length))
    .join("\n");

  const bg = brand.palette.background;
  const textCol = brand.palette.text;
  const primary = brand.palette.primary;
  const secondary = brand.palette.secondary;
  const accent = brand.palette.accent;
  const muted = brand.palette.muted;
  const radius = brand.radius;
  const headingFont = brand.fonts.heading;
  const bodyFont = brand.fonts.body;
  const headingWeight = brand.fonts.headingWeight;
  const bodyWeight = brand.fonts.bodyWeight;
  const glass = brand.glassmorphism;

  // Glassmorphism: translucent gradients + crisp 1-2px borders ONLY
  // NO backdrop-filter, NO blurred box-shadow
  const panelStyle = glass
    ? `background: ${primary}1f; border: 1.5px solid ${primary}55;`
    : `background: ${primary}08; border: 1px solid ${muted}22;`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
@page {
  size: 1280px 720px;
  margin: 0;
}
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
  color-adjust: exact !important;
}
body {
  background: ${bg};
  color: ${textCol};
  font-family: ${bodyFont};
  font-weight: ${bodyWeight};
}
.page {
  width: 1280px;
  height: 720px;
  padding: 56px 64px;
  ${panelStyle}
  border-radius: ${radius};
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  page-break-after: always;
  overflow: hidden;
}
.page:last-child {
  page-break-after: auto;
}
.content {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 36px;
}

/* Split layout */
.split .text { flex: 1; }
.split .illus-wrap { flex: 0 0 36%; display: flex; align-items: center; justify-content: center; }

/* Centered layout */
.centered { flex-direction: column; text-align: center; gap: 18px; }
.centered .illus-wrap { max-width: 320px; }

/* Fullbleed layout */
.fullbleed { flex-direction: row; }
.fullbleed .illus-wrap { flex: 0 0 32%; }
.fullbleed .text { flex: 1; }

/* Chart layout */
.chart-layout .text { flex: 1; }
.chart-layout .visual { flex: 0 0 42%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; }
.illus-mini { width: 110px; opacity: .95; }

h2 {
  font-family: ${headingFont};
  font-weight: ${headingWeight};
  font-size: 32px;
  color: ${primary};
  margin-bottom: 14px;
  line-height: 1.2;
}
.subtitle {
  font-size: 18px;
  color: ${muted};
  margin-bottom: 18px;
}
ul {
  list-style: none;
  padding: 0;
}
ul li {
  font-size: 16px;
  line-height: 1.7;
  padding-left: 22px;
  position: relative;
  color: ${textCol};
}
ul li::before {
  content: "▸";
  position: absolute;
  left: 0;
  color: ${accent};
  font-weight: bold;
}

.slide-illustration {
  width: 100%;
  height: auto;
  max-height: 360px;
}
.slide-chart {
  width: 100%;
  height: auto;
  max-height: 260px;
}

.footer {
  position: absolute;
  bottom: 20px;
  left: 64px;
  right: 64px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: ${muted};
  border-top: 1px solid ${muted}22;
  padding-top: 8px;
}
.brand { text-transform: uppercase; letter-spacing: 1px; }
.page-num { font-variant-numeric: tabular-nums; }

/* Title slide */
.title-page {
  text-align: center;
  justify-content: center;
}
.title-page h1 {
  font-family: ${headingFont};
  font-weight: ${headingWeight};
  font-size: 44px;
  color: ${primary};
  margin-bottom: 16px;
}
.title-page .subtitle {
  font-size: 22px;
  color: ${muted};
}
</style>
</head>
<body>
  <!-- Title slide -->
  <div class="page title-page">
    <div>
      <h1>${escapeHtml(content.title)}</h1>
      <p class="subtitle">${escapeHtml(content.subtitle)}</p>
    </div>
    <div class="footer">
      <span class="brand">${escapeHtml(brand.name)}</span>
      <span class="page-num">1 / ${content.slides.length + 1}</span>
    </div>
  </div>

  ${slidesHtml}
</body>
</html>`;
}

/**
 * Render PDF via Browser Rendering (Puppeteer).
 * Returns PDF bytes as Uint8Array.
 */
export async function renderPdf(
  ctx: ToolContext,
  content: ContentPayload,
  brand: BrandPreset,
): Promise<ToolResult<Uint8Array>> {
  const { env, emit } = ctx;
  emit({ step: "render_pdf", message: "Launching Browser Rendering…", timestamp: Date.now() });

  try {
    const html = buildPdfHtml(content, brand);

    // Launch Puppeteer via Browser Rendering binding
    const browser = await puppeteer.launch(env.BROWSER);
    const page = await browser.newPage();

    // Set 16:9 viewport
    await page.setViewport({ width: 1280, height: 720 });

    // Load HTML content directly
    await page.setContent(html, { waitUntil: "networkidle0" });

    // Generate PDF with exact dimensions
    const pdfBuffer = await page.pdf({
      width: "1280px",
      height: "720px",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    await browser.close();

    const pdfBytes = new Uint8Array(pdfBuffer);
    console.log("PDF rendered:", pdfBytes.length, "bytes");

    emit({
      step: "render_pdf",
      message: `PDF ready (${(pdfBytes.length / 1024).toFixed(0)} KB)`,
      data: { size: pdfBytes.length },
      timestamp: Date.now(),
    });
    return { success: true, data: pdfBytes };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: `PDF rendering failed: ${msg}` };
  }
}
