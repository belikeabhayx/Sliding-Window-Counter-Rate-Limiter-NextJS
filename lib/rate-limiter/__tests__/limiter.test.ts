import { describe, it } from "node:test";
import assert from "node:assert";
import { SlidingWindowCounterLimiter } from "../core/limiter";
import { MockClock } from "../core/clock";
import { MemoryStorageAdapter } from "../storage/memory";
import { parseUserId, buildRateLimitKey } from "../core/brands";
import { RateLimitConfig } from "../core/types";

describe("Sliding Window Counter Rate Limiter Math & Logic", () => {
  const config: RateLimitConfig = {
    windowSizeMs: 60000, // 60s
    bucketSizeMs: 10000, // 10s
    limit: 10,
  };

  it("should allow requests under the limit and then block them", async () => {
    const clock = new MockClock(100000); // Start at epoch 100s
    const storage = new MemoryStorageAdapter();
    const limiter = new SlidingWindowCounterLimiter(config, storage, clock);
    const key = buildRateLimitKey("rl", parseUserId("user_1"));

    // Make exactly 10 requests (equal to limit)
    for (let i = 0; i < 10; i++) {
      const res = await limiter.check(key);
      assert.strictEqual(res.allowed, true);
      assert.strictEqual(res.remaining, 10 - (i + 1));
    }

    // 11th request must be blocked
    const blockedRes = await limiter.check(key);
    assert.strictEqual(blockedRes.allowed, false);
    assert.strictEqual(blockedRes.remaining, 0);
  });

  it("should interpolate counts correctly across sliding window boundaries", async () => {
    const clock = new MockClock(100000); // Start at epoch 100s (Bucket [100s, 110s])
    const storage = new MemoryStorageAdapter();
    const limiter = new SlidingWindowCounterLimiter(config, storage, clock);
    const key = buildRateLimitKey("rl", parseUserId("user_2"));

    // Insert 8 requests in the current bucket [100s, 110s]
    for (let i = 0; i < 8; i++) {
      await limiter.check(key);
    }

    // Advance clock by 60s to next window segment [160s, 170s]
    // The bucket starting at 100s becomes the boundary bucket (with 8 requests)
    clock.advanceBy(60000);

    // At exactly 160s, the boundary bucket has 100% weight.
    // The estimate starts at 8 requests. Let's make 2 requests.
    const res1 = await limiter.check(key); // Count becomes 9 (8 from boundary + 1 new)
    assert.strictEqual(res1.allowed, true);

    const res2 = await limiter.check(key); // Count becomes 10 (8 from boundary + 2 new)
    assert.strictEqual(res2.allowed, true);

    const res3 = await limiter.check(key); // Count becomes 11 (8 from boundary + 3 new) - Blocked!
    assert.strictEqual(res3.allowed, false);

    // Now advance clock by 5s (50% elapsed in current bucket).
    // The weight of the boundary bucket drops to 0.5.
    // Boundary contribution = 8 * 0.5 = 4 requests.
    // Current bucket count = 3 requests.
    // Estimated = 4 + 3 = 7 requests.
    clock.advanceBy(5000);
    const res4 = await limiter.check(key); // Estimate becomes 7 + 1 new = 8 requests. Allowed!
    assert.strictEqual(res4.allowed, true);
    assert.strictEqual(res4.estimatedCount, 8);
  });

  it("should calculate correct retry-after backoffs", async () => {
    const clock = new MockClock(100000);
    const storage = new MemoryStorageAdapter();
    const limiter = new SlidingWindowCounterLimiter(config, storage, clock);
    const key = buildRateLimitKey("rl", parseUserId("user_3"));

    // Exhaust limit (10 requests)
    for (let i = 0; i < 10; i++) {
      await limiter.check(key);
    }

    // 11th request is blocked
    const res = await limiter.check(key);
    assert.strictEqual(res.allowed, false);

    // Since all 11 requests are in the current bucket, the boundary bucket count is 0.
    // We must wait until the current bucket rolls over (which is in 10s).
    assert.strictEqual(res.telemetry.previousBucketCount, 0);
    // Since now is 100s, and bucket started at 100s, time to rollover is exactly 10s (10000ms)
    assert.strictEqual(res.telemetry.currentBucketCount, 11);
    assert.strictEqual(res.resetTimeMs, 160000); // 100s + 60s window
  });
});
