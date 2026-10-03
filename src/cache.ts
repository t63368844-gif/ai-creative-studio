// src/cache.ts — KV cache for neuron economy
import type { Env } from "./types";

const TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Build a deterministic cache key from topic + slideCount + format.
 */
export function buildCacheKey(topic: string, slideCount: number, format: string): string {
  const raw = `v3|${topic.trim().toLowerCase()}|${slideCount}`; // v3: bust cache after reveal.js renderer fix
  // Simple hash (djb2) — deterministic, no crypto needed
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) + hash) + raw.charCodeAt(i);
    hash = hash & 0xffffffff;
  }
  return `cs:${(hash >>> 0).toString(16)}`;
}

/**
 * Look up a cached result. Returns parsed object or null.
 */
export async function cacheLookup(env: Env, key: string): Promise<unknown | null> {
  try {
    const raw = await env.CACHE.get(key, "text");
    if (raw) {
      console.log("cache hit:", key);
      return JSON.parse(raw);
    }
  } catch (e) {
    console.log("cache lookup error:", e);
  }
  return null;
}

/**
 * Store a result in cache with 7-day TTL.
 */
export async function cacheStore(env: Env, key: string, data: unknown): Promise<void> {
  try {
    await env.CACHE.put(key, JSON.stringify(data), {
      expirationTtl: TTL_SECONDS,
    });
    console.log("cache stored:", key);
  } catch (e) {
    console.log("cache store error:", e);
  }
}
