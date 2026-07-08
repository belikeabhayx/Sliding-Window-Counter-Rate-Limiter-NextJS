/**
 * Pure mathematical utilities for mapping timestamps to fixed-size buckets,
 * calculating window boundaries, weights, and time-to-live values.
 */

/**
 * Aligns an arbitrary timestamp to the start of its fixed-size bucket.
 * 
 * @param timestampMs The epoch timestamp in milliseconds.
 * @param bucketSizeMs The size of the bucket in milliseconds.
 */
export function getBucketStart(timestampMs: number, bucketSizeMs: number): number {
  return Math.floor(timestampMs / bucketSizeMs) * bucketSizeMs;
}

/**
 * Calculates the earliest bucket start timestamp that is relevant to the sliding window.
 * Any bucket starting before this timestamp has expired and can be ignored.
 * 
 * @param nowMs The current epoch timestamp in milliseconds.
 * @param windowSizeMs The sliding window size in milliseconds.
 * @param bucketSizeMs The bucket size in milliseconds.
 */
export function getMinRelevantBucketStart(nowMs: number, windowSizeMs: number, bucketSizeMs: number): number {
  return getBucketStart(nowMs - windowSizeMs, bucketSizeMs);
}

/**
 * Computes the remaining weight (0.0 to 1.0) of the previous boundary bucket.
 * The weight decays linearly as time advances in the current bucket.
 * 
 * @param nowMs The current epoch timestamp in milliseconds.
 * @param currentBucketStartMs The starting timestamp of the current active bucket.
 * @param bucketSizeMs The size of each bucket in milliseconds.
 */
export function calculateBoundaryWeight(nowMs: number, currentBucketStartMs: number, bucketSizeMs: number): number {
  const elapsedInCurrent = nowMs - currentBucketStartMs;
  // If clock drift or latency makes nowMs < currentBucketStartMs, default elapsed to 0
  const safeElapsed = Math.max(0, elapsedInCurrent);
  const remainingInCurrent = bucketSizeMs - safeElapsed;
  const weight = remainingInCurrent / bucketSizeMs;
  
  // Clamp weight between 0.0 and 1.0 to protect against floating point or NTP anomalies
  return Math.max(0.0, Math.min(1.0, weight));
}

/**
 * Computes the optimal TTL in milliseconds for a bucket.
 * A bucket is no longer needed once it shifts completely outside the evaluation window.
 * 
 * @param bucketTimestampMs The starting timestamp of the target bucket.
 * @param nowMs The current epoch timestamp in milliseconds.
 * @param windowSizeMs The sliding window size in milliseconds.
 * @param bucketSizeMs The bucket size in milliseconds.
 */
export function getBucketTtlMs(
  bucketTimestampMs: number,
  nowMs: number,
  windowSizeMs: number,
  bucketSizeMs: number
): number {
  const expirationTimeMs = bucketTimestampMs + windowSizeMs + bucketSizeMs;
  const ttlMs = expirationTimeMs - nowMs;
  
  // Ensure a minimum TTL of at least 1ms so storage engines enforce expiration
  return Math.max(1, ttlMs);
}
