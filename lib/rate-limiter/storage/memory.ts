import { Bucket, StorageAdapter } from "../core/types";
import { RateLimitKey } from "../core/brands";

/**
 * Representation of a bucket stored in memory with an absolute expiration epoch.
 */
interface StoredBucket {
  count: number;
  readonly expiresAt: number;
}

/**
 * High-performance, in-memory StorageAdapter.
 * Employs lazy eviction to prune expired buckets and empty keys without 
 * scheduling event loop blocking timers (setTimeout).
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private readonly store = new Map<RateLimitKey, Map<number, StoredBucket>>();

  /**
   * Retrieves active buckets for a key, filtering out expired ones.
   * 
   * @param key The branded storage key.
   * @param minTimestampMs Earliest bucket start timestamp we care about.
   */
  async getBuckets(key: RateLimitKey, minTimestampMs: number): Promise<readonly Bucket[]> {
    const innerMap = this.store.get(key);
    if (!innerMap) {
      return [];
    }

    const now = Date.now();
    const result: Bucket[] = [];

    for (const [timestamp, stored] of innerMap.entries()) {
      if (stored.expiresAt <= now) {
        innerMap.delete(timestamp);
      } else if (timestamp >= minTimestampMs) {
        result.push({
          timestamp,
          count: stored.count,
        });
      }
    }

    // Clean up empty parent map to avoid leaking keys of inactive users
    if (innerMap.size === 0) {
      this.store.delete(key);
    }

    return result;
  }

  /**
   * Atomically increments the bucket count in memory.
   * Runs lazy eviction on the target key's buckets to limit memory footprint.
   * 
   * @param key The branded storage key.
   * @param bucketTimestamp Starting timestamp of the target bucket.
   * @param amount The value to increment by.
   * @param ttlMs Time-to-live duration in milliseconds.
   */
  async increment(key: RateLimitKey, bucketTimestamp: number, amount: number, ttlMs: number): Promise<number> {
    let innerMap = this.store.get(key);
    if (!innerMap) {
      innerMap = new Map<number, StoredBucket>();
      this.store.set(key, innerMap);
    }

    const now = Date.now();
    const expiresAt = now + ttlMs;

    // Prune stale buckets under this key before inserting
    for (const [timestamp, stored] of innerMap.entries()) {
      if (stored.expiresAt <= now) {
        innerMap.delete(timestamp);
      }
    }

    const existing = innerMap.get(bucketTimestamp);
    const newCount = (existing ? existing.count : 0) + amount;

    innerMap.set(bucketTimestamp, {
      count: newCount,
      expiresAt: existing ? Math.max(existing.expiresAt, expiresAt) : expiresAt,
    });

    return newCount;
  }

  /**
   * Instantly clears all stored entries. Used primarily in test suites.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Returns the count of active unique keys in the store.
   */
  get size(): number {
    return this.store.size;
  }
}
