/**
 * Utility for creating compile-time Branded Types (Nominal Types).
 * Prevents developer error by ensuring that domain-specific strings
 * (e.g., raw User IDs vs. formatted Storage Keys) cannot be mixed up.
 */

declare const brandSymbol: unique symbol;

/**
 * Brand type helper. Creates a unique type wrapping the base type T.
 */
export type Brand<T, TBrand extends string> = T & { readonly [brandSymbol]: TBrand };

/**
 * Branded identifier for a unique client or user (e.g., "user_9823").
 */
export type UserId = Brand<string, "UserId">;

/**
 * Branded identifier for a fully constructed rate limiter storage key (e.g., "rl:window:user_9823").
 */
export type RateLimitKey = Brand<string, "RateLimitKey">;

/**
 * Branded identifier for an IP address.
 */
export type IpAddress = Brand<string, "IpAddress">;

/**
 * Safe constructors/assertions to cast plain strings to branded domain types.
 * In production, these can perform validation or sanitization.
 */

export function parseUserId(id: string): UserId {
  if (!id.trim()) {
    throw new Error("UserId cannot be empty or blank");
  }
  return id as UserId;
}

export function parseIpAddress(ip: string): IpAddress {
  if (!ip.trim()) {
    throw new Error("IpAddress cannot be empty or blank");
  }
  // Simple check for presence of standard ip format components
  if (!ip.includes(".") && !ip.includes(":")) {
    throw new Error(`Invalid IP address format: ${ip}`);
  }
  return ip as IpAddress;
}

export function buildRateLimitKey(prefix: string, identifier: UserId | IpAddress): RateLimitKey {
  if (!prefix.trim()) {
    throw new Error("RateLimitKey prefix cannot be empty");
  }
  return `${prefix}:${identifier}` as RateLimitKey;
}
