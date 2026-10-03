// src/svg.ts — Tool: illustrate
// Inline vector SVG scenes chosen by keyword, tinted in brand colors.
// Also supports optional AI raster illustrations (opt-in only).
import type { BrandPreset, SlideContent, ToolContext, ToolResult } from "./types";

interface SvgParams {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  muted: string;
}

// ── Vector illustration library ────────────────────────────────
// Each function returns an inline SVG string tinted with brand colors.
function svgWrap(inner: string, id: string): string {
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="slide-illustration" data-keyword="${id}" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;
}

const ILLUSTRATIONS: Record<string, (p: SvgParams) => string> = {
  rocket: (p) => svgWrap(`
    <defs><linearGradient id="rg-${p.primary.replace('#','')}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${p.primary}"/><stop offset="100%" stop-color="${p.secondary}"/>
    </linearGradient></defs>
    <path d="M100 20 C120 40, 130 70, 120 110 L80 110 C70 70, 80 40, 100 20 Z" fill="url(#rg-${p.primary.replace('#','')})" stroke="${p.text}" stroke-width="1.5"/>
    <circle cx="100" cy="70" r="12" fill="${p.accent}" stroke="${p.text}" stroke-width="1.5"/>
    <path d="M80 110 L65 140 L80 130 Z" fill="${p.secondary}" stroke="${p.text}" stroke-width="1"/>
    <path d="M120 110 L135 140 L120 130 Z" fill="${p.secondary}" stroke="${p.text}" stroke-width="1"/>
    <path d="M85 125 Q100 160, 115 125" fill="none" stroke="${p.accent}" stroke-width="2"/>
    <path d="M90 135 Q100 165, 110 135" fill="none" stroke="${p.accent}" stroke-width="1.5" opacity="0.6"/>
  `, "rocket"),

  sun: (p) => svgWrap(`
    <circle cx="100" cy="100" r="40" fill="${p.accent}" stroke="${p.text}" stroke-width="2"/>
    ${Array.from({ length: 12 }, (_, i) => {
      const a = (i * 30) * Math.PI / 180;
      const x1 = 100 + Math.cos(a) * 50, y1 = 100 + Math.sin(a) * 50;
      const x2 = 100 + Math.cos(a) * 70, y2 = 100 + Math.sin(a) * 70;
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${p.primary}" stroke-width="3" stroke-linecap="round"/>`;
    }).join("")}
  `, "sun"),

  heart: (p) => svgWrap(`
    <path d="M100 170 C60 140, 30 110, 30 80 C30 55, 50 40, 70 40 C85 40, 95 50, 100 60 C105 50, 115 40, 130 40 C150 40, 170 55, 170 80 C170 110, 140 140, 100 170 Z"
      fill="${p.primary}" stroke="${p.text}" stroke-width="2"/>
    <path d="M100 170 C70 145, 50 120, 50 95 C50 75, 60 65, 75 65" fill="none" stroke="${p.accent}" stroke-width="2" opacity="0.5"/>
  `, "heart"),

  book: (p) => svgWrap(`
    <path d="M40 40 L100 55 L160 40 L160 160 L100 170 L40 160 Z" fill="${p.primary}" stroke="${p.text}" stroke-width="2"/>
    <path d="M100 55 L100 170" fill="none" stroke="${p.text}" stroke-width="1.5"/>
    <path d="M55 60 L90 68 M55 80 L90 88 M55 100 L90 108" stroke="${p.muted}" stroke-width="1.5"/>
    <path d="M110 68 L145 60 M110 88 L145 80 M110 108 L145 100" stroke="${p.muted}" stroke-width="1.5"/>
  `, "book"),

  guitar: (p) => svgWrap(`
    <ellipse cx="130" cy="130" rx="40" ry="50" fill="${p.primary}" stroke="${p.text}" stroke-width="2"/>
    <circle cx="130" cy="130" r="12" fill="${p.background}" stroke="${p.text}" stroke-width="1.5"/>
    <rect x="80" y="30" width="8" height="100" fill="${p.secondary}" stroke="${p.text}" stroke-width="1" transform="rotate(15 84 80)"/>
    <rect x="75" y="25" width="18" height="12" fill="${p.accent}" stroke="${p.text}" stroke-width="1" transform="rotate(15 84 31)"/>
  `, "guitar"),

  chart: (p) => svgWrap(`
    <rect x="30" y="120" width="25" height="50" fill="${p.primary}"/>
    <rect x="65" y="90" width="25" height="80" fill="${p.secondary}"/>
    <rect x="100" y="60" width="25" height="110" fill="${p.accent}"/>
    <rect x="135" y="100" width="25" height="70" fill="${p.primary}" opacity="0.6"/>
    <line x1="20" y1="170" x2="170" y2="170" stroke="${p.text}" stroke-width="2"/>
    <line x1="20" y1="30" x2="20" y2="170" stroke="${p.text}" stroke-width="2"/>
  `, "chart"),

  lightbulb: (p) => svgWrap(`
    <path d="M100 30 C70 30, 55 55, 55 80 C55 100, 70 110, 75 125 L125 125 C130 110, 145 100, 145 80 C145 55, 130 30, 100 30 Z"
      fill="${p.accent}" stroke="${p.text}" stroke-width="2"/>
    <rect x="78" y="125" width="44" height="8" fill="${p.secondary}" stroke="${p.text}" stroke-width="1"/>
    <rect x="82" y="133" width="36" height="6" fill="${p.secondary}" stroke="${p.text}" stroke-width="1"/>
    <line x1="100" y1="50" x2="100" y2="100" stroke="${p.text}" stroke-width="1.5" opacity="0.3"/>
  `, "lightbulb"),

  globe: (p) => svgWrap(`
    <circle cx="100" cy="100" r="60" fill="${p.primary}" stroke="${p.text}" stroke-width="2"/>
    <ellipse cx="100" cy="100" rx="60" ry="25" fill="none" stroke="${p.text}" stroke-width="1.5"/>
    <ellipse cx="100" cy="100" rx="25" ry="60" fill="none" stroke="${p.text}" stroke-width="1.5"/>
    <line x1="40" y1="100" x2="160" y2="100" stroke="${p.text}" stroke-width="1.5"/>
    <circle cx="120" cy="80" r="8" fill="${p.accent}" opacity="0.7"/>
    <circle cx="75" cy="115" r="6" fill="${p.secondary}" opacity="0.7"/>
  `, "globe"),

  gear: (p) => svgWrap(`
    <g transform="translate(100,100)">
      ${Array.from({ length: 8 }, (_, i) => {
        const a = (i * 45) * Math.PI / 180;
        const x = Math.cos(a) * 55, y = Math.sin(a) * 55;
        return `<rect x="${x - 8}" y="${y - 8}" width="16" height="16" fill="${p.primary}" transform="rotate(${i * 45})"/>`;
      }).join("")}
      <circle cx="0" cy="0" r="45" fill="${p.secondary}" stroke="${p.text}" stroke-width="2"/>
      <circle cx="0" cy="0" r="18" fill="${p.background}" stroke="${p.text}" stroke-width="2"/>
    </g>
  `, "gear"),

  star: (p) => svgWrap(`
    <polygon points="100,20 120,75 180,80 135,115 150,170 100,140 50,170 65,115 20,80 80,75"
      fill="${p.accent}" stroke="${p.text}" stroke-width="2"/>
    <polygon points="100,50 112,80 145,83 120,105 130,140 100,120 70,140 80,105 55,83 88,80"
      fill="${p.primary}" opacity="0.4"/>
  `, "star"),

  cloud: (p) => svgWrap(`
    <path d="M50 120 Q30 120, 30 100 Q30 80, 55 80 Q60 55, 90 55 Q120 55, 125 80 Q150 80, 150 105 Q150 120, 130 120 Z"
      fill="${p.secondary}" stroke="${p.text}" stroke-width="2"/>
    <path d="M60 130 Q50 145, 65 150 Q80 150, 80 135" fill="${p.accent}" stroke="${p.text}" stroke-width="1"/>
    <path d="M100 135 Q90 150, 105 155 Q120 155, 115 140" fill="${p.accent}" stroke="${p.text}" stroke-width="1"/>
  `, "cloud"),

  shield: (p) => svgWrap(`
    <path d="M100 25 L160 50 L160 100 C160 140, 130 160, 100 175 C70 160, 40 140, 40 100 L40 50 Z"
      fill="${p.primary}" stroke="${p.text}" stroke-width="2"/>
    <path d="M75 95 L95 115 L130 75" fill="none" stroke="${p.accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  `, "shield"),

  leaf: (p) => svgWrap(`
    <path d="M100 170 Q40 130, 50 70 Q80 30, 150 50 Q170 100, 100 170 Z"
      fill="${p.primary}" stroke="${p.text}" stroke-width="2"/>
    <path d="M100 170 Q70 120, 80 70" fill="none" stroke="${p.text}" stroke-width="1.5"/>
    <path d="M85 100 Q95 95, 110 85" fill="none" stroke="${p.text}" stroke-width="1" opacity="0.5"/>
  `, "leaf"),

  code: (p) => svgWrap(`
    <rect x="30" y="40" width="140" height="120" rx="4" fill="${p.background}" stroke="${p.text}" stroke-width="2"/>
    <rect x="30" y="40" width="140" height="20" fill="${p.primary}"/>
    <circle cx="45" cy="50" r="4" fill="${p.accent}"/>
    <circle cx="60" cy="50" r="4" fill="${p.secondary}"/>
    <circle cx="75" cy="50" r="4" fill="${p.muted}"/>
    <text x="50" y="85" font-family="monospace" font-size="12" fill="${p.primary}">&lt;div&gt;</text>
    <text x="60" y="105" font-family="monospace" font-size="12" fill="${p.secondary}">class=</text>
    <text x="60" y="125" font-family="monospace" font-size="12" fill="${p.accent}">"hero"</text>
    <text x="50" y="145" font-family="monospace" font-size="12" fill="${p.primary}">&lt;/div&gt;</text>
  `, "code"),

  music: (p) => svgWrap(`
    <circle cx="70" cy="150" r="18" fill="${p.primary}" stroke="${p.text}" stroke-width="2"/>
    <circle cx="140" cy="135" r="15" fill="${p.secondary}" stroke="${p.text}" stroke-width="2"/>
    <line x1="88" y1="150" x2="88" y2="50" stroke="${p.text}" stroke-width="2"/>
    <line x1="155" y1="135" x2="155" y2="45" stroke="${p.text}" stroke-width="2"/>
    <line x1="88" y1="50" x2="155" y2="45" stroke="${p.text}" stroke-width="2"/>
    <path d="M88 50 L88 40 L155 35 L155 45" fill="${p.accent}" stroke="${p.text}" stroke-width="1.5"/>
  `, "music"),

  camera: (p) => svgWrap(`
    <rect x="30" y="60" width="140" height="90" rx="8" fill="${p.primary}" stroke="${p.text}" stroke-width="2"/>
    <rect x="55" y="45" width="40" height="20" rx="4" fill="${p.secondary}" stroke="${p.text}" stroke-width="1.5"/>
    <circle cx="100" cy="105" r="30" fill="${p.background}" stroke="${p.text}" stroke-width="2"/>
    <circle cx="100" cy="105" r="18" fill="${p.accent}" opacity="0.6"/>
    <circle cx="145" cy="75" r="5" fill="${p.accent}"/>
  `, "camera"),

  target: (p) => svgWrap(`
    <circle cx="100" cy="100" r="70" fill="none" stroke="${p.primary}" stroke-width="3"/>
    <circle cx="100" cy="100" r="50" fill="none" stroke="${p.secondary}" stroke-width="3"/>
    <circle cx="100" cy="100" r="30" fill="none" stroke="${p.accent}" stroke-width="3"/>
    <circle cx="100" cy="100" r="10" fill="${p.primary}"/>
    <line x1="100" y1="20" x2="100" y2="40" stroke="${p.text}" stroke-width="2"/>
    <line x1="100" y1="160" x2="100" y2="180" stroke="${p.text}" stroke-width="2"/>
  `, "target"),

  trophy: (p) => svgWrap(`
    <path d="M70 40 L130 40 L125 90 Q100 110, 75 90 Z" fill="${p.accent}" stroke="${p.text}" stroke-width="2"/>
    <path d="M70 50 Q50 50, 50 65 Q50 80, 70 75" fill="none" stroke="${p.text}" stroke-width="2"/>
    <path d="M130 50 Q150 50, 150 65 Q150 80, 130 75" fill="none" stroke="${p.text}" stroke-width="2"/>
    <rect x="90" y="110" width="20" height="25" fill="${p.secondary}" stroke="${p.text}" stroke-width="1.5"/>
    <rect x="75" y="135" width="50" height="12" rx="2" fill="${p.primary}" stroke="${p.text}" stroke-width="1.5"/>
  `, "trophy"),

  brain: (p) => svgWrap(`
    <path d="M100 40 C70 40, 55 60, 55 85 C45 90, 45 115, 60 120 C60 140, 80 150, 100 145 L100 40 Z"
      fill="${p.primary}" stroke="${p.text}" stroke-width="2"/>
    <path d="M100 40 C130 40, 145 60, 145 85 C155 90, 155 115, 140 120 C140 140, 120 150, 100 145 L100 40 Z"
      fill="${p.secondary}" stroke="${p.text}" stroke-width="2"/>
    <path d="M70 70 Q80 80, 75 95 M130 70 Q120 80, 125 95" fill="none" stroke="${p.accent}" stroke-width="1.5"/>
  `, "brain"),

  atom: (p) => svgWrap(`
    <circle cx="100" cy="100" r="10" fill="${p.accent}" stroke="${p.text}" stroke-width="2"/>
    <ellipse cx="100" cy="100" rx="70" ry="25" fill="none" stroke="${p.primary}" stroke-width="2"/>
    <ellipse cx="100" cy="100" rx="70" ry="25" fill="none" stroke="${p.secondary}" stroke-width="2" transform="rotate(60 100 100)"/>
    <ellipse cx="100" cy="100" rx="70" ry="25" fill="none" stroke="${p.primary}" stroke-width="2" transform="rotate(120 100 100)"/>
  `, "atom"),

  wave: (p) => svgWrap(`
    <path d="M20 100 Q50 60, 80 100 T140 100 T180 100" fill="none" stroke="${p.primary}" stroke-width="3"/>
    <path d="M20 120 Q50 80, 80 120 T140 120 T180 120" fill="none" stroke="${p.secondary}" stroke-width="3"/>
    <path d="M20 140 Q50 100, 80 140 T140 140 T180 140" fill="none" stroke="${p.accent}" stroke-width="3"/>
  `, "wave"),

  network: (p) => svgWrap(`
    ${[[60, 60], [140, 60], [100, 100], [60, 140], [140, 140]].map(([x, y], i) =>
      `<circle cx="${x}" cy="${y}" r="12" fill="${i % 2 === 0 ? p.primary : p.secondary}" stroke="${p.text}" stroke-width="2"/>`
    ).join("")}
    ${[[60, 60, 100, 100], [140, 60, 100, 100], [100, 100, 60, 140], [100, 100, 140, 140], [60, 60, 140, 60], [60, 140, 140, 140]].map(([x1, y1, x2, y2]) =>
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${p.muted}" stroke-width="1.5"/>`
    ).join("")}
  `, "network"),

  building: (p) => svgWrap(`
    <rect x="50" y="80" width="40" height="90" fill="${p.primary}" stroke="${p.text}" stroke-width="2"/>
    <rect x="95" y="50" width="50" height="120" fill="${p.secondary}" stroke="${p.text}" stroke-width="2"/>
    ${[0, 1, 2].map((row) =>
      [0, 1].map((col) => `<rect x="${60 + col * 15}" y="${90 + row * 25}" width="8" height="12" fill="${p.accent}"/>`).join("")
    ).join("")}
    ${[0, 1, 2, 3].map((row) =>
      [0, 1, 2].map((col) => `<rect x="${103 + col * 13}" y="${60 + row * 25}" width="8" height="12" fill="${p.accent}"/>`).join("")
    ).join("")}
  `, "building"),

  handshake: (p) => svgWrap(`
    <path d="M30 100 L70 90 L100 100 L130 90 L170 100" fill="none" stroke="${p.text}" stroke-width="2"/>
    <rect x="60" y="85" width="30" height="20" rx="4" fill="${p.primary}" stroke="${p.text}" stroke-width="1.5"/>
    <rect x="110" y="85" width="30" height="20" rx="4" fill="${p.secondary}" stroke="${p.text}" stroke-width="1.5"/>
    <line x1="30" y1="100" x2="20" y2="80" stroke="${p.text}" stroke-width="2"/>
    <line x1="170" y1="100" x2="180" y2="80" stroke="${p.text}" stroke-width="2"/>
  `, "handshake"),

  flag: (p) => svgWrap(`
    <line x1="50" y1="30" x2="50" y2="180" stroke="${p.text}" stroke-width="3"/>
    <path d="M50 35 L140 45 L120 70 L140 95 L50 85 Z" fill="${p.primary}" stroke="${p.text}" stroke-width="2"/>
    <circle cx="50" cy="30" r="5" fill="${p.accent}"/>
  `, "flag"),

  clock: (p) => svgWrap(`
    <circle cx="100" cy="100" r="65" fill="${p.background}" stroke="${p.text}" stroke-width="3"/>
    <circle cx="100" cy="100" r="65" fill="none" stroke="${p.primary}" stroke-width="2" opacity="0.3"/>
    ${Array.from({ length: 12 }, (_, i) => {
      const a = (i * 30) * Math.PI / 180;
      const x1 = 100 + Math.cos(a) * 55, y1 = 100 + Math.sin(a) * 55;
      const x2 = 100 + Math.cos(a) * 62, y2 = 100 + Math.sin(a) * 62;
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${p.text}" stroke-width="2"/>`;
    }).join("")}
    <line x1="100" y1="100" x2="100" y2="55" stroke="${p.primary}" stroke-width="3" stroke-linecap="round"/>
    <line x1="100" y1="100" x2="135" y2="100" stroke="${p.accent}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="100" cy="100" r="5" fill="${p.text}"/>
  `, "clock"),

  key: (p) => svgWrap(`
    <circle cx="60" cy="100" r="25" fill="none" stroke="${p.primary}" stroke-width="4"/>
    <circle cx="60" cy="100" r="8" fill="${p.accent}"/>
    <line x1="85" y1="100" x2="160" y2="100" stroke="${p.primary}" stroke-width="4"/>
    <line x1="140" y1="100" x2="140" y2="115" stroke="${p.primary}" stroke-width="4"/>
    <line x1="155" y1="100" x2="155" y2="120" stroke="${p.primary}" stroke-width="4"/>
  `, "key"),

  compass: (p) => svgWrap(`
    <circle cx="100" cy="100" r="65" fill="${p.background}" stroke="${p.text}" stroke-width="3"/>
    <polygon points="100,40 110,100 100,160 90,100" fill="${p.primary}" stroke="${p.text}" stroke-width="1.5"/>
    <polygon points="100,40 110,100 100,100" fill="${p.accent}"/>
    <polygon points="100,160 90,100 100,100" fill="${p.muted}"/>
    <circle cx="100" cy="100" r="5" fill="${p.text}"/>
  `, "compass"),
};

/**
 * Get SVG illustration for a slide. Falls back to "star" if keyword not found.
 */
export function getIllustration(keyword: string, brand: BrandPreset): string {
  const p: SvgParams = {
    primary: brand.palette.primary,
    secondary: brand.palette.secondary,
    accent: brand.palette.accent,
    text: brand.palette.text,
    muted: brand.palette.muted,
  };
  const fn = ILLUSTRATIONS[keyword] ?? ILLUSTRATIONS.star;
  return fn(p);
}

/**
 * Illustrate tool — generates SVG for each slide.
 * If images:"ai", optionally calls Workers AI image model (opt-in, neuron cost).
 */
export async function illustrate(
  ctx: ToolContext,
  slides: SlideContent[],
  brand: BrandPreset,
): Promise<ToolResult<string[]>> {
  const { state, emit } = ctx;
  emit({ step: "illustrate", message: `Generating ${slides.length} illustrations…`, timestamp: Date.now() });

  const illustrations: string[] = [];
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    let svg: string;

    if (state.images === "ai") {
      // Opt-in AI raster illustration (neuron cost)
      try {
        emit({ step: "illustrate", message: `AI image for slide ${i + 1}…`, timestamp: Date.now() });
        svg = await generateAiIllustration(ctx, slide, brand);
      } catch (e) {
        console.log("AI illustration failed, falling back to vector:", e);
        svg = getIllustration(slide.illustration || "star", brand);
      }
    } else {
      svg = getIllustration(slide.illustration || "star", brand);
    }

    illustrations.push(svg);
  }

  emit({
    step: "illustrate",
    message: `${illustrations.length} illustrations ready`,
    timestamp: Date.now(),
  });
  return { success: true, data: illustrations };
}

/**
 * Generate a raster illustration via Workers AI image model.
 * Returns an SVG wrapper with embedded base64 image.
 */
async function generateAiIllustration(
  ctx: ToolContext,
  slide: SlideContent,
  brand: BrandPreset,
): Promise<string> {
  const { env } = ctx;
  const prompt = slide.imagePrompt
    ? `${slide.imagePrompt}. Palette: ${brand.palette.primary}, ${brand.palette.secondary}, ${brand.palette.accent}. Clean flat illustration, no text, no watermark.`
    : `Illustration for slide "${slide.title}": ${slide.illustration || "abstract art"}, flat vector style, colors ${brand.palette.primary}, ${brand.palette.accent}, simple, clean`;

  const result = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", {
    prompt,
    num_steps: 4,
      width: 768,
      height: 512,
  }) as { image?: ArrayBuffer };

  if (result.image) {
    const bytes = new Uint8Array(result.image);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="slide-illustration" data-keyword="ai"><image href="data:image/png;base64,${base64}" width="200" height="200" preserveAspectRatio="xMidYMid meet"/></svg>`;
  }

  // Fallback to vector
  return getIllustration(slide.illustration || "star", brand);
}
