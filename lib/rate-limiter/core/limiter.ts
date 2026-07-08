import { Clock, RateLimitConfig, RateLimitResult, StorageAdapter } from "./types";
import { RateLimitKey } from "./brands";
import { SystemClock } from "./clock";
import { getBucketStart, getBucketTtlMs, getMinRelevantBucketStart } from "./bucket-utils";
import { extractCounterState } from "./state";
import { estimateRequestCount, calculateRetryAfterMs } from "./math";

/**
 * Orchestrator class for the Sliding Window Counter Rate Limiter.
 * Integrates clock, storage, configuration, and mathematical modules.
 */
export class SlidingWindowCounterLimiter {
  private readonly config: RateLimitConfig;
  private readonly storage: StorageAdapter;
  private readonly clock: Clock;

  constructor(
    config: RateLimitConfig,
    storage: StorageAdapter,
    clock: Clock = new SystemClock()
  ) {
    this.config = config;
    this.storage = storage;
    this.clock = clock;
  }

  /**
   * Evaluates if a request under the given key is allowed.
   * Increments the bucket counter and returns the decision telemetry.
   * 
   * @param key The branded storage key for the rate limit target.
   * @param amount The cost of this request (default: 1).
   */
  async check(key: RateLimitKey, amount: number = 1): Promise<RateLimitResult> {
    const now = this.clock.now();
    const currentBucketStart = getBucketStart(now, this.config.bucketSizeMs);
    const ttlMs = getBucketTtlMs(currentBucketStart, now, this.config.windowSizeMs, this.config.bucketSizeMs);

    // Act: Increment the current bucket count in storage
    await this.storage.increment(key, currentBucketStart, amount, ttlMs);

    // Read: Retrieve active window buckets from storage
    const minRelevantStart = getMinRelevantBucketStart(now, this.config.windowSizeMs, this.config.bucketSizeMs);
    const buckets = await this.storage.getBuckets(key, minRelevantStart);

    // Process: Extract segmented counts and interpolate
    const state = extractCounterState(buckets, now, this.config);
    const estimatedCount = estimateRequestCount(state);

    const allowed = estimatedCount <= this.config.limit;
    
    // Remaining count is rounded down to represent integer allocations
    const remaining = Math.max(0, this.config.limit - Math.floor(estimatedCount));
    
    // The window is fully reset when the current bucket rolls completely past the window
    const resetTimeMs = currentBucketStart + this.config.windowSizeMs;

    const retryAfterMs = allowed
      ? 0
      : calculateRetryAfterMs(state, this.config.limit, now, this.config.bucketSizeMs);

    return {
      allowed,
      remaining,
      resetTimeMs,
      retryAfterMs,
      estimatedCount,
      telemetry: {
        currentBucketStart: state.currentBucketStart,
        currentBucketCount: state.currentBucketCount,
        previousBucketCount: state.boundaryBucketCount,
        weight: state.weight,
      },
    };
  }
}
