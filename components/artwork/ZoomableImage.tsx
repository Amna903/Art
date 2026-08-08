"use client";

import { useRef, useState, type WheelEvent as ReactWheelEvent } from "react";
import Image from "next/image";

type Props = {
  src: string;
  alt: string;
  className?: string;
};

function distance(t: TouchList): number {
  if (t.length < 2) return 0;
  const dx = t[0].clientX - t[1].clientX;
  const dy = t[0].clientY - t[1].clientY;
  return Math.hypot(dx, dy);
}

/**
 * Inline thumbnail that opens a fullscreen lightbox on click. Inside the
 * lightbox: scroll-wheel zoom (desktop) and pinch-to-zoom (mobile touch),
 * plus drag/swipe-to-pan once zoomed in — matches the UX spec's "Image zoom
 * ... like Google Maps" and "Click Opens full-screen lightbox viewer".
 */
export function ZoomableImage({ src, alt, className }: Props) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const pinchStart = useRef(0);
  const scaleStart = useRef(1);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const reset = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const onWheel = (e: ReactWheelEvent) => {
    e.preventDefault();
    setScale((s) => Math.min(4, Math.max(1, s - e.deltaY * 0.0025)));
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchStart.current = distance(e.touches as unknown as TouchList);
      scaleStart.current = scale;
    } else if (e.touches.length === 1) {
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, ox: offset.x, oy: offset.y };
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const d = distance(e.touches as unknown as TouchList);
      if (pinchStart.current > 0) {
        const next = (d / pinchStart.current) * scaleStart.current;
        setScale(Math.min(4, Math.max(1, next)));
      }
    } else if (e.touches.length === 1 && dragStart.current && scale > 1) {
      const dx = e.touches[0].clientX - dragStart.current.x;
      const dy = e.touches[0].clientY - dragStart.current.y;
      setOffset({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy });
    }
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy });
  };
  const onMouseUp = () => {
    dragStart.current = null;
  };

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className={`relative overflow-hidden aspect-[4/5] zoom-container cursor-zoom-in group border border-outline/5 ${className ?? ""}`}
      >
        <Image
          fill
          sizes="(max-width: 1024px) 100vw, 58vw"
          priority
          className="object-cover transition-transform duration-700 ease-out"
          alt={alt}
          src={src}
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          aria-label="View fullscreen"
          className="absolute bottom-6 right-6 p-3 bg-beige/90 backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        >
          <span className="material-symbols-outlined text-primary">fullscreen</span>
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center touch-none"
          onWheel={onWheel}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <button
            onClick={close}
            aria-label="Close"
            className="absolute top-4 right-4 z-10 w-11 h-11 flex items-center justify-center text-white material-symbols-outlined"
          >
            close
          </button>
          <button
            onClick={reset}
            aria-label="Reset zoom"
            className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 h-11 text-white/80 hover:text-white font-label-caps text-[10px] uppercase tracking-widest"
          >
            <span className="material-symbols-outlined text-[18px]">restart_alt</span>
            Reset
          </button>
          {/* Raw img, not next/image: only mounts once opened (not part of initial page
              weight), and needs its natural size under a live pan/zoom transform rather
              than being stretched to fill a box. */}
          <img
            src={src}
            alt={alt}
            draggable={false}
            className="max-w-[92vw] max-h-[86vh] object-contain select-none"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              cursor: scale > 1 ? "grab" : "zoom-in",
              transition: dragStart.current ? "none" : "transform 0.15s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-xs font-label-caps uppercase tracking-widest">
            Scroll or pinch to zoom · drag to pan
          </p>
        </div>
      )}
    </>
  );
}
