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
  readonly telemetry: {
    readonly currentBucketStart: number;
    readonly currentBucketCount: number;
    readonly previousBucketCount: number;
    readonly weight: number;
  };
}

interface MathInspectorProps {
  readonly config: RateLimitConfig;
  readonly lastEvent: SimulationEvent | null;
}

/**
 * MathInspector component renders the sliding window counter linear interpolation
 * equation dynamically, replacing variables with real-time telemetry from the simulation.
 */
export function MathInspector({ config, lastEvent }: MathInspectorProps) {
  const currentCount = lastEvent?.telemetry.currentBucketCount ?? 0;
  const boundaryCount = lastEvent?.telemetry.previousBucketCount ?? 0;
  const weight = lastEvent?.telemetry.weight ?? 1.0;
  const estimatedCount = lastEvent?.estimatedCount ?? 0.0;
  const limit = config.limit;
  
  // Back-calculate intermediate buckets count if present
  const intermediateCount = Math.max(0, Math.round(estimatedCount - currentCount - boundaryCount * weight));
  const hasIntermediate = config.windowSizeMs > config.bucketSizeMs * 2;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "20px", background: "rgba(255,255,255,0.01)", border: "1px solid var(--panel-border)", borderRadius: "8px" }}>
      <h3 style={{ fontSize: "14px", fontWeight: 600, letterSpacing: "-0.01em" }}>
        Mathematical Equation Inspector
      </h3>
      
      <div style={{ padding: "16px", background: "rgba(0,0,0,0.25)", borderRadius: "6px", fontFamily: "monospace", fontSize: "13px", border: "1px solid var(--panel-border)", lineHeight: "1.6" }}>
        <div style={{ fontSize: "11px", fontWeight: 600, color: "#60a5fa", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Interpolation Formula
        </div>
        
        {/* Abstract Formula */}
        <div style={{ fontSize: "14px", paddingBottom: "10px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", flexWrap: "wrap", gap: "4px" }}>
          <span style={{ color: "#34d399" }}>Rate</span>
          <span>=</span>
          <span style={{ color: "#60a5fa" }}>Current</span>
          {hasIntermediate && <span style={{ color: "#a78bfa" }}>+ Intermediate</span>}
          <span style={{ color: "#fb923c" }}>+ (Boundary × Weight)</span>
        </div>

        {/* Dynamic Computed Equation */}
        <div style={{ marginTop: "12px", fontSize: "15px", display: "flex", flexWrap: "wrap", gap: "4px", alignItems: "center" }}>
          <span style={{ color: "#34d399", fontWeight: 600 }}>{estimatedCount.toFixed(2)}</span>
          <span>=</span>
          <span style={{ color: "#60a5fa" }}>{currentCount}</span>
          {hasIntermediate && <span style={{ color: "#a78bfa" }}>+ {intermediateCount}</span>}
          <span style={{ color: "#fb923c" }}>+ ({boundaryCount} × {weight.toFixed(2)})</span>
        </div>
      </div>

      {/* Diagnostics Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "12px" }}>
        <div style={{ padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: "6px", border: "1px solid var(--panel-border)" }}>
          <span style={{ opacity: 0.5, display: "block", marginBottom: "4px", fontSize: "10px", textTransform: "uppercase", fontWeight: 500 }}>
            Evaluation Decision
          </span>
          <span style={{ fontWeight: 700, color: lastEvent ? (lastEvent.allowed ? "#34d399" : "#f87171") : "inherit" }}>
            {lastEvent ? (lastEvent.allowed ? "PERMITTED (HTTP 200)" : "BLOCKED (HTTP 429)") : "AWAITING REQUEST"}
          </span>
        </div>
        
        <div style={{ padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: "6px", border: "1px solid var(--panel-border)" }}>
          <span style={{ opacity: 0.5, display: "block", marginBottom: "4px", fontSize: "10px", textTransform: "uppercase", fontWeight: 500 }}>
            Window Saturation
          </span>
          <span style={{ fontWeight: 700 }}>
            {((estimatedCount / limit) * 100).toFixed(1)}% of {limit} limit
          </span>
        </div>
      </div>
    </div>
  );
}
