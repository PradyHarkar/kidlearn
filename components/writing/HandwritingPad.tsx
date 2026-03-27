"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface HandwritingPadProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
}

type Point = { x: number; y: number };

export function HandwritingPad({ value, onChange, label = "Use your pen or finger here" }: HandwritingPadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const [hasInk, setHasInk] = useState(Boolean(value));

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(320, Math.floor(rect.width * dpr));
    canvas.height = Math.max(180, Math.floor(180 * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = "180px";

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#2563eb";
    ctx.clearRect(0, 0, rect.width, 180);

    if (value) {
      const image = new Image();
      image.onload = () => {
        ctx.clearRect(0, 0, rect.width, 180);
        ctx.drawImage(image, 0, 0, rect.width, 180);
      };
      image.src = value;
    }
  };

  useEffect(() => {
    resizeCanvas();
    const handleResize = () => resizeCanvas();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const drawLine = (from: Point, to: Point) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = getPoint(event);
    if (!point) return;
    drawingRef.current = true;
    lastPointRef.current = point;
    setHasInk(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const nextPoint = getPoint(event);
    const lastPoint = lastPointRef.current;
    if (!nextPoint || !lastPoint) return;
    drawLine(lastPoint, nextPoint);
    lastPointRef.current = nextPoint;
    onChange(canvasRef.current?.toDataURL("image/png") || "");
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    onChange(canvasRef.current?.toDataURL("image/png") || "");
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, rect.width, 180);
    setHasInk(false);
    onChange("");
  };

  const preview = useMemo(() => value || null, [value]);

  return (
    <div ref={wrapperRef} className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">{label}</p>
        <button
          type="button"
          onClick={clearCanvas}
          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700 hover:bg-slate-50"
        >
          Clear pen
        </button>
      </div>

      <div className="relative overflow-hidden rounded-[1.5rem] border-2 border-dashed border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-blue-50 shadow-inner">
        <canvas
          ref={canvasRef}
          className="touch-none w-full h-[180px] cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        {!hasInk && !preview && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center">
            <div className="max-w-xs rounded-2xl bg-white/80 px-4 py-3 shadow-sm backdrop-blur-sm">
              <p className="text-sm font-black text-slate-700">Pen-friendly space</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Kids can sketch ideas or write with a stylus on iPad or Surface.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
