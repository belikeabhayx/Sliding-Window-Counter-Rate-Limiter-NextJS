import { CounterState } from "./state";

/**
 * Pure mathematical functions for Sliding Window Counter interpolation 
 * and retry-after calculations.
 */

/**
 * Estimates the request count within the sliding window using weighted linear interpolation.
 * 
 * Equation:
 * N_est = N_current + N_intermediate + (N_boundary * Weight_boundary)
 * 
 * @param state The structured window segment counts.
 */
export function estimateRequestCount(state: CounterState): number {
  const boundaryContribution = state.boundaryBucketCount * state.weight;
  return state.currentBucketCount + state.intermediateCount + boundaryContribution;
}

/**
 * Calculates the recommended retry-after delay in milliseconds for rate-limited clients.
 * Returns 0 if the client is within limits.
 * 
 * @param state The structured window segment counts.
 * @param limit The maximum allowed requests in the window.
 * @param nowMs The current epoch timestamp in milliseconds.
 * @param bucketSizeMs The size of individual buckets in milliseconds.
 */
export function calculateRetryAfterMs(
  state: CounterState,
  limit: number,
  nowMs: number,
  bucketSizeMs: number
): number {
  const estimatedCount = estimateRequestCount(state);
  
  if (estimatedCount <= limit) {
    return 0;
  }

  const excess = estimatedCount - limit;

  // Time remaining in the current bucket before it rolls over.
  const timeToNextBucket = Math.max(0, (state.currentBucketStart + bucketSizeMs) - nowMs);

  if (state.boundaryBucketCount > 0) {
    // Calculate the duration needed for the boundary bucket's decay to clear the excess.
    // excess = boundaryBucketCount * (decayMs / bucketSizeMs)
    // => decayMs = (excess / boundaryBucketCount) * bucketSizeMs
    const decayMs = (excess / state.boundaryBucketCount) * bucketSizeMs;
    
    // We cannot decay past the current bucket's rollover boundary in this calculation step.
    const waitTimeMs = Math.min(decayMs, timeToNextBucket);
    
    // Ensure we return at least 1ms to prevent immediate spinning retries.
    return Math.ceil(Math.max(1, waitTimeMs));
  }

  // If the boundary bucket has 0 requests, no amount of decay inside the current bucket
  // will reduce the count. The client must wait for the current bucket to roll over.
  return Math.ceil(Math.max(1, timeToNextBucket));
}
