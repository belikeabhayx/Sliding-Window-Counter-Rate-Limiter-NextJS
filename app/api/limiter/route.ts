import { NextRequest, NextResponse } from "next/server";
import Redis from "ioredis";
import { SlidingWindowCounterLimiter } from "@/lib/rate-limiter/core/limiter";
import { MemoryStorageAdapter } from "@/lib/rate-limiter/storage/memory";
import { RedisStorageAdapter } from "@/lib/rate-limiter/storage/redis";
import { parseUserId, buildRateLimitKey } from "@/lib/rate-limiter/core/brands";
import { validateConfig } from "@/lib/rate-limiter/core/config";

// Global cache for storage adapters and limiters
let globalStorage: any = null;
let globalLimiter: SlidingWindowCounterLimiter | null = null;

/**
 * Initializes and caches the singleton rate limiter instance.
 * Defaults to memory, falling back to Redis if REDIS_URL is configured.
 */
function getLimiter(): SlidingWindowCounterLimiter {
  if (globalLimiter) {
    return globalLimiter;
  }

  const configValidation = validateConfig({
    windowSizeMs: 60000, // 60-second sliding window
    bucketSizeMs: 10000, // 10-second bucket intervals
    limit: 10,           // 10 requests max per window
  });

  if (!configValidation.success) {
    throw configValidation.error;
  }

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });
    globalStorage = new RedisStorageAdapter(redisClient);
  } else {
    globalStorage = new MemoryStorageAdapter();
  }

  globalLimiter = new SlidingWindowCounterLimiter(configValidation.config, globalStorage);
  return globalLimiter;
}

/**
 * HTTP Route Handler for checking rate limit quotas.
 * Extracts client identification, processes limits, and returns RFC-compliant headers.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    
    // Fall back to client IP address if userId query parameter is absent
    const rawId = searchParams.get("userId") || 
                  request.headers.get("x-forwarded-for")?.split(",")[0] || 
                  request.headers.get("x-real-ip") || 
                  "127.0.0.1";
                  
    const userId = parseUserId(rawId);
    const key = buildRateLimitKey("rl:api", userId);

    const limiter = getLimiter();
    const result = await limiter.check(key);

    const responseHeaders = new Headers({
      "Content-Type": "application/json",
      "X-RateLimit-Limit": "10",
      "X-RateLimit-Remaining": result.remaining.toString(),
      "X-RateLimit-Reset": Math.ceil(result.resetTimeMs / 1000).toString(),
    });

    if (!result.allowed) {
      // RFC 7231 specifies Retry-After header should be in seconds (minimum 1s)
      const retryAfterSec = Math.ceil(result.retryAfterMs / 1000);
      responseHeaders.set("Retry-After", retryAfterSec.toString());
      
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: "Too Many Requests",
          ...result,
        }),
        {
          status: 429,
          headers: responseHeaders,
        }
      );
    }

    return new NextResponse(
      JSON.stringify({
        success: true,
        ...result,
      }),
      {
        status: 200,
        headers: responseHeaders,
      }
    );
  } catch (err: any) {
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Internal Server Error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
