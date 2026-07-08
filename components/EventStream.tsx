"use client";

import React from "react";

interface SimulationEvent {
  readonly id: string;
  readonly timestamp: number;
  readonly allowed: boolean;
  readonly remaining: number;
  readonly resetTimeMs: number;
  readonly estimatedCount: number;
  readonly latencyMs: number;
}

interface EventStreamProps {
  readonly events: readonly SimulationEvent[];
  readonly limit: number;
  readonly onClear: () => void;
}

/**
 * EventStream component displays a structured tabular stream of rate-limiting events.
 * It provides status indicators, estimated window rates, and latency details.
 */
export function EventStream({ events, limit, onClear }: EventStreamProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "20px" }}>
      {/* Header Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h3 style={{ fontSize: "15px", fontWeight: 600, letterSpacing: "-0.01em" }}>
          Live Event Stream ({events.length})
        </h3>
        <button
          onClick={onClear}
          style={{
            padding: "4px 10px",
            background: "rgba(239, 68, 68, 0.1)",
            color: "#f87171",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: "4px",
            fontSize: "11px",
            fontWeight: 500,
            cursor: "pointer",
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)")}
        >
          Clear Logs
        </button>
      </div>

      {/* Structured Logs Table */}
      <div style={{ flexGrow: 1, overflowY: "auto", border: "1px solid var(--panel-border)", borderRadius: "6px" }}>
        {events.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", fontSize: "12px", opacity: 0.5 }}>
            No requests simulated yet. Use the Traffic Generator on the left to begin streaming events.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--panel-border)" }}>
                <th style={{ padding: "10px", fontWeight: 600, opacity: 0.7 }}>REQ ID</th>
                <th style={{ padding: "10px", fontWeight: 600, opacity: 0.7 }}>TIME</th>
                <th style={{ padding: "10px", fontWeight: 600, opacity: 0.7 }}>STATUS</th>
                <th style={{ padding: "10px", fontWeight: 600, opacity: 0.7 }}>EST. RATE</th>
                <th style={{ padding: "10px", fontWeight: 600, opacity: 0.7 }}>LATENCY</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr 
                  key={e.id} 
                  style={{ 
                    borderBottom: "1px solid rgba(255,255,255,0.02)",
                    background: e.allowed ? "transparent" : "rgba(239, 68, 68, 0.02)"
                  }}
                >
                  <td style={{ padding: "10px", fontFamily: "monospace", fontWeight: 500 }}>{e.id}</td>
                  <td style={{ padding: "10px", opacity: 0.6, fontFamily: "monospace" }}>{e.timestamp}ms</td>
                  <td style={{ padding: "10px" }}>
                    <span style={{
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontSize: "10px",
                      fontWeight: 600,
                      background: e.allowed ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                      color: e.allowed ? "#4ade80" : "#f87171"
                    }}>
                      {e.allowed ? "ALLOW" : "BLOCK"}
                    </span>
                  </td>
                  <td style={{ padding: "10px", fontFamily: "monospace" }}>
                    {e.estimatedCount.toFixed(1)} / {limit}
                  </td>
                  <td style={{ 
                    padding: "10px", 
                    fontFamily: "monospace",
                    color: e.latencyMs > 8 ? "#facc15" : "#4ade80"
                  }}>
                    {e.latencyMs}ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
