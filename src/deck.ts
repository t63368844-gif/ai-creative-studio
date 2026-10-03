import type { ContentPayload, BrandPreset } from "./types";
import { getIllustration } from "./svg";

function esc(s: string): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function lum(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

export function renderDeck(content: ContentPayload, brand: BrandPreset): string {
  const p = (brand.palette || {}) as Record<string, string>;
  const bg = p.background || "#0b0d16";
  const ink = p.text || "#f4ead8";
  const gold = p.accent || p.primary || "#c9a227";
  const sea = p.secondary || p.primary || gold;
  const dark = lum(bg) < 0.45;

  const panel = dark
    ? "linear-gradient(180deg, rgba(11,13,22,.94), rgba(11,13,22,.99))"
    : "linear-gradient(180deg, rgba(255,252,245,.96), rgba(255,250,240,.99))";
  const chip = dark ? "rgba(11,13,22,.65)" : "rgba(255,252,245,.85)";
  const tagBg = dark ? "rgba(244,234,216,.92)" : "rgba(11,13,22,.85)";
  const tagInk = dark ? sea : "#f4ead8";

  const slides = (content.slides || []).map((s: any, i: number) => {
    const bullets: string[] = Array.isArray(s.bullets) ? s.bullets : [];
    const compact = bullets.length > 4 ? " compact" : "";
    const art = s.imageUrl
      ? `<div class="art imgart" style="background-image:url('${esc(s.imageUrl)}')"></div>`
      : `<div class="art">${getIllustration(s.illustration || "star", brand)}</div>`;
    return `<div class="slide${compact}">
<span class="voyage-no">${i + 1}</span>
${art}
<div class="txt">
<span class="tag">${esc(brand.name || "deck")}</span>
<h2>${esc(s.title)}</h2>
${s.body ? `<p>${esc(s.body)}</p>` : ""}
${bullets.length ? `<ul>${bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
</div>
</div>`;
  }).join("\n\n");

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
<title>${esc(content.title)}</title>
<style>
:root { --ink:${bg}; --paper:${ink}; --gold:${gold}; --sea:${sea}; --panel:${panel}; --chip:${chip}; --tagbg:${tagBg}; --tagink:${tagInk}; }
* { margin:0; padding:0; box-sizing:border-box; }
html,body { height:100%; background:var(--ink); color:var(--paper); font-family:Georgia,"Times New Roman",serif; overflow:hidden; }
.slide { position:fixed; inset:0; display:none; flex-direction:column; }
.slide.active { display:flex; }
.art { flex:0 0 46vh; display:flex; align-items:center; justify-content:center; border-bottom:2px solid var(--gold); background:rgba(128,128,128,.08); overflow:hidden; }
.art svg { width:min(92%, 560px); height:auto; max-height:100%; }
.imgart { background-size:contain; background-position:center; background-repeat:no-repeat; background-color:var(--ink); }
.txt { flex:1; padding:18px 20px calc(84px + env(safe-area-inset-bottom)); overflow-y:auto; background:var(--panel); }
.tag { display:inline-block; font-size:.72rem; letter-spacing:.1em; text-transform:uppercase; color:var(--tagink); background:var(--tagbg); padding:3px 10px; border-radius:12px; margin-bottom:10px; }
h2 { color:var(--gold); font-size:clamp(1.35rem,5.4vw,2.3rem); line-height:1.2; margin-bottom:.5em; }
p { font-size:clamp(1.02rem,3.9vw,1.3rem); line-height:1.62; }
.voyage-no { position:fixed; top:calc(10px + env(safe-area-inset-top)); left:14px; font-size:.85rem; color:var(--gold); background:var(--chip); padding:3px 9px; border-radius:10px; z-index:5; }
.counter { position:fixed; top:calc(10px + env(safe-area-inset-top)); right:14px; font-size:.85rem; color:var(--paper); background:var(--chip); padding:4px 10px; border-radius:12px; z-index:5; }
.nav { position:fixed; bottom:calc(14px + env(safe-area-inset-bottom)); right:14px; display:flex; gap:10px; z-index:9; }
.nav button { width:54px; height:54px; border-radius:50%; border:1px solid var(--gold); background:var(--chip); color:var(--gold); font-size:1.5rem; }
.txt ul { list-style:none; margin-top:10px; }
.txt li { font-size:clamp(.95rem,3.6vw,1.18rem); line-height:1.5; margin-bottom:9px; padding-left:22px; position:relative; }
.txt li::before { content:"—"; position:absolute; left:0; color:var(--gold); }
.compact .art { flex-basis:32vh; }
.compact h2 { font-size:clamp(1.1rem,4.2vw,1.6rem); margin-bottom:.35em; }
.compact .txt li { font-size:clamp(.8rem,2.9vw,1rem); line-height:1.35; margin-bottom:6px; }
@media (min-width:900px) and (orientation:landscape) {
  .art { position:absolute; inset:0; flex:none; z-index:0; border:none; }
  .imgart { background-size:cover; }
  .txt { position:relative; z-index:1; max-width:660px; margin:auto 6vw; border-left:4px solid var(--gold); border-radius:6px; padding:26px 32px; overflow:visible; }
}
</style>
</head>
<body>

${slides}

<div class="counter" id="ctr"></div>
<div class="nav"><button id="prev" aria-label="назад">‹</button><button id="next" aria-label="вперёд">›</button></div>

<script>
var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
var i = 0;
function show(n) {
  i = (n + slides.length) % slides.length;
  for (var k = 0; k < slides.length; k++) slides[k].classList.toggle('active', k === i);
  document.getElementById('ctr').textContent = (i + 1) + ' / ' + slides.length;
}
var h = parseInt((location.hash || '').replace('#', ''), 10);
show(isNaN(h) ? 0 : h - 1);
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
</script>
</body>
</html>`;
}
