"use client";

import React from "react";
import { RateLimitConfig } from "@/lib/rate-limiter/core/types";

interface SimulationEvent {
  readonly id: string;
  readonly timestamp: number;
  readonly allowed: boolean;
  readonly remaining: number;
  readonly resetTimeMs: number;
  readonly estimatedCount: number;
  readonly latencyMs: number;
}

interface BucketTimelineProps {
  readonly config: RateLimitConfig;
  readonly simTimeMs: number;
  readonly events: readonly SimulationEvent[];
}

/**
 * BucketTimeline component visualizes rate limiter buckets over time,
 * highlighting the active sliding window, boundary bucket weight decay,
 * and stacking allowed vs blocked requests.
 */
export function BucketTimeline({ config, simTimeMs, events }: BucketTimelineProps) {
  const numBuckets = config.windowSizeMs / config.bucketSizeMs;
  const currentBucketStart = Math.floor(simTimeMs / config.bucketSizeMs) * config.bucketSizeMs;
  const boundaryBucketStart = currentBucketStart - config.windowSizeMs;

  const buckets = [];
  for (let i = 0; i <= numBuckets; i++) {
    const timestamp = boundaryBucketStart + i * config.bucketSizeMs;
    const bucketEvents = events.filter(
      (e) => e.timestamp >= timestamp && e.timestamp < timestamp + config.bucketSizeMs
    );
    const allowed = bucketEvents.filter((e) => e.allowed).length;
    const blocked = bucketEvents.filter((e) => !e.allowed).length;
    const isCurrent = timestamp === currentBucketStart;
    const isBoundary = timestamp === boundaryBucketStart;

    let weight = 1.0;
    if (isBoundary) {
      const elapsedInCurrent = simTimeMs - currentBucketStart;
      weight = Math.max(0, (config.bucketSizeMs - elapsedInCurrent) / config.bucketSizeMs);
    }

    buckets.push({
      timestamp,
      allowed,
      blocked,
      isCurrent,
      isBoundary,
      weight,
    });
  }

  const maxRequests = Math.max(...buckets.map((b) => b.allowed + b.blocked), 5);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "20px", background: "rgba(255,255,255,0.01)", border: "1px solid var(--panel-border)", borderRadius: "8px" }}>
      <h3 style={{ fontSize: "14px", fontWeight: 600, letterSpacing: "-0.01em" }}>
        Bucket Timeline & Sliding Window
      </h3>
      
      <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", height: "160px", paddingBottom: "10px", borderBottom: "1px solid var(--panel-border)" }}>
        {buckets.map((b) => {
          const total = b.allowed + b.blocked;
          const allowedPct = total > 0 ? (b.allowed / maxRequests) * 100 : 0;
          const blockedPct = total > 0 ? (b.blocked / maxRequests) * 100 : 0;

          return (
            <div
              key={b.timestamp}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                opacity: b.isBoundary ? Math.max(0.3, b.weight) : 1,
                transition: "opacity 0.2s ease",
              }}
            >
              {/* Stacked Bar Chart */}
              <div
                style={{
                  width: "100%",
                  height: "110px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  background: b.isCurrent
                    ? "rgba(37,99,235,0.05)"
                    : b.isBoundary
                    ? "rgba(239,68,68,0.02)"
                    : "rgba(255,255,255,0.01)",
                  border: b.isCurrent
                    ? "1.5px solid #2563eb"
                    : b.isBoundary
                    ? "1px dashed rgba(239,68,68,0.4)"
                    : "1px solid var(--panel-border)",
                  borderRadius: "6px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Blocked requests at the top, Allowed at the bottom */}
                <div style={{ height: `${blockedPct}%`, width: "100%", background: "#ef4444", transition: "height 0.2s" }} />
                <div style={{ height: `${allowedPct}%`, width: "100%", background: "#22c55e", transition: "height 0.2s" }} />
                
                {/* Numeric overlays */}
                {total > 0 && (
                  <div style={{ position: "absolute", bottom: "4px", left: "0", right: "0", textAlign: "center", fontSize: "9px", fontWeight: "bold", textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>
                    {total}
                  </div>
                )}
              </div>

              {/* Labels */}
              <div style={{ fontSize: "10px", marginTop: "8px", fontFamily: "monospace", fontWeight: 500 }}>
                {b.timestamp / 1000}s
              </div>
              <div style={{ fontSize: "9px", opacity: 0.5, marginTop: "2px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.02em" }}>
                {b.isCurrent ? "Current" : b.isBoundary ? `Boundary (${Math.round(b.weight * 100)}%)` : "Active"}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Sliding Window Range Indicator */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", opacity: 0.7, fontFamily: "monospace" }}>
        <span>⏮️ Window start: {(simTimeMs - config.windowSizeMs) / 1000}s</span>
        <span style={{ fontWeight: 600, color: "#2563eb", textTransform: "uppercase", fontSize: "10px" }}>
          Sliding Window: {config.windowSizeMs / 1000}s
        </span>
        <span>Current: {simTimeMs / 1000}s ⏭️</span>
      </div>
    </div>
  );
}
