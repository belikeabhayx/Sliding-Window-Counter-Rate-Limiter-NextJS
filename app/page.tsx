"use client";

import React, { useState, useRef } from "react";
import { ResizableLayout } from "@/components/ResizableLayout";
import { ConfigPlayground } from "@/components/ConfigPlayground";
import { BucketTimeline } from "@/components/BucketTimeline";
import { MathInspector } from "@/components/MathInspector";
import { EventStream } from "@/components/EventStream";
import { RedisInspector } from "@/components/RedisInspector";
import { MockClock } from "@/lib/rate-limiter/core/clock";
import { MemoryStorageAdapter } from "@/lib/rate-limiter/storage/memory";
import { SlidingWindowCounterLimiter } from "@/lib/rate-limiter/core/limiter";
import { buildRateLimitKey, parseUserId } from "@/lib/rate-limiter/core/brands";
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

export default function Home() {
  const [config, setConfig] = useState<RateLimitConfig>({
    windowSizeMs: 60000,
    bucketSizeMs: 10000,
    limit: 10,
  });

  const [simTimeMs, setSimTimeMs] = useState(100000); // 100s start
  const [events, setEvents] = useState<readonly SimulationEvent[]>([]);

  // Simulation instances maintained in refs to prevent recreation on state updates
  const clockRef = useRef<MockClock | null>(null);
  const storageRef = useRef<MemoryStorageAdapter | null>(null);
  const limiterRef = useRef<SlidingWindowCounterLimiter | null>(null);
  const requestCounter = useRef(1);

  if (!clockRef.current) {
    clockRef.current = new MockClock(simTimeMs);
    storageRef.current = new MemoryStorageAdapter();
    limiterRef.current = new SlidingWindowCounterLimiter(config, storageRef.current, clockRef.current);
  }

  const handleConfigChange = (newConfig: RateLimitConfig) => {
    setConfig(newConfig);
    limiterRef.current = new SlidingWindowCounterLimiter(newConfig, storageRef.current!, clockRef.current!);
  };

  const handleClearLogs = () => {
    setEvents([]);
    if (storageRef.current) {
      storageRef.current.clear();
    }
  };

  const processRequest = async (timeOffsetMs: number) => {
    if (!clockRef.current || !limiterRef.current) return;

    // Advance clock to target timestamp
    const targetTime = clockRef.current.now() + timeOffsetMs;
    clockRef.current.setTime(targetTime);
    setSimTimeMs(targetTime);

    const key = buildRateLimitKey("rl:sim", parseUserId("sim_user"));
    const latencyMs = Math.floor(Math.random() * 8) + 2; // 2-10ms simulated latency
    
    const result = await limiterRef.current.check(key);

    const newEvent: SimulationEvent = {
      id: `req_${requestCounter.current++}`,
      timestamp: targetTime,
      allowed: result.allowed,
      remaining: result.remaining,
      resetTimeMs: result.resetTimeMs,
      estimatedCount: result.estimatedCount,
      latencyMs,
      telemetry: result.telemetry,
    };

    setEvents((prev) => [newEvent, ...prev]);
  };

  const handleGenerateTraffic = async (pattern: string, count: number) => {
    if (pattern === "single") {
      await processRequest(0);
    } else if (pattern === "burst") {
      // Rapid sequence of requests spaced 20ms apart
      for (let i = 0; i < count; i++) {
        await processRequest(20);
      }
    } else if (pattern === "poisson") {
      // Exponential distribution spacing (average 200ms apart)
      for (let i = 0; i < count; i++) {
        const interval = Math.floor(-Math.log(Math.random()) * 200) + 10;
        await processRequest(interval);
      }
    } else if (pattern === "spike") {
      // Massive spike of 50 requests in rapid succession
      for (let i = 0; i < count; i++) {
        const interval = Math.floor(Math.random() * 5);
        await processRequest(interval);
      }
    }
  };

  return (
    <ResizableLayout
      left={
        <ConfigPlayground
          currentConfig={config}
          onConfigChange={handleConfigChange}
          onGenerateTraffic={handleGenerateTraffic}
        />
      }
      center={
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "4px", letterSpacing: "-0.01em" }}>
              Sliding Window Simulation
            </h2>
            <p style={{ fontSize: "13px", opacity: 0.7 }}>
              Current Simulated Time: <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{simTimeMs}ms</span>
            </p>
          </div>
          
          <BucketTimeline config={config} simTimeMs={simTimeMs} events={events} />
          
          <MathInspector config={config} lastEvent={events[0] || null} />
        </div>
      }
      right={
        <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
          <div style={{ flexGrow: 1, overflow: "hidden" }}>
            <EventStream
              events={events}
              limit={config.limit}
              onClear={handleClearLogs}
            />
          </div>
          <RedisInspector config={config} lastEvent={events[0] || null} />
        </div>
      }
    />
  );
}
