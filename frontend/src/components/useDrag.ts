import { useRef, useState } from "react";

export type Pos = { x: number; y: number };

// Pointer-based dragging. Attach `handleProps` to the drag handle element
// (the whole token, or just a header), and `containerRef`/`style` to the
// absolutely-positioned element being moved. Parent must be positioned.
export function useDrag(initial: Pos, z: React.MutableRefObject<number>) {
  const [pos, setPos] = useState<Pos>(initial);
  const [zi, setZi] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, ox: 0, oy: 0 });

  const onPointerDown = (e: React.PointerEvent) => {
    const el = containerRef.current;
    if (!el) return;
    drag.current.active = true;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const r = el.getBoundingClientRect();
    drag.current.ox = e.clientX - r.left;
    drag.current.oy = e.clientY - r.top;
    setZi(++z.current);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    const el = containerRef.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    const c = parent.getBoundingClientRect();
    let x = e.clientX - c.left - drag.current.ox;
    let y = e.clientY - c.top - drag.current.oy;
    x = Math.max(0, Math.min(x, c.width - el.offsetWidth));
    y = Math.max(0, Math.min(y, c.height - el.offsetHeight));
    setPos({ x: Math.round(x), y: Math.round(y) });
  };

  const end = () => {
    drag.current.active = false;
  };

  return {
    containerRef,
    style: { left: pos.x, top: pos.y, zIndex: zi } as React.CSSProperties,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: end,
      onPointerCancel: end,
    },
  };
}
