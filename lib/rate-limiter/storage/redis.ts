import { Redis } from "ioredis";
import { Bucket, StorageAdapter } from "../core/types";
import { RateLimitKey } from "../core/brands";

/**
 * Industrial-grade Redis StorageAdapter.
 * Represents rate-limiting windows as Redis Hashes where fields are bucket 
 * timestamps and values are request counts. Uses atomic transactions (MULTI/EXEC)
 * and lazy eviction of expired hash fields.
 */
export class RedisStorageAdapter implements StorageAdapter {
  private readonly redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Retrieves active buckets from a Redis Hash, filtering expired fields
   * in memory and firing a lazy background HDEL to prune them.
   * 
   * @param key The branded storage key.
   * @param minTimestampMs Earliest bucket start timestamp we care about.
   */
  async getBuckets(key: RateLimitKey, minTimestampMs: number): Promise<readonly Bucket[]> {
    const raw = await this.redis.hgetall(key);
    if (!raw || Object.keys(raw).length === 0) {
      return [];
    }

    const result: Bucket[] = [];
    const expiredFields: string[] = [];

    for (const [field, valStr] of Object.entries(raw)) {
      const timestamp = parseInt(field, 10);
      const count = parseInt(valStr, 10);

      if (isNaN(timestamp) || isNaN(count)) {
        continue;
      }

      if (timestamp < minTimestampMs) {
        expiredFields.push(field);
      } else {
        result.push({
          timestamp,
          count,
        });
      }
    }

    // Lazily clean up stale fields in background to preserve memory
    if (expiredFields.length > 0) {
      this.redis.hdel(key, ...expiredFields).catch(() => {
        // Suppress background errors to avoid failing the critical read path
      });
    }

    return result;
  }

  /**
   * Increments the bucket counter and extends the key's TTL in an atomic transaction.
   * 
   * @param key The branded storage key.
   * @param bucketTimestamp Starting timestamp of the target bucket.
   * @param amount The value to increment by.
   * @param ttlMs Key expiration duration in milliseconds.
   */
  async increment(key: RateLimitKey, bucketTimestamp: number, amount: number, ttlMs: number): Promise<number> {
    const field = bucketTimestamp.toString();

    // Group updates in a MULTI block to execute them atomically on the Redis server
    const transaction = this.redis.multi();
    transaction.hincrby(key, field, amount);
    transaction.pexpire(key, ttlMs);

    const execResult = await transaction.exec();
    if (!execResult) {
      throw new Error(`Failed to execute Redis transaction for key: ${key}`);
    }

    // ioredis reply format: [ [err, result], [err, result] ]
    const hincrbyReply = execResult[0];
    if (!hincrbyReply) {
      throw new Error(`Invalid Redis reply format for key: ${key}`);
    }

    const [err, res] = hincrbyReply;
    if (err) {
      throw err;
    }

    return res as number;
  }
}
