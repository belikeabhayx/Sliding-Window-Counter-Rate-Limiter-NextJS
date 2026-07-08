"use client";

import React, { useState } from "react";
import { validateConfig } from "@/lib/rate-limiter/core/config";
import { RateLimitConfig } from "@/lib/rate-limiter/core/types";

interface ConfigPlaygroundProps {
  readonly currentConfig: RateLimitConfig;
  readonly onConfigChange: (config: RateLimitConfig) => void;
  readonly onGenerateTraffic: (pattern: string, count: number) => void;
}

/**
 * ConfigPlayground component allows interactive adjustments of rate-limiter configurations
 * and provides traffic generation utilities to trigger simulation requests.
 */
export function ConfigPlayground({
  currentConfig,
  onConfigChange,
  onGenerateTraffic,
}: ConfigPlaygroundProps) {
  const [windowSec, setWindowSec] = useState(currentConfig.windowSizeMs / 1000);
  const [bucketSec, setBucketSec] = useState(currentConfig.bucketSizeMs / 1000);
  const [limit, setLimit] = useState(currentConfig.limit);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = {
      windowSizeMs: windowSec * 1000,
      bucketSizeMs: bucketSec * 1000,
      limit: Number(limit),
    };

    const res = validateConfig(raw);
    if (res.success) {
      setErrorMsg(null);
      onConfigChange(res.config);
    } else {
      setErrorMsg(res.error.message);
    }
  };

  return (
    <div className="playground-container" style={{ padding: "20px" }}>
      <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "16px", letterSpacing: "-0.01em" }}>
        Configuration Playground
      </h3>
      
      <form onSubmit={handleApply} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div>
          <label style={{ display: "block", fontSize: "11px", opacity: 0.7, marginBottom: "6px", textTransform: "uppercase", fontWeight: 500 }}>
            Window Size (Seconds)
          </label>
          <input
            type="number"
            min={1}
            value={windowSec}
            onChange={(e) => setWindowSec(Number(e.target.value))}
            style={{ width: "100%", padding: "9px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--panel-border)", borderRadius: "6px", color: "inherit", fontSize: "13px" }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "11px", opacity: 0.7, marginBottom: "6px", textTransform: "uppercase", fontWeight: 500 }}>
            Bucket Size (Seconds)
          </label>
          <input
            type="number"
            min={1}
            value={bucketSec}
            onChange={(e) => setBucketSec(Number(e.target.value))}
            style={{ width: "100%", padding: "9px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--panel-border)", borderRadius: "6px", color: "inherit", fontSize: "13px" }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "11px", opacity: 0.7, marginBottom: "6px", textTransform: "uppercase", fontWeight: 500 }}>
            Limit (Max Requests)
          </label>
          <input
            type="number"
            min={1}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            style={{ width: "100%", padding: "9px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--panel-border)", borderRadius: "6px", color: "inherit", fontSize: "13px" }}
          />
        </div>

        {errorMsg && (
          <div style={{ color: "#f87171", fontSize: "11px", fontWeight: 500, lineHeight: "1.4" }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <button
          type="submit"
          style={{
            padding: "10px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontWeight: 600,
            fontSize: "12px",
            cursor: "pointer",
            transition: "opacity 0.2s",
          }}
        >
          Apply Config
        </button>
      </form>

      <hr style={{ margin: "24px 0", border: "0", borderTop: "1px solid var(--panel-border)" }} />

      <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "16px", letterSpacing: "-0.01em" }}>
        Traffic Generator
      </h3>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <button
          onClick={() => onGenerateTraffic("single", 1)}
          style={{ padding: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--panel-border)", borderRadius: "6px", color: "inherit", cursor: "pointer", textAlign: "left", fontSize: "12px" }}
        >
          ⚡ Send 1 Request
        </button>
        <button
          onClick={() => onGenerateTraffic("burst", 5)}
          style={{ padding: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--panel-border)", borderRadius: "6px", color: "inherit", cursor: "pointer", textAlign: "left", fontSize: "12px" }}
        >
          🔥 Send Burst (5 requests)
        </button>
        <button
          onClick={() => onGenerateTraffic("poisson", 30)}
          style={{ padding: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--panel-border)", borderRadius: "6px", color: "inherit", cursor: "pointer", textAlign: "left", fontSize: "12px" }}
        >
          📊 Simulate Poisson Traffic (30 reqs)
        </button>
        <button
          onClick={() => onGenerateTraffic("spike", 50)}
          style={{ padding: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--panel-border)", borderRadius: "6px", color: "inherit", cursor: "pointer", textAlign: "left", fontSize: "12px" }}
        >
          📈 Simulate Traffic Spike (50 reqs)
        </button>
      </div>
    </div>
  );
}
