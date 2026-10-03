// src/verify.ts — quality gate: сверяет результат с техзаданием
import type { BrandPreset, ContentPayload } from "./types";
export interface Check { name: string; ok: boolean; detail: string; }
function lum(hex: string): number {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16), g = parseInt(m.slice(2, 4), 16), b = parseInt(m.slice(4, 6), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}
export function verify(
  spec: { topic: string; slideCount: number; style: string },
  content: ContentPayload,
  brand: BrandPreset,
  html?: string,
  pdf?: Uint8Array,
): Check[] {
  const checks: Check[] = [];
  const n = content.slides.length;
  checks.push({ name: "slides_count", ok: Math.abs(n - spec.slideCount) <= 1, detail: `${n} vs requested ${spec.slideCount}` });
  const empty = content.slides.filter((s) => !s.bullets || s.bullets.filter((b) => b.trim()).length < 2).length;
  checks.push({ name: "bullets_non_empty", ok: empty === 0, detail: empty ? `${empty} slides with empty bullets` : "all slides >=2 bullets" });
  const noVisual = content.slides.filter((s) => !s.chart && !s.illustration).length;
  checks.push({ name: "visual_every_slide", ok: noVisual === 0, detail: noVisual ? `${noVisual} slides w/o visual` : "chart or illustration on every slide" });
  const contrast = Math.abs(lum(brand.palette.text) - lum(brand.palette.background));
  checks.push({ name: "text_contrast", ok: contrast > 0.35, detail: `contrast ${contrast.toFixed(2)}` });
  const footers = html ? (html.match(/slide-footer/g) || []).length : 0;
  checks.push({ name: "html_footers", ok: !html || footers >= n, detail: html ? `${footers} footers / ${n} slides` : "no html requested" });
  checks.push({ name: "pdf_under_300kb", ok: !pdf || pdf.length < 300 * 1024, detail: pdf ? `${(pdf.length / 1024).toFixed(0)} KB` : "no pdf requested" });
  return checks;
}
