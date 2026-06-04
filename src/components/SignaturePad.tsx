import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

interface Props {
  value: string;
  onChange: (dataUrl: string) => void;
  height?: number;
}

export function SignaturePad({ value, onChange, height = 180 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const [hasDrawn, setHasDrawn] = useState(!!value);

  // Setup canvas with proper DPR scaling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#0f172a";
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, rect.width, rect.height);
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    canvasRef.current!.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastRef.current = getPos(e);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d");
    if (!ctx) return;
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastRef.current!.x, lastRef.current!.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastRef.current = p;
    setHasDrawn(true);
  };
  const end = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastRef.current = null;
    try { canvasRef.current!.releasePointerCapture(e.pointerId); } catch {}
    const url = canvasRef.current!.toDataURL("image/png");
    onChange(url);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
    onChange("");
  };

  return (
    <div>
      <div
        className="relative rounded-lg border border-border bg-white overflow-hidden"
        style={{ height }}
      >
        <canvas
          ref={canvasRef}
          className="block h-full w-full touch-none cursor-crosshair"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onPointerLeave={end}
        />
        {!hasDrawn && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted-foreground">
            Firma aquí con tu dedo o el mouse
          </div>
        )}
      </div>
      <div className="mt-2 flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={clear}>
          <Eraser className="mr-2 h-4 w-4" /> Limpiar firma
        </Button>
      </div>
    </div>
  );
}
