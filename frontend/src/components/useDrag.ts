import { useRef, useState } from "react";

export type Pos = { x: number; y: number };

// Pointer-based dragging. Attach `handleProps` to the drag handle element
// (the whole token, or just a header), and `containerRef`/`style` to the
// positioned element being moved. Bounds prefer a full-screen overlay parent,
// then fall back to the viewport so tokens never get trapped in a collapsed box.
export function useDrag(initial: Pos, z: React.MutableRefObject<number>) {
  const [pos, setPos] = useState<Pos>(initial);
  const [zi, setZi] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const drag = useRef({
    active: false,
    ox: 0,
    oy: 0,
    boundsLeft: 0,
    boundsTop: 0,
    boundsWidth: 0,
    boundsHeight: 0,
  });

  const onPointerDown = (e: React.PointerEvent) => {
    const el = containerRef.current;
    if (!el) return;
    e.preventDefault();
    drag.current.active = true;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const r = el.getBoundingClientRect();
    const parent = el.parentElement;
    const bounds = parent?.getBoundingClientRect();
    const width = bounds?.width && bounds.width > 0 ? bounds.width : window.innerWidth;
    const height = bounds?.height && bounds.height > 0 ? bounds.height : window.innerHeight;
    drag.current.boundsLeft = bounds?.width && bounds.width > 0 ? bounds.left : 0;
    drag.current.boundsTop = bounds?.height && bounds.height > 0 ? bounds.top : 0;
    drag.current.boundsWidth = width;
    drag.current.boundsHeight = height;
    drag.current.ox = e.clientX - r.left;
    drag.current.oy = e.clientY - r.top;
    setZi(++z.current);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    const el = containerRef.current;
    if (!el) return;
    let x = e.clientX - drag.current.boundsLeft - drag.current.ox;
    let y = e.clientY - drag.current.boundsTop - drag.current.oy;
    x = Math.max(0, Math.min(x, drag.current.boundsWidth - el.offsetWidth));
    y = Math.max(0, Math.min(y, drag.current.boundsHeight - el.offsetHeight));
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
