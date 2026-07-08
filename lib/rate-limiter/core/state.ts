import { Bucket, RateLimitConfig } from "./types";
import { getBucketStart, getMinRelevantBucketStart, calculateBoundaryWeight } from "./bucket-utils";

/**
 * Represent the structured components of a sliding window's current counts.
 */
export interface CounterState {
  readonly currentBucketStart: number;
  readonly currentBucketCount: number;
  readonly boundaryBucketCount: number;
  readonly intermediateCount: number;
  readonly weight: number; // Remaining weight of the boundary bucket (0.0 to 1.0)
}

/**
 * Processes raw buckets retrieved from storage, filters out expired entries,
 * and categorizes them into current, intermediate, and boundary counts.
 * 
 * @param buckets Array of raw bucket records.
 * @param nowMs The current epoch timestamp in milliseconds.
 * @param config The rate limiter configuration.
 */
export function extractCounterState(
  buckets: readonly Bucket[],
  nowMs: number,
  config: RateLimitConfig
): CounterState {
  const currentBucketStart = getBucketStart(nowMs, config.bucketSizeMs);
  const minRelevantStart = getMinRelevantBucketStart(nowMs, config.windowSizeMs, config.bucketSizeMs);
  const boundaryBucketStart = currentBucketStart - config.windowSizeMs;

  let currentBucketCount = 0;
  let boundaryBucketCount = 0;
  let intermediateCount = 0;

  for (const bucket of buckets) {
    // Drop buckets that have slipped entirely out of the active window
    if (bucket.timestamp < minRelevantStart) {
      continue;
    }

    if (bucket.timestamp === currentBucketStart) {
      currentBucketCount = bucket.count;
    } else if (bucket.timestamp === boundaryBucketStart) {
      boundaryBucketCount = bucket.count;
    } else if (bucket.timestamp > boundaryBucketStart && bucket.timestamp < currentBucketStart) {
      intermediateCount += bucket.count;
    }
  }

  const weight = calculateBoundaryWeight(nowMs, currentBucketStart, config.bucketSizeMs);

  return {
    currentBucketStart,
    currentBucketCount,
    boundaryBucketCount,
    intermediateCount,
    weight,
  };
}
