// src/html.ts — самодостаточный мобильный движок дека (без CDN) + print-PDF 1280x720
import type { BrandPreset, ContentPayload } from "./types";
import { renderChart } from "./charts";
import { renderIllustration } from "./svg";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderHtml(content: ContentPayload, brand: BrandPreset): string {
  const pal = brand.palette;
  const fonts = brand.fonts;

  const artBand = (s: any): string => {
    if (s.imageUrl && (s.imageMode ?? "backdrop") === "backdrop")
      return `<div class="art" style="background-image:url('${esc(s.imageUrl)}')"></div>`;
    return `<div class="art svgart">${renderIllustration(s.illustration || "star", brand)}</div>`;
  };

  const titleSlide = `
<div class="slide title active">
  <div class="txt">
    <span class="tag">${esc(brand.name)} • ${esc(content.title)}</span>
    <h1>${esc(content.title)}</h1>
    <p class="sub">${esc(content.subtitle || "")}</p>
  </div>
</div>`;

  const body = content.slides.map((s: any) => {
    const bullets = (s.bullets || []).map((b: string) => `<li>${esc(b)}</li>`).join("");
    const chart = s.chart ? `<div class="chart">${renderChart(s.chart, brand)}</div>` : "";
    const sticker = s.imageUrl && s.imageMode === "sticker"
      ? `<figure class="sticker"><img src="${esc(s.imageUrl)}" alt=""/></figure>` : "";
    const notes = s.notes ? `<p class="notes">${esc(s.notes)}</p>` : "";
    return `
<div class="slide">
  ${artBand(s)}
  <div class="txt">
    <span class="tag">${esc(brand.name)}</span>
    <h2>${esc(s.title)}</h2>
    <ul>${bullets}</ul>
    ${chart}${sticker}${notes}
  </div>
</div>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
<title>${esc(content.title)}</title>
<!-- BRAND-SPEC: ${JSON.stringify(brand).replace(/-->/g, "")} -->
<style>
:root { --paper:${pal.text}; --gold:${pal.accent}; --sea:${pal.primary}; --ink:${pal.background}; }
* { margin:0; padding:0; box-sizing:border-box; }
html,body { height:100%; background:var(--ink); color:var(--paper);
  font-family:${fonts.body}; overflow:hidden; }
h1,h2 { font-family:${fonts.heading}; }
.slide { position:fixed; inset:0; display:none; flex-direction:column; }
.slide.active { display:flex; }
.art { flex:0 0 52vh; background-size:contain; background-position:center;
  background-repeat:no-repeat; background-color:var(--ink); border-bottom:2px solid var(--gold); }
.art.svgart svg { width:100%; height:100%; }
.txt { flex:1; padding:16px 20px calc(84px + env(safe-area-inset-bottom)); overflow-y:auto;
  background:linear-gradient(180deg, ${pal.background}F0, ${pal.background}FA); }
.tag { display:inline-block; font-size:.7rem; letter-spacing:.1em; text-transform:uppercase;
  color:var(--ink); background:${pal.text}E6; padding:3px 10px; border-radius:12px; margin-bottom:10px; }
h1 { color:var(--gold); font-size:clamp(1.7rem,7vw,3rem); line-height:1.15; }
h2 { color:var(--gold); font-size:clamp(1.3rem,5.2vw,2.2rem); line-height:1.2; margin-bottom:.45em; }
.sub { font-size:clamp(1rem,4vw,1.3rem); opacity:.85; margin-top:.6em; }
ul { list-style:none; }
li { font-size:clamp(.98rem,3.8vw,1.22rem); line-height:1.5; margin-bottom:8px; padding-left:22px; position:relative; }
li::before { content:"—"; position:absolute; left:0; color:var(--gold); }
.chart svg { width:100%; max-height:240px; margin-top:10px; }
.sticker img { max-width:46%; float:right; margin:0 0 8px 12px; border-radius:8px; border:1px solid var(--gold); }
.notes { font-size:.85em; opacity:.8; font-style:italic; margin-top:10px; }
.slide.title .txt { display:flex; flex-direction:column; justify-content:center; padding-bottom:calc(40px + env(safe-area-inset-bottom)); }
.counter { position:fixed; top:calc(10px + env(safe-area-inset-top)); right:14px; font-size:.85rem;
  color:var(--paper); background:${pal.background}A6; padding:4px 10px; border-radius:12px; z-index:5; }
.nav { position:fixed; bottom:calc(14px + env(safe-area-inset-bottom)); right:14px; display:flex; gap:10px; z-index:9; }
.util { position:fixed; bottom:calc(14px + env(safe-area-inset-bottom)); left:14px; display:flex; gap:10px; z-index:9; }
.nav button,.util button { width:52px; height:52px; border-radius:50%; border:1px solid var(--gold);
  background:${pal.background}B8; color:var(--gold); font-size:1.35rem; }
@media (min-width: 900px) and (orientation: landscape) {
  .art { position:absolute; inset:0; flex:none; z-index:0; border:none; background-size:cover; }
  .txt { position:relative; z-index:1; max-width:660px; margin:auto 6vw;
    background:${pal.background}D2; border-left:4px solid var(--gold); border-radius:6px; padding:24px 32px; overflow:visible; }
}
@media print {
  html,body { overflow:visible; height:auto; background:#fff; }
  .nav,.util,.counter { display:none !important; }
  .slide { position:static; display:block !important; width:1280px; height:720px;
    page-break-after:always; overflow:hidden; background:var(--ink); }
  .slide .art { position:absolute; inset:0; flex:none; height:720px; border:none; background-size:cover; }
  .slide .art.svgart { background:none; } .slide .art.svgart svg { width:1280px; height:720px; opacity:.22; }
  .slide .txt { position:absolute; left:70px; top:110px; max-width:620px; margin:0;
    background:${pal.background}D9; border-left:4px solid var(--gold); border-radius:6px; padding:24px 30px; overflow:hidden; }
  .slide.title .txt { left:0; right:0; top:240px; margin:0 auto; max-width:900px; background:none; border:none; text-align:center; }
  * { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
}
</style>
</head>
<body>
${titleSlide}
${body}
<div class="counter" id="ctr"></div>
<div class="util"><button onclick="exportPdf()" aria-label="pdf">⎙</button><button onclick="downloadHtml()" aria-label="save">⤓</button></div>
<div class="nav"><button id="prev" aria-label="назад">‹</button><button id="next" aria-label="вперёд">›</button></div>
<script>
var PRISTINE = "<!DOCTYPE html>\\n" + document.documentElement.outerHTML;
var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
var i = 0;
function show(n) {
  i = (n + slides.length) % slides.length;
  for (var k = 0; k < slides.length; k++) slides[k].classList.toggle('active', k === i);
  document.getElementById('ctr').textContent = (i + 1) + ' / ' + slides.length;
}
show(0);
document.getElementById('next').onclick = function () { show(i + 1); };
document.getElementById('prev').onclick = function () { show(i - 1); };
var x0 = null;
document.addEventListener('touchstart', function (e) { x0 = e.changedTouches[0].clientX; }, { passive: true });
document.addEventListener('touchend', function (e) {
  if (x0 === null) return;
  var dx = e.changedTouches[0].clientX - x0;
  if (Math.abs(dx) > 40) show(i + (dx < 0 ? 1 : -1));
  x0 = null;
}, { passive: true });
document.addEventListener('keydown', function (e) {
  if (e.key === 'ArrowRight' || e.key === ' ') show(i + 1);
  if (e.key === 'ArrowLeft') show(i - 1);
});
function exportPdf() { window.print(); }
function downloadHtml() {
  var b = new Blob([PRISTINE], { type: 'text/html' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = document.title.replace(/[^a-z0-9]+/gi, '_') + '.html';
  a.click();
  URL.revokeObjectURL(a.href);
}
</script>
</body>
</html>`;
}
