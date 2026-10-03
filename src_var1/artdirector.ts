// src/artdirector.ts — Tool: art_direct
// Acts as art director: chooses a cohesive palette, font pairing, corner radius,
// and layout theme. Supports style:"auto" plus presets: corporate/glass/punk/book.
import type { BrandPreset, ContentPayload, ToolContext, ToolResult } from "./types";

const PRESETS: Record<string, BrandPreset> = {
  corporate: {
    name: "corporate",
    palette: {
      primary: "#1a4d8f",
      secondary: "#2d7d4f",
      accent: "#f5a623",
      background: "#f8f9fa",
      text: "#1a1a2e",
      muted: "#6c757d",
    },
    fonts: {
      heading: "Georgia, 'Times New Roman', serif",
      body: "'Helvetica Neue', Arial, sans-serif",
      headingWeight: 700,
      bodyWeight: 400,
    },
    radius: "4px",
    layout: "split",
    glassmorphism: false,
  },
  glass: {
    name: "glass",
    palette: {
      primary: "#6c5ce7",
      secondary: "#a29bfe",
      accent: "#00cec9",
      background: "#0a0a1a",
      text: "#f0f0ff",
      muted: "#a0a0c0",
    },
    fonts: {
      heading: "'SF Pro Display', 'Segoe UI', sans-serif",
      body: "'SF Pro Text', 'Segoe UI', sans-serif",
      headingWeight: 600,
      bodyWeight: 300,
    },
    radius: "16px",
    layout: "centered",
    glassmorphism: true,
  },
  punk: {
    name: "punk",
    palette: {
      primary: "#ff006e",
      secondary: "#fb5607",
      accent: "#ffbe0b",
      background: "#0d0d0d",
      text: "#ffffff",
      muted: "#888888",
    },
    fonts: {
      heading: "'Impact', 'Arial Black', sans-serif",
      body: "'Courier New', monospace",
      headingWeight: 900,
      bodyWeight: 400,
    },
    radius: "0px",
    layout: "fullbleed",
    glassmorphism: false,
  },
  book: {
    name: "book",
    palette: {
      primary: "#3c2f2f",
      secondary: "#8b4513",
      accent: "#c0392b",
      background: "#fdf6e3",
      text: "#2c2c2c",
      muted: "#7a6a5a",
    },
    fonts: {
      heading: "'Playfair Display', Georgia, serif",
      body: "'Crimson Text', Georgia, serif",
      headingWeight: 700,
      bodyWeight: 400,
    },
    radius: "8px",
    layout: "centered",
    glassmorphism: false,
  },
};

// Auto-selection palettes keyed by topic vibe
const AUTO_PALETTES: BrandPreset[] = [
  PRESETS.glass,
  {
    name: "auto-ocean",
    palette: {
      primary: "#0077b6",
      secondary: "#00b4d8",
      accent: "#ffd166",
      background: "#03045e",
      text: "#caf0f8",
      muted: "#90e0ef",
    },
    fonts: {
      heading: "'Segoe UI', sans-serif",
      body: "'Segoe UI', sans-serif",
      headingWeight: 700,
      bodyWeight: 400,
    },
    radius: "12px",
    layout: "split",
    glassmorphism: false,
  },
  {
    name: "auto-forest",
    palette: {
      primary: "#2d6a4f",
      secondary: "#52b788",
      accent: "#d4a373",
      background: "#f1f1e8",
      text: "#1b2a1f",
      muted: "#6b7c6e",
    },
    fonts: {
      heading: "Georgia, serif",
      body: "'Helvetica Neue', sans-serif",
      headingWeight: 700,
      bodyWeight: 400,
    },
    radius: "10px",
    layout: "centered",
    glassmorphism: false,
  },
  {
    name: "auto-sunset",
    palette: {
      primary: "#e63946",
      secondary: "#f77f00",
      accent: "#fcbf49",
      background: "#1d3557",
      text: "#f1faee",
      muted: "#a8dadc",
    },
    fonts: {
      heading: "'Trebuchet MS', sans-serif",
      body: "'Trebuchet MS', sans-serif",
      headingWeight: 700,
      bodyWeight: 400,
    },
    radius: "8px",
    layout: "split",
    glassmorphism: false,
  },
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function getPresetList(): { name: string; description: string }[] {
  return [
    { name: "auto", description: "Agent chooses palette and fonts based on the brief" },
    { name: "corporate", description: "Professional blue/green, serif headings, minimal radius" },
    { name: "glass", description: "Dark glassmorphism, translucent gradients, crisp borders" },
    { name: "punk", description: "Bold neon on black, Impact font, zero radius" },
    { name: "book", description: "Warm paper tones, Playfair/serif, editorial layout" },
  ];
}

const HEX = /^#[0-9a-fA-F]{6}$/;
async function llmPalette(ctx: ToolContext, topic: string): Promise<BrandPreset["palette"] | null> {
  try {
    const res = await ctx.env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      messages: [
        { role: "system", content: 'You are an art director. Return ONLY JSON {"primary":"#rrggbb","secondary":"#rrggbb","accent":"#rrggbb","background":"#rrggbb","text":"#rrggbb","muted":"#rrggbb"} with a cohesive palette matching the topic mood. text must strongly contrast background. Background must be muted, desaturated or dark — never a saturated hue like pure yellow or red. Background must be muted, desaturated or dark — never a saturated hue like pure yellow or red.' },
        { role: "user", content: topic },
      ],
      max_tokens: 120,
      temperature: 0.8,
    }) as { response?: unknown };
    let raw = res.response;
    if (typeof raw !== "string") raw = JSON.stringify(raw);
    const m = (raw as string).match(/\{[\s\S]*\}/);
    if (!m) return null;
    const p = JSON.parse(m[0]);
    for (const k of ["primary", "secondary", "accent", "background", "text", "muted"]) {
      if (typeof p[k] !== "string" || !HEX.test(p[k])) return null;
    }
    console.log("llm call: art direction palette");
    return p as BrandPreset["palette"];
  } catch {
    return null;
  }
}

export async function artDirect(ctx: ToolContext): Promise<ToolResult<BrandPreset>> {
  const { state, emit } = ctx;
  emit({ step: "art_direct", message: "Choosing art direction…", timestamp: Date.now() });

  let brand: BrandPreset;
  if (state.style === "auto") {
    // AI art-director designs the palette; hash preset is the safety net
    const idx = hashString(state.topic) % AUTO_PALETTES.length;
    const base = AUTO_PALETTES[idx];
    const aiPal = await llmPalette(ctx, state.topic);
    brand = aiPal ? { ...base, palette: aiPal, name: "auto-ai" } : { ...base, name: "auto" };
  } else if (PRESETS[state.style]) {
    brand = { ...PRESETS[state.style] };
  } else {
    brand = { ...AUTO_PALETTES[0] };
  }

  // Apply user brand overrides
  if (state.brand) {
    if (state.brand.palette) {
      brand.palette = { ...brand.palette, ...state.brand.palette };
    }
    if (state.brand.fonts) {
      brand.fonts = { ...brand.fonts, ...state.brand.fonts };
    }
    if (state.brand.radius) brand.radius = state.brand.radius;
    if (state.brand.layout) brand.layout = state.brand.layout;
  }

  emit({
    step: "art_direct",
    message: `Art direction: ${brand.name} (${brand.palette.primary})`,
    data: { palette: brand.palette, fonts: brand.fonts },
    timestamp: Date.now(),
  });
  return { success: true, data: brand };
}

export function getBrandPreset(name: string): BrandPreset | undefined {
  return PRESETS[name];
}
