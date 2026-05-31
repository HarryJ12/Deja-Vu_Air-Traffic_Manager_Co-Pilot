import { type PointerEvent, type ReactNode, useLayoutEffect, useRef, useState } from "react";

type Placement = "bottom-center" | "bottom-left";

type Position = {
  x: number;
  y: number;
};

type DragState = {
  pointerId: number;
  offsetX: number;
  offsetY: number;
};

type DraggablePanelProps = {
  panelKey: string;
  title: string;
  children: ReactNode;
  onClose: () => void;
  placement?: Placement;
  width?: number;
};

const EDGE = 18;
const DEFAULT_WIDTH = 240;

function viewportPosition(placement: Placement, width: number): Position {
  if (typeof window === "undefined") return { x: EDGE, y: EDGE };
  return {
    x: placement === "bottom-left" ? EDGE : Math.max(EDGE, (window.innerWidth - width) / 2),
    y: Math.max(EDGE, window.innerHeight - 220),
  };
}

function clampToViewport(pos: Position, el: HTMLElement | null, width: number): Position {
  if (typeof window === "undefined") return pos;
  const rect = el?.getBoundingClientRect();
  const panelWidth = rect?.width ?? width;
  const panelHeight = rect?.height ?? 180;
  return {
    x: Math.min(Math.max(EDGE, pos.x), Math.max(EDGE, window.innerWidth - panelWidth - EDGE)),
    y: Math.min(Math.max(EDGE, pos.y), Math.max(EDGE, window.innerHeight - panelHeight - EDGE)),
  };
}

export default function DraggablePanel({
  panelKey,
  title,
  children,
  onClose,
  placement = "bottom-center",
  width = DEFAULT_WIDTH,
}: DraggablePanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [position, setPosition] = useState(() => viewportPosition(placement, width));
  const [dragging, setDragging] = useState(false);

  useLayoutEffect(() => {
    setPosition(clampToViewport(viewportPosition(placement, width), panelRef.current, width));
  }, [panelKey, placement, width]);

  useLayoutEffect(() => {
    const onResize = () => {
      setPosition((current) => clampToViewport(current, panelRef.current, width));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [width]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - position.x,
      offsetY: event.clientY - position.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    event.preventDefault();
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPosition(
      clampToViewport(
        {
          x: event.clientX - drag.offsetX,
          y: event.clientY - drag.offsetY,
        },
        panelRef.current,
        width
      )
    );
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <section
      ref={panelRef}
      className="radar-card"
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        bottom: "auto",
        right: "auto",
        transform: "none",
        width,
        pointerEvents: "auto",
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <div
        className="info-block-row"
        style={{
          cursor: dragging ? "grabbing" : "grab",
          touchAction: "none",
          userSelect: "none",
          marginBottom: 6,
        }}
        aria-label={`Drag ${title} panel`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <strong>{title}</strong>
        <button
          className="ghost-btn radar-card-x"
          onClick={onClose}
          onPointerDown={(event) => event.stopPropagation()}
        >
          x
        </button>
      </div>
      {children}
    </section>
  );
}
