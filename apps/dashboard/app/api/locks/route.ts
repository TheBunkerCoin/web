import { withKvCache } from "@/app/api/utils/kv-cache";
import { getLockData, LockSummary } from "@/lib/solana";
import { getCloudflareContext } from "@opennextjs/cloudflare";


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  if (searchParams.get('uncached')) {
    try {
      const data = await getLockData();
      
      try {
        const { env } = getCloudflareContext();
        const kv = (env as any)["BUNKERCOIN_APP_CACHE"] as any;
        if (kv) {
          await kv.put(
            "lock-data", 
            JSON.stringify({ 
              cachedAt: Date.now(), 
              data 
            })
          );
          console.log('[LOCKS API] Cache refreshed with fresh data');
        }
      } catch (cacheError) {
        console.error('[LOCKS API] Failed to update cache:', cacheError);
      }
      
      return new Response(JSON.stringify(data), { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'X-Cache': 'miss'
        } 
      });
    } catch (e) {
      console.error('[LOCKS API] Failed to fetch fresh data:', e);
      return new Response(JSON.stringify({ error: 'failed_to_fetch' }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
  }
  

  return withKvCache<LockSummary>(
    "lock-data",
    30 * 60 * 1000,
    getLockData,
    (d) => d && typeof d === "object" && (d as LockSummary).totalLocked > 0
  );
}