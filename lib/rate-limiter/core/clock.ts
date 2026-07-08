import { Clock } from "./types";

/**
 * High-performance clock implementation using the native system time.
 * Suitable for production environments (Node.js, Vercel Edge, etc.).
 */
export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }
}

/**
 * Controllable clock implementation for testing and deterministic simulations.
 * Allows time-traveling and ticking by explicit intervals.
 */
export class MockClock implements Clock {
  private currentMs: number;

  constructor(initialEpochMs: number = 0) {
    this.currentMs = initialEpochMs;
  }

  /**
   * Returns the simulated current timestamp in milliseconds.
   */
  now(): number {
    return this.currentMs;
  }

  /**
   * Manually sets the clock time to a specific epoch timestamp.
   * Monotonicity is enforced by default to replicate physical system clocks.
   * 
   * @param epochMs New simulated time in milliseconds.
   */
  setTime(epochMs: number): void {
    if (epochMs < this.currentMs) {
      throw new Error(
        `Monotonicity violation: Cannot set MockClock backward from ${this.currentMs}ms to ${epochMs}ms.`
      );
    }
    this.currentMs = epochMs;
  }

  /**
   * Advances the simulated clock forward by a specified duration in milliseconds.
   * 
   * @param durationMs Milliseconds to tick forward.
   */
  advanceBy(durationMs: number): void {
    if (durationMs < 0) {
      throw new Error(`Cannot advance MockClock by negative duration: ${durationMs}ms`);
    }
    this.currentMs += durationMs;
  }
}
