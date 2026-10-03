// src/server.ts — Worker entry point
// Routes requests to the CreativeStudio Agent.
import type { Env } from "./types";
import { CreativeStudio } from "./agent";
import { getPresetList } from "./artdirector";
import { renderHtml } from "./html";
import { renderPdf } from "./pdf";
import { planContent } from "./content";
import { artDirect } from "./artdirector";
import { buildCacheKey, cacheLookup, cacheStore } from "./cache";

export { CreativeStudio };

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // GET / → API info
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "")) {
      return new Response(
        JSON.stringify({
          name: "AI Creative Studio",
          description: "Autonomous creative studio: from a one-sentence brief it produces an interactive HTML page AND a branded PDF presentation.",
          endpoints: {
            "POST /": "Generate — body: { topic, format, slideCount?, style?, images?, brand? }",
            "POST /html": "Generate HTML only",
            "POST /pdf": "Generate PDF only (direct download)",
            "GET /": "This API info and preset list",
          },
          presets: getPresetList(),
          defaults: {
            format: "both",
            slideCount: 8,
            style: "auto",
            images: "svg",
          },
          model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
        }, null, 2),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        },
      );
    }

    // POST / → full pipeline via Agent DO
    // POST /html → HTML only
    // POST /pdf → PDF only
    if (request.method === "POST") {
      const isPdf = url.pathname === "/pdf";
      const isHtml = url.pathname === "/html";
      const format = isPdf ? "pdf" : isHtml ? "html" : "both";

      try {
        const body = await request.json() as {
          topic?: string;
          format?: string;
          slideCount?: number;
          style?: string;
          images?: string;
          brand?: unknown;
        };

        if (!body.topic || typeof body.topic !== "string") {
          return new Response(
            JSON.stringify({ error: "Missing required field: topic" }),
            { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
          );
        }

        const slideCount = body.slideCount ?? 8;
        const style = body.style ?? "auto";
        const images = (body.images as "svg" | "ai") ?? "svg";
        const cacheKey = buildCacheKey(body.topic, slideCount, format);

        // Check cache first
        const cached = await cacheLookup(env, cacheKey) as { content: any; brand: any } | null;

        let content, brand;
        if (cached) {
          console.log("cache hit:", cacheKey);
          content = cached.content;
          brand = cached.brand;
        } else {
          console.log("llm call:", cacheKey);
          const ctx = {
            env,
            state: {
              topic: body.topic,
              format,
              slideCount,
              style,
              images,
              brand: body.brand as any,
              status: "idle",
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
            emit: () => {},
          };
          const contentResult = await planContent(ctx);
          if (!contentResult.success || !contentResult.data) {
            throw new Error(contentResult.error ?? "Content planning failed");
          }
          content = contentResult.data;

          const brandResult = await artDirect(ctx);
          if (!brandResult.success || !brandResult.data) {
            throw new Error(brandResult.error ?? "Art direction failed");
          }
          brand = brandResult.data;

          await cacheStore(env, cacheKey, { content, brand });
        }

        // Generate HTML
        let html: string | undefined;
        if (format === "html" || format === "both") {
          html = renderHtml(content, brand);
        }

        // Generate PDF
        let pdf: Uint8Array | undefined;
        if (format === "pdf" || format === "both") {
          const pdfCtx = {
            env,
            state: { topic: body.topic, format, slideCount, style, images, status: "rendering", createdAt: Date.now(), updatedAt: Date.now() },
            emit: () => {},
          };
          const pdfResult = await renderPdf(pdfCtx, content, brand);
          if (pdfResult.success && pdfResult.data) {
            pdf = pdfResult.data;
          } else {
            throw new Error(pdfResult.error ?? "PDF rendering failed");
          }
        }

        // Return based on format
        if (format === "pdf") {
          if (!pdf) {
            return new Response(
              JSON.stringify({ error: "PDF generation failed" }),
              { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
            );
          }
          const filename = (body.topic.slice(0, 40).replace(/[^a-z0-9]/gi, "_") || "presentation") + ".pdf";
          return new Response(pdf, {
            status: 200,
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="${filename}"`,
              ...CORS_HEADERS,
            },
          });
        }

        if (format === "html") {
          return new Response(html, {
            status: 200,
            headers: { "Content-Type": "text/html; charset=utf-8", ...CORS_HEADERS },
          });
        }

        // both — return HTML
        return new Response(html, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8", ...CORS_HEADERS },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return new Response(
          JSON.stringify({ error: "Request failed", details: msg }),
          { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
        );
      }
    }

    // GET /report/<cacheKey> → published spec + checklist
    if (request.method === "GET" && url.pathname.startsWith("/report/")) {
      const key = url.pathname.slice("/report/".length);
      const data = await env.CACHE.get("report:" + key, "json").catch(() => null);
      return new Response(JSON.stringify(data ?? { error: "report not found", key }, null, 2), {
        status: data ? 200 : 404,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }
    // GET /reports → list of published reports
    if (request.method === "GET" && url.pathname === "/reports") {
      const list = await env.CACHE.list();
      return new Response(JSON.stringify({ reports: list.keys.map((k) => k.name.replace("report:", "")) }, null, 2), {
        status: 200,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }
    // GET /report/<cacheKey> → published spec + checklist
    if (request.method === "GET" && url.pathname.startsWith("/report/")) {
      const key = url.pathname.slice("/report/".length);
      const data = await env.CACHE.get("report:" + key, "json").catch(() => null);
      return new Response(JSON.stringify(data ?? { error: "report not found", key }, null, 2), {
        status: data ? 200 : 404,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }
    // GET /reports → list of published reports
    if (request.method === "GET" && url.pathname === "/reports") {
      const list = await env.CACHE.list({ prefix: "report:" });
      return new Response(JSON.stringify({ reports: list.keys.map((k) => k.name.replace("report:", "")) }, null, 2), {
        status: 200,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }
    // Serve static assets (playground UI)
    if (env.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) return assetResponse;
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
    );
  },
} satisfies ExportedHandler<Env>;
