// src/types.ts — Shared types for the AI Creative Studio agent
export interface Env {
  AI: Ai;
  BROWSER: BrowserWorker;
  CACHE: KVNamespace;
  ASSETS: Fetcher;
  CreativeStudio: DurableObjectNamespace;
}

// ── Request / API ──────────────────────────────────────────────
export interface StudioRequest {
  topic: string;
  format: "html" | "pdf" | "both";
  slideCount?: number;
  style?: "auto" | "corporate" | "glass" | "punk" | "book";
  images?: "svg" | "ai";
  brand?: Partial<BrandPreset>;
}

// ── Content (LLM output) ──────────────────────────────────────
export interface SlideContent {
  title: string;
  subtitle?: string;
  bullets: string[];
  notes?: string;
  /** keyword for illustration selection: rocket, sun, heart, book, guitar, chart, ... */
  illustration?: string;
  /** vivid one-sentence brief for the image model */
  imagePrompt?: string;
  /** растровая иллюстрация из библиотеки, напр. /vance/06-caravan-road.png */
  imageUrl?: string;
  /** backdrop = во весь экран, sticker = в панель текста */
  imageMode?: "backdrop" | "sticker";
  /** optional numeric dataset for chart rendering */
  chart?: {
    type: "bar" | "line" | "pie";
    title?: string;
    labels: string[];
    series: { name: string; values: number[] }[];
  };
}

export interface ContentPayload {
  title: string;
  subtitle: string;
  slides: SlideContent[];
}

// ── Art Direction ──────────────────────────────────────────────
export interface BrandPreset {
  name: string;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    muted: string;
  };
  fonts: {
    heading: string;
    body: string;
    headingWeight: number;
    bodyWeight: number;
  };
  radius: string;
  layout: "split" | "centered" | "fullbleed";
  glassmorphism: boolean;
}

// ── Agent state (persisted per-brief) ──────────────────────────
export interface StudioState {
  topic: string;
  format: "html" | "pdf" | "both";
  slideCount: number;
  style: string;
  images: "svg" | "ai";
  status: "idle" | "planning" | "art_directing" | "illustrating" | "rendering" | "done" | "error";
  content?: ContentPayload;
  brand?: BrandPreset;
  html?: string;
  pdfBytes?: number;
  cacheKey?: string;
  cacheHit?: boolean;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

// ── Progress events streamed over WebSocket ────────────────────
export interface ProgressEvent {
  step: string;
  message: string;
  data?: unknown;
  timestamp: number;
}

// ── Tool definitions ───────────────────────────────────────────
export interface ToolContext {
  env: Env;
  state: StudioState;
  emit: (event: ProgressEvent) => void;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ToolDef<T = unknown> {
  name: string;
  description: string;
  run: (ctx: ToolContext) => Promise<ToolResult<T>>;
}
