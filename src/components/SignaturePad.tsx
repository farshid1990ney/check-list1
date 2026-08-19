import { useEffect, useRef, useState } from "react";
import { Eraser, PenLine, X } from "lucide-react";

type Props = {
  open: boolean;
  title?: string;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
};

const W = 640;
const H = 240;

export default function SignaturePad({ open, title, onClose, onSave }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    if (!open) {
      setHasInk(false);
      return;
    }
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = W * dpr;
    c.height = H * dpr;
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1e3a8a";
    setHasInk(false);
  }, [open]);

  if (!open) return null;

  const pos = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  };

  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.1, p.y + 0.1);
    ctx.stroke();
    setHasInk(true);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };
  const up = () => (drawing.current = false);

  const clear = () => {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    setHasInk(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4" dir="rtl">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
            <PenLine className="h-5 w-5 text-brand-600" />
            {title ?? "امضای دیجیتال"}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">
          <p className="mb-3 text-sm text-slate-500">
            با انگشت (روی موبایل) یا ماوس، امضا را در کادر زیر بنویسید.
          </p>
          <div className="overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-white">
            <canvas
              ref={canvasRef}
              style={{ width: "100%", aspectRatio: `${W}/${H}`, display: "block" }}
              className="signature-canvas"
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={up}
            />
          </div>
          <div className="mt-2 flex justify-center">
            <span className="text-xs text-slate-400">خط امضا</span>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3.5">
          <button
            onClick={clear}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100"
          >
            <Eraser className="h-4 w-4" /> پاک کردن
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              انصراف
            </button>
            <button
              disabled={!hasInk}
              onClick={() => onSave(canvasRef.current!.toDataURL("image/png"))}
              className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ثبت امضا
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
