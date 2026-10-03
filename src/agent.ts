// src/agent.ts — CreativeStudio Agent (Durable Object extending Agent)
// Orchestrates the tools[] pipeline: cache_lookup → plan_content → art_direct →
// illustrate → chart → render_html → render_pdf.
// Keeps per-brief state, streams progress over WebSocket.
import { Agent } from "agents";
import type {
  Env,
  StudioState,
  StudioRequest,
  ProgressEvent,
  ContentPayload,
  BrandPreset,
  ToolContext,
  ToolResult,
} from "./types";
import { planContent } from "./content";
import { artDirect } from "./artdirector";
import { illustrate } from "./svg";
import { renderHtml } from "./html";
import { renderPdf } from "./pdf";
import { buildCacheKey, cacheLookup, cacheStore } from "./cache";
import { verify } from "./verify";

function defaultState(): StudioState {
  return {
    topic: "",
    format: "both",
    slideCount: 8,
    style: "auto",
    images: "svg",
    status: "idle",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export class CreativeStudio extends Agent<Env, StudioState> {
  override onStart() {
    this.setState(defaultState());
  }

  /**
   * Emit a progress event to all connected WebSocket clients.
   */
  private emitProgress(event: Omit<ProgressEvent, "timestamp">): void {
    const fullEvent: ProgressEvent = { ...event, timestamp: Date.now() };
    this.broadcast(JSON.stringify({ type: "progress", ...fullEvent }));
    console.log(`[${event.step}] ${event.message}`);
  }

  /**
   * Build the tool context for pipeline execution.
   */
  private buildContext(): ToolContext {
    return {
      env: this.env,
      state: this.state,
      emit: (event: ProgressEvent) => this.emitProgress(event),
    };
  }

  /**
   * Tool: cache_lookup
   */
  private async cacheLookupTool(cacheKey: string): Promise<ToolResult<{ content: ContentPayload; brand: BrandPreset; html?: string }>> {
    const cached = await cacheLookup(this.env, cacheKey);
    if (cached) {
      return { success: true, data: cached as { content: ContentPayload; brand: BrandPreset; html?: string } };
    }
    return { success: false };
  }

  /**
   * Run the full creative pipeline.
   */
  async runPipeline(request: StudioRequest): Promise<{
    html?: string;
    pdf?: Uint8Array;
    content?: ContentPayload;
    brand?: BrandPreset;
    cacheHit: boolean;
  }> {
    const state: StudioState = {
      topic: request.topic,
      format: request.format,
      slideCount: request.slideCount ?? 8,
      style: request.style ?? "auto",
      images: request.images ?? "ai",
      brand: request.brand,
      status: "planning",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.setState(state);

    const cacheKey = buildCacheKey(request.topic, state.slideCount, state.format);
    state.cacheKey = cacheKey;

    // ── Step 1: cache_lookup ──────────────────────────────────
    this.emitProgress({ step: "cache_lookup", message: "Checking cache…" });
    const cached = await this.cacheLookupTool(cacheKey);
    if (cached.success && cached.data) {
      this.emitProgress({ step: "cache_lookup", message: "cache hit — returning cached result" });
      state.cacheHit = true;
      state.content = cached.data.content;
      state.brand = cached.data.brand;
      state.html = cached.data.html;
      state.status = "done";
      this.setState(state);

      let pdf: Uint8Array | undefined;
      if (state.format === "pdf" || state.format === "both") {
        const ctx = this.buildContext();
        const pdfResult = await renderPdf(ctx, cached.data.content, cached.data.brand);
        if (pdfResult.success && pdfResult.data) {
          pdf = pdfResult.data;
          state.pdfBytes = pdf.length;
        }
      }
      return {
        html: cached.data.html,
        pdf,
        content: cached.data.content,
        brand: cached.data.brand,
        cacheHit: true,
      };
    }
    this.emitProgress({ step: "cache_lookup", message: "cache miss — running full pipeline" });
    state.cacheHit = false;

    // ── Step 2: plan_content ──────────────────────────────────
    state.status = "planning";
    this.setState(state);
    const ctx = this.buildContext();
    const contentResult = await planContent(ctx);
    if (!contentResult.success || !contentResult.data) {
      state.status = "error";
      state.error = contentResult.error ?? "Content planning failed";
      this.setState(state);
      throw new Error(state.error);
    }
    state.content = contentResult.data;
    this.setState(state);

    // ── Step 3: art_direct ────────────────────────────────────
    state.status = "art_directing";
    this.setState(state);
    const brandResult = await artDirect(ctx);
    if (!brandResult.success || !brandResult.data) {
      state.status = "error";
      state.error = brandResult.error ?? "Art direction failed";
      this.setState(state);
      throw new Error(state.error);
    }
    state.brand = brandResult.data;
    this.setState(state);

    // ── Step 4: illustrate ────────────────────────────────────
    state.status = "illustrating";
    this.setState(state);
    await illustrate(ctx, state.content.slides, state.brand);

    // ── Step 5: chart (inline during render) ───────────────────
    this.emitProgress({ step: "chart", message: "Charts rendered inline as vector SVG" });

    // ── Step 6: render_html ────────────────────────────────────
    state.status = "rendering";
    this.setState(state);
    let html: string | undefined;
    if (state.format === "html" || state.format === "both") {
      this.emitProgress({ step: "render_html", message: "Building reveal.js HTML…" });
      html = renderHtml(state.content, state.brand);
      state.html = html;
      this.emitProgress({ step: "render_html", message: "HTML ready" });
    }

    // ── Step 7: render_pdf ─────────────────────────────────────
    let pdf: Uint8Array | undefined;
    if (state.format === "pdf" || state.format === "both") {
      const pdfResult = await renderPdf(ctx, state.content, state.brand);
      if (pdfResult.success && pdfResult.data) {
        pdf = pdfResult.data;
        state.pdfBytes = pdf.length;
      } else {
        state.status = "error";
        state.error = pdfResult.error ?? "PDF rendering failed";
        this.setState(state);
        throw new Error(state.error);
      }
    }

    // ── Cache store ───────────────────────────────────────────
    await cacheStore(this.env, cacheKey, {
      content: state.content,
      brand: state.brand,
      html,
    });
    state.status = "done";
    state.updatedAt = Date.now();
    console.log("BEFORE setState");
    try {
      this.setState(state);
      console.log("AFTER setState");
    } catch (e) {
      console.log("setState ERROR:", e instanceof Error ? e.message : String(e));
    }

    // ── Step 8: verify against the spec (ТЗ) and publish the report ──
    console.log("STEP8 ENTER");
    try {
      console.log("BEFORE verify, slides:", state.content?.slides?.length);
    const checks = verify(
      { topic: state.topic, slideCount: state.slideCount, style: state.style },
      state.content, state.brand, html, pdf,
    );
    const passed = checks.filter((c) => c.ok).length;
    await cacheStore(this.env, "report:" + cacheKey, {
      spec: { topic: state.topic, slideCount: state.slideCount, style: state.style, images: state.images, brand: state.brand },
      checklist: checks,
      at: Date.now(),
    });
    this.emitProgress({ step: "verify", message: `ТЗ check: ${passed}/${checks.length} passed`, data: checks });
    } catch (e) {
      console.log("VERIFY ERROR:", e instanceof Error ? e.message : String(e));
    }

    // ИСПРАВЛЕНО: убран артефакт "Agent" в середине template-строки
    this.emitProgress({
      step: "done",
      message: `Pipeline complete — ${state.content.slides.length} slides, ${pdf ? `${(pdf.length / 1024).toFixed(0)} KB PDF` : "no PDF"}, ${html ? "HTML ready" : "no HTML"}`,
      timestamp: Date.now(),
    });

    return {
      html,
      pdf,
      content: state.content,
      brand: state.brand,
      cacheHit: false,
    };
  }

  // ── WebSocket handlers ────────────────────────────────────
  override onConnect(connection: WebSocket): void {
    this.emitProgress({ step: "connect", message: "Client connected to Creative Studio agent" });
  }

  override onMessage(connection: WebSocket, message: string | ArrayBuffer): void {
    try {
      const text = typeof message === "string" ? message : new TextDecoder().decode(message as ArrayBuffer);
      const data = JSON.parse(text);
      if (data.type === "invoke" && data.request) {
        this.runPipeline(data.request as StudioRequest)
          .then((result) => {
            connection.send(JSON.stringify({
              type: "complete",
              success: true,
              cacheHit: result.cacheHit,
              content: result.content,
              brand: result.brand,
              hasHtml: !!result.html,
              hasPdf: !!result.pdf,
              pdfSize: result.pdf?.length ?? 0,
            }));
          })
          .catch((e) => {
            connection.send(JSON.stringify({
              type: "complete",
              success: false,
              error: e instanceof Error ? e.message : String(e),
            }));
          });
      }
    } catch {
      // Ignore malformed messages
    }
  }
}
