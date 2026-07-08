/**
 * Core type definitions for the Sliding Window Counter Rate Limiter.
 * Enforces immutable state and strict domain contracts.
 */

export interface Clock {
  /**
   * Returns the current Unix timestamp in milliseconds.
   */
  now(): number;
}

export interface RateLimitConfig {
  /** The total duration of the sliding window in milliseconds (e.g., 60,000ms). */
  readonly windowSizeMs: number;
  /** The size of individual fixed time buckets in milliseconds (e.g., 10,000ms). */
  readonly bucketSizeMs: number;
  /** The maximum number of allowed requests within the sliding window. */
  readonly limit: number;
}

export interface Bucket {
  /** The starting epoch timestamp of this bucket in milliseconds. */
  readonly timestamp: number;
  /** The cumulative request count recorded in this bucket. */
  readonly count: number;
}

export interface RateLimitResult {
  /** True if the request is permitted; false otherwise. */
  readonly allowed: boolean;
  /** The number of remaining requests allowed in the current window. */
  readonly remaining: number;
  /** The epoch timestamp in milliseconds when the limit fully resets. */
  readonly resetTimeMs: number;
  /** The interpolated estimated request count across the sliding window. */
  readonly estimatedCount: number;
  /** Detailed debug telemetry of the window state at the moment of evaluation. */
  readonly telemetry: {
    readonly currentBucketStart: number;
    readonly currentBucketCount: number;
    readonly previousBucketCount: number;
    readonly weight: number; // Remaining weight of the previous bucket (0.0 to 1.0)
  };
}

export interface StorageAdapter {
  /**
   * Retrieves all buckets that overlap with or exist within the evaluation window.
   * @param key The rate limit identifier (e.g., "rate_limit:user_123").
   * @param minTimestampMs The earliest bucket timestamp we care about (current time - window size).
   */
  getBuckets(key: string, minTimestampMs: number): Promise<readonly Bucket[]>;

  /**
   * Increments the count for a specific bucket and sets/extends its TTL.
   * Must be atomic in implementation to prevent race conditions.
   * @param key The rate limit identifier.
   * @param bucketTimestamp The starting timestamp of the bucket to increment.
   * @param amount The value to increment by (typically 1).
   * @param ttlMs Time-to-live for the bucket storage key.
   * @returns The updated count for that bucket.
   */
  increment(key: string, bucketTimestamp: number, amount: number, ttlMs: number): Promise<number>;
}
