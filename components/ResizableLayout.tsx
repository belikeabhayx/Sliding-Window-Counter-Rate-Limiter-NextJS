"use client";

import React, { useState, useRef, useEffect } from "react";

interface ResizableLayoutProps {
  readonly left: React.ReactNode;
  readonly center: React.ReactNode;
  readonly right: React.ReactNode;
}

/**
 * ResizableLayout implements a high-performance 3-column split view
 * with custom resizing handles, constraint boundaries, and mouse dragging tracking.
 */
export function ResizableLayout({ left, center, right }: ResizableLayoutProps) {
  const [leftWidth, setLeftWidth] = useState(320); // initial width in pixels
  const [rightWidth, setRightWidth] = useState(380); // initial width in pixels
  
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizingLeft = useRef(false);
  const isResizingRight = useRef(false);

  const startResizeLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingLeft.current = true;
  };

  const startResizeRight = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRight.current = true;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      
      if (isResizingLeft.current) {
        const newWidth = e.clientX - containerRect.left;
        // Bound left panel size between 240px and 480px
        setLeftWidth(Math.max(240, Math.min(480, newWidth)));
      }
      
      if (isResizingRight.current) {
        const newWidth = containerRect.right - e.clientX;
        // Bound right panel size between 280px and 600px
        setRightWidth(Math.max(280, Math.min(600, newWidth)));
      }
    };

    const handleMouseUp = () => {
      isResizingLeft.current = false;
      isResizingRight.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <div ref={containerRef} className="workspace-container">
      <aside style={{ width: leftWidth }} className="panel left-panel">
        {left}
      </aside>
      
      <div 
        onMouseDown={startResizeLeft} 
        className="resize-handle" 
        role="separator" 
        aria-label="Resize left panel"
      />
      
      <main className="panel center-panel">
        {center}
      </main>
      
      <div 
        onMouseDown={startResizeRight} 
        className="resize-handle" 
        role="separator" 
        aria-label="Resize right panel"
      />
      
      <aside style={{ width: rightWidth }} className="panel right-panel">
        {right}
      </aside>
    </div>
  );
}
