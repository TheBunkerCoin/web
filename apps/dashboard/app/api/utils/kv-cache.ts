import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Wrap an expensive fetcher with KV caching that serves stale data
 * while refreshing in the background.
 *
 * @param key        KV key to store the payload under
 * @param maxAgeMs   How long (in ms) a cached entry is considered FRESH
 * @param fetcher    Function that returns fresh data when cache is missing/stale
 * @returns          A Response containing JSON payload
 */
export async function withKvCache<T>(
  key: string,
  maxAgeMs: number,
  fetcher: () => Promise<T>,
  isValid?: (data: T) => boolean,
  maxAttempts: number = 1,
  retryDelayMs: number = 10_000,
): Promise<Response> {
  const { env, ctx } = getCloudflareContext();
  const kv = (env as any)["BUNKERCOIN_APP_CACHE"] as any;

  const headers = {
    "content-type": "application/json",
    "Cache-Control": `max-age=0, s-maxage=${Math.floor(maxAgeMs / 1000)}`,
  };

  const cachedRaw = await kv.get(key);

  if (cachedRaw) {
    try {
      const cachedObj = JSON.parse(cachedRaw) as { cachedAt: number; data: T };
      const age = Date.now() - cachedObj.cachedAt;

      if (age < maxAgeMs) {
        return new Response(JSON.stringify(cachedObj.data), { headers });
      }

      ctx.waitUntil(
        (async () => {
          try {
            const fresh = await fetcher();
            if (!isValid || isValid(fresh)) {
              await kv.put(key, JSON.stringify({ cachedAt: Date.now(), data: fresh }));
            } else {
              console.warn("[KV-CACHE] Skipping cache update - fresh data failed validation");
            }
          } catch (err) {
            console.error("[KV-CACHE] background refresh failed", err);
          }
        })()
      );

      return new Response(JSON.stringify(cachedObj.data), {
        headers: { ...headers, "X-Cache": "stale" },
      });
    } catch (e) {
      console.error("[KV-CACHE] Failed to parse cached JSON", e);
    }
  }

  let fresh: T | null = null;
  let lastValidData: T | null = null;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      fresh = await fetcher();
      
      if (!isValid || isValid(fresh)) {
        await kv.put(key, JSON.stringify({ cachedAt: Date.now(), data: fresh }));
        return new Response(JSON.stringify(fresh), { headers });
      } else {
        console.warn(`[KV-CACHE] Attempt ${attempt + 1}/${maxAttempts} returned invalid data`);
      }
    } catch (err) {
      console.error(`[KV-CACHE] Attempt ${attempt + 1}/${maxAttempts} failed:`, err);
    }
    
    if (attempt < maxAttempts - 1) {
      await new Promise((res) => setTimeout(res, retryDelayMs));
    }
  }

  console.error(`[KV-CACHE] All ${maxAttempts} attempts failed for key: ${key}`);
  return new Response("Data temporarily unavailable", { 
    status: 503, 
    headers: {
      ...headers,
      "Retry-After": "60"
    }
  });
} 