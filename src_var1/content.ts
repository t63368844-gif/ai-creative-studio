// src/content.ts — Tool: plan_content
// Calls Workers AI (llama-3.3-70b-instruct-fp8-fast) with JSON mode to produce
// structured slide content from a one-sentence brief.
import type { ContentPayload, SlideContent, ToolContext, ToolResult } from "./types";

const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

const ILLUSTRATION_KEYWORDS = [
  "rocket", "sun", "heart", "book", "guitar", "chart", "lightbulb",
  "globe", "gear", "star", "cloud", "shield", "leaf", "code", "music",
  "camera", "target", "trophy", "brain", "atom", "wave", "network",
  "building", "handshake", "flag", "clock", "key", "compass",
];

const SYSTEM_PROMPT = `You are a creative content director for a presentation studio.
Given a one-sentence brief, produce a complete slide deck as JSON.
Rules:
- Output ONLY valid JSON, no markdown fences, no commentary.
- The "title" and "subtitle" describe the deck as a whole.
- Each slide has: title, subtitle (optional), bullets (2-5 concise points), notes (optional speaker notes), illustration (one keyword from the list), and optionally chart.
- Illustration keywords MUST be one of: ${ILLUSTRATION_KEYWORDS.join(", ")}.
- If a slide discusses numbers, statistics, or comparisons, include a "chart" object with type ("bar"|"line"|"pie"), title, labels (string[]), and series ({name, values:number[]}[]).
- At least 2 slides should contain charts if the topic involves data.
- Bullets are FULL sentences (12-25 words each), 4-6 bullets per slide.
- Every content slide MUST include "notes": 2-3 sentences of speaker commentary expanding the bullets.
- Every slide MUST include "imagePrompt": one vivid English sentence for an illustrator (concrete objects, scene, lighting, mood).
- Include a "chart" on EVERY slide that mentions numbers; at least 2 charts per data-heavy deck.
- The content language should match the brief language (Russian brief → Russian content).
- Total slides should match the requested count.
JSON schema:
{
  "title": "string",
  "subtitle": "string",
  "slides": [
    {
      "title": "string",
      "subtitle": "string (optional)",
      "bullets": ["string"],
      "notes": "string (optional)",
      "illustration": "keyword",
  "imagePrompt": "one-sentence visual brief for this slide",
      "chart": {
        "type": "bar|line|pie",
        "title": "string",
        "labels": ["string"],
        "series": [{ "name": "string", "values": [number] }]
      } (optional)
    }
  ]
}`;

function extractJson(text: unknown): unknown {
  // Guard: coerce non-string payloads (binding may return parsed objects)
  if (typeof text !== "string") {
    text = JSON.stringify(text);
  }
  // Strip markdown fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    return repairTruncatedJson(cleaned);
  }
}

/**
 * Salvage a truncated JSON payload: cut at the last complete object
 * and try closing-brace combinations until it parses.
 */
function repairTruncatedJson(raw: string): unknown {
  const cuts: string[] = [];
  const lastObj = raw.lastIndexOf("}");
  if (lastObj > 0) cuts.push(raw.slice(0, lastObj + 1));
  const lastComma = raw.lastIndexOf(",");
  if (lastComma > 0) cuts.push(raw.slice(0, lastComma));
  cuts.push(raw);
  const suffixes = ["", "}", "]}", "}]", "}]} ", "\"}]", "\"}]}"];
  for (const c of cuts) {
    for (const suf of suffixes) {
      try {
        const parsed = JSON.parse(c + suf);
        if (parsed && typeof parsed === "object") {
          console.log("llm json repaired from truncation");
          return parsed;
        }
      } catch { /* try next */ }
    }
  }
  throw new Error("Unrepairable truncated JSON");
}

export async function planContent(ctx: ToolContext): Promise<ToolResult<ContentPayload>> {
  const { env, state, emit } = ctx;
  emit({ step: "plan_content", message: "Calling Workers AI for content planning…", timestamp: Date.now() });

  const userPrompt = `Brief: "${state.topic}"
Number of slides: ${state.slideCount}
Generate the full slide deck JSON now.`;

  try {
    const response = await env.AI.run(
      MODEL,
      {
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_object",
        },
        max_tokens: 8192,
        temperature: 0.7,
      },
    ) as { response?: string; result?: string };

    // Normalize: Workers AI may return response as string OR parsed object
    const raw: unknown = response.response ?? response.result ?? "";
    console.log("llm response type:", typeof raw);
    let rawText: string;
    if (typeof raw === "string") {
      rawText = raw;
    } else if (raw && typeof raw === "object") {
      rawText = JSON.stringify(raw);
    } else {
      rawText = String(raw);
    }
    console.log("llm call: content planning");
    const parsed = extractJson(rawText) as ContentPayload;

    // Validate
    if (!parsed.title || !Array.isArray(parsed.slides) || parsed.slides.length === 0) {
      return { success: false, error: "LLM returned invalid content structure" };
    }

    // Sanitize illustration keywords
    for (const slide of parsed.slides) {
      if (slide.illustration && !ILLUSTRATION_KEYWORDS.includes(slide.illustration)) {
        slide.illustration = "star"; // fallback
      }
      if (!slide.bullets) slide.bullets = [];
    }

    emit({
      step: "plan_content",
      message: `Content planned: ${parsed.slides.length} slides`,
      data: { title: parsed.title },
      timestamp: Date.now(),
    });
    return { success: true, data: parsed };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: `Content planning failed: ${msg}` };
  }
}
