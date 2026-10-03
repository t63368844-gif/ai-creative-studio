// src/html.ts — Tool: render_html
// Self-contained reveal.js page. Design space is a fixed 1280x720 canvas;
// reveal.js scales it to ANY viewport (phone, tablet, desktop) — this is why
// the old ai-worker-html-generator looked correct on mobile and this must too.
import type { BrandPreset, ContentPayload, SlideContent } from "./types";
import { getIllustration } from "./svg";
import { renderChart } from "./charts";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildSlide(slide: SlideContent, brand: BrandPreset, index: number, total: number): string {
  const illustration = getIllustration(slide.illustration || "star", brand);
  const chartSvg = renderChart(slide, brand);
  const hasChart = !!slide.chart && !!chartSvg;
  const title = `<h2>${escapeHtml(slide.title)}</h2>`;
  const sub = slide.subtitle ? `<p class="subtitle">${escapeHtml(slide.subtitle)}</p>` : "";
  const bullets = `<ul class="bullets">${slide.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>`;

  let inner: string;
  if (hasChart) {
    inner = `<div class="row"><div class="col text">${title}${sub}${bullets}</div><div class="col visual">${chartSvg}<div class="illus-mini">${illustration}</div></div></div>`;
  } else if (brand.layout === "centered") {
    inner = `<div class="centered">${illustration}${title}${sub}${bullets}</div>`;
  } else if (brand.layout === "fullbleed") {
    inner = `<div class="row"><div class="col visual big">${illustration}</div><div class="col text">${title}${sub}${bullets}</div></div>`;
  } else {
    inner = `<div class="row"><div class="col text">${title}${sub}${bullets}</div><div class="col visual">${illustration}</div></div>`;
  }

  return `
    <section class="slide">
      ${inner}
      <footer class="slide-footer"><span>${escapeHtml(brand.name)}</span><span>${index + 2} / ${total + 1}</span></footer>
    </section>`;
}

export function renderHtml(content: ContentPayload, brand: BrandPreset): string {
  const total = content.slides.length + 1;
  const slidesHtml = content.slides
    .map((slide, i) => buildSlide(slide, brand, i, content.slides.length))
    .join("\n");

  const { palette: pal, fonts, radius, glassmorphism: glass } = brand;
  const panel = glass
    ? `background: linear-gradient(135deg, ${pal.primary}22, ${pal.secondary}22); border: 1.5px solid ${pal.primary}55;`
    : `background: ${pal.primary}0d; border: 1px solid ${pal.muted}33;`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(content.title)}</title>\n<!-- BRAND-SPEC: ${JSON.stringify(brand).replace(/-->/g, "")} -->\n/g, "")} -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.css"/>
<style>
:root {
  --bg: ${pal.background}; --text: ${pal.text}; --primary: ${pal.primary};
  --secondary: ${pal.secondary}; --accent: ${pal.accent}; --muted: ${pal.muted};
}
html, body { background: var(--bg); color: var(--text); font-family: ${fonts.body}; font-weight: ${fonts.bodyWeight}; }
.reveal { font-family: ${fonts.body}; }
.reveal .slides { text-align: left; }
.reveal .slides section.slide {
  ${panel}
  background-color: ${pal.background};
  border-radius: ${radius};
  padding: 56px 72px 64px;
  box-sizing: border-box;
  height: 100%;
  position: relative;
  overflow: hidden;
}
.reveal h1, .reveal h2 { font-family: ${fonts.heading}; font-weight: ${fonts.headingWeight}; color: var(--primary); }
.reveal h2 { font-size: 44px; line-height: 1.15; margin-bottom: 10px; }
.subtitle { font-size: 24px; color: var(--muted); margin-bottom: 14px; }
.bullets { list-style: none; margin: 16px 0 0; }
.bullets li { font-size: 26px; line-height: 1.5; padding-left: 36px; position: relative; color: var(--text); margin-bottom: 10px; }
.bullets li::before { content: "▸"; position: absolute; left: 0; color: var(--accent); font-weight: bold; }
.row { display: flex; gap: 44px; align-items: center; height: 100%; }
.col.text { flex: 1; min-width: 0; }
.col.visual { flex: 0 0 40%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; }
.illus-mini { width: 120px; opacity: .95; }
.col.visual.big { flex: 0 0 40%; }
.centered { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; height: 100%; gap: 12px; }
.centered .bullets { text-align: left; }
.slide-illustration { width: 100%; max-height: 420px; }
.centered .slide-illustration { max-height: 300px; }
.slide-chart { width: 100%; max-height: 430px; }
.slide-footer {
  position: absolute; left: 72px; right: 72px; bottom: 22px;
  display: flex; justify-content: space-between;
  font-size: 15px; color: var(--muted); letter-spacing: 1px; text-transform: uppercase;
  border-top: 1px solid ${pal.muted}33; padding-top: 10px;
}
.title-slide { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.title-slide h1 { font-size: 62px; margin-bottom: 14px; }
.title-slide p { font-size: 28px; color: var(--muted); }
.toolbar { position: fixed; top: 12px; right: 12px; z-index: 100; display: flex; gap: 8px; }
.toolbar button {
  padding: 8px 16px; border: 1.5px solid var(--primary); border-radius: ${radius};
  background: var(--bg); color: var(--primary); font-size: 14px; cursor: pointer;
}
.toolbar button:hover { background: var(--primary); color: var(--bg); }
@media print {
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .toolbar { display: none !important; }
}
</style>
</head>
<body>
<div class="toolbar">
  <button onclick="exportPdf()">📄 Export PDF</button>
  <button onclick="downloadHtml()">⬇ Download HTML</button>
  <button onclick="toggleOverview()">☰ Overview</button>
</div>
<div class="reveal"><div class="slides">
  <section class="slide title-slide">
    <h1>${escapeHtml(content.title)}</h1>
    <p>${escapeHtml(content.subtitle)}</p>
    <footer class="slide-footer"><span>${escapeHtml(brand.name)}</span><span>1 / ${total}</span></footer>
  </section>
  ${slidesHtml}
</div></div>
<script src="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.js"></script>
<script>
window.Reveal && window.window.Reveal && window.Reveal.initialize({
  width: 1280, height: 720,
  margin: 0.02, minScale: 0.15, maxScale: 2.5,
  controls: true, progress: true, center: false, hash: true,
  transition: "slide",
});
const PRISTINE = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
function downloadHtml() {
  const blob = new Blob([PRISTINE], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = document.title.replace(/[^a-z0-9]+/gi, "_") + ".html";
  a.click();
  URL.revokeObjectURL(a.href);
}
function exportPdf() {
  if ((location.protocol === "http:" || location.protocol === "https:") && !location.search.includes("print-pdf")) {
    location.search = "?print-pdf";
    return;
  }
  window.print(); // fallback для file:// и content:// — сразу печать
}
function toggleOverview() {
  if (window.Reveal) { window.Reveal.toggleOverview(); return; }
  document.body.classList.toggle("overview-grid");
}
if (location.search.includes("print-pdf")) {
  window.addEventListener("load", () => setTimeout(() => window.print(), 600));
}
</script>
</body>
</html>`;
}
