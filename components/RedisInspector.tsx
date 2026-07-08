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

interface RedisInspectorProps {
  readonly config: RateLimitConfig;
  readonly lastEvent: SimulationEvent | null;
}

/**
 * RedisInspector component outputs real-time Redis CLI command equivalences
 * for database operations triggered by rate-limit request checks.
 */
export function RedisInspector({ config, lastEvent }: RedisInspectorProps) {
  if (!lastEvent) {
    return (
      <div style={{ padding: "20px", borderTop: "1px solid var(--panel-border)", fontSize: "12px", opacity: 0.5, textAlign: "center" }}>
        Awaiting requests to inspect database commands...
      </div>
    );
  }

  const key = "rl:sim:sim_user";
  const currentBucketStart = lastEvent.telemetry.currentBucketStart;
  
  // Calculate exact TTL
  const ttlMs = (currentBucketStart + config.windowSizeMs + config.bucketSizeMs) - lastEvent.timestamp;
  
  // Calculate mock expired field timestamp
  const expiredField = currentBucketStart - config.windowSizeMs - config.bucketSizeMs;

  return (
    <div style={{ padding: "20px", borderTop: "1px solid var(--panel-border)", display: "flex", flexDirection: "column", gap: "12px" }}>
      <h3 style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--workspace-fg)", opacity: 0.8 }}>
        Database Command Inspector (Redis CLI)
      </h3>
      
      <pre style={{
        margin: 0,
        padding: "14px",
        background: "#09090b",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: "6px",
        fontFamily: "var(--font-geist-mono), monospace",
        fontSize: "11px",
        color: "#a1a1aa",
        overflowX: "auto",
        lineHeight: "1.6"
      }}>
        {/* MULTI / HINCRBY / PEXPIRE */}
        <span style={{ color: "#e4e4e7" }}>127.0.0.1:6379&gt;</span> MULTI<br />
        <span style={{ color: "#71717a" }}>OK</span><br />
        
        <span style={{ color: "#e4e4e7" }}>127.0.0.1:6379&gt;</span> HINCRBY <span style={{ color: "#60a5fa" }}>{key}</span> <span style={{ color: "#fb923c" }}>{currentBucketStart}</span> 1<br />
        <span style={{ color: "#71717a" }}>QUEUED</span><br />
        
        <span style={{ color: "#e4e4e7" }}>127.0.0.1:6379&gt;</span> PEXPIRE <span style={{ color: "#60a5fa" }}>{key}</span> <span style={{ color: "#facc15" }}>{ttlMs}</span><br />
        <span style={{ color: "#71717a" }}>QUEUED</span><br />
        
        <span style={{ color: "#e4e4e7" }}>127.0.0.1:6379&gt;</span> EXEC<br />
        <span style={{ color: "#71717a" }}>1) (integer) {lastEvent.telemetry.currentBucketCount}<br />2) (integer) 1</span><br /><br />

        {/* HGETALL */}
        <span style={{ color: "#e4e4e7" }}>127.0.0.1:6379&gt;</span> HGETALL <span style={{ color: "#60a5fa" }}>{key}</span><br />
        <span style={{ color: "#71717a" }}>
          1) &quot;{currentBucketStart}&quot;<br />
          2) &quot;{lastEvent.telemetry.currentBucketCount}&quot;<br />
          {lastEvent.telemetry.previousBucketCount > 0 && (
            <>
              3) &quot;{currentBucketStart - config.windowSizeMs}&quot;<br />
              4) &quot;{lastEvent.telemetry.previousBucketCount}&quot;<br />
            </>
          )}
        </span><br />

        {/* HDEL (if expired field exists) */}
        {expiredField > 0 && (
          <>
            <span style={{ color: "#e4e4e7" }}>127.0.0.1:6379&gt;</span> HDEL <span style={{ color: "#60a5fa" }}>{key}</span> <span style={{ color: "#ef4444" }}>{expiredField}</span><br />
            <span style={{ color: "#71717a" }}>(integer) 1</span>
          </>
        )}
      </pre>
    </div>
  );
}
