import { RateLimitConfig } from "./types";

/**
 * Domain-specific configuration error thrown or returned when 
 * rate-limiter rules do not align with system requirements.
 */
export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
    // Maintain correct stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ConfigurationError);
    }
  }
}

/**
 * Functional result type representing the outcome of config validation.
 */
export type ValidationResult =
  | { readonly success: true; readonly config: RateLimitConfig }
  | { readonly success: false; readonly error: ConfigurationError };

/**
 * Validates rate limiter configuration parameters.
 * Enforces mathematical correctness and memory/CPU limits.
 * 
 * @param config Raw configuration object to validate.
 */
export function validateConfig(config: unknown): ValidationResult {
  if (typeof config !== "object" || config === null) {
    return {
      success: false,
      error: new ConfigurationError("Configuration must be a non-null object"),
    };
  }

  const raw = config as Record<string, unknown>;
  const { windowSizeMs, bucketSizeMs, limit } = raw;

  if (typeof windowSizeMs !== "number" || !Number.isInteger(windowSizeMs) || windowSizeMs <= 0) {
    return {
      success: false,
      error: new ConfigurationError("windowSizeMs must be a positive integer"),
    };
  }

  if (typeof bucketSizeMs !== "number" || !Number.isInteger(bucketSizeMs) || bucketSizeMs <= 0) {
    return {
      success: false,
      error: new ConfigurationError("bucketSizeMs must be a positive integer"),
    };
  }

  if (typeof limit !== "number" || !Number.isInteger(limit) || limit <= 0) {
    return {
      success: false,
      error: new ConfigurationError("limit must be a positive integer"),
    };
  }

  if (bucketSizeMs > windowSizeMs) {
    return {
      success: false,
      error: new ConfigurationError(
        `bucketSizeMs (${bucketSizeMs}ms) cannot be larger than windowSizeMs (${windowSizeMs}ms)`
      ),
    };
  }

  if (windowSizeMs % bucketSizeMs !== 0) {
    return {
      success: false,
      error: new ConfigurationError(
        `windowSizeMs (${windowSizeMs}ms) must be perfectly divisible by bucketSizeMs (${bucketSizeMs}ms)`
      ),
    };
  }

  const bucketCount = windowSizeMs / bucketSizeMs;
  
  // Guard against high memory and lookup overhead.
  // E.g., a 1-hour window with 1-millisecond buckets would require 3.6 million storage requests.
  if (bucketCount > 120) {
    return {
      success: false,
      error: new ConfigurationError(
        `Window is split into ${bucketCount} buckets. Maximum allowed is 120 to preserve high-performance lookup speeds.`
      ),
    };
  }

  return {
    success: true,
    config: {
      windowSizeMs,
      bucketSizeMs,
      limit,
    },
  };
}
