import { useRef, useState } from "react";

function round(value) {
  return Number(value.toFixed(1));
}

function getPoint(event, element) {
  const rect = element.getBoundingClientRect();
  return {
    x: Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100)),
    y: Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100)),
  };
}

function createBox(start, end) {
  return {
    x: round(Math.min(start.x, end.x)),
    y: round(Math.min(start.y, end.y)),
    width: round(Math.abs(end.x - start.x)),
    height: round(Math.abs(end.y - start.y)),
    rotation: 0,
  };
}

function getBoxCenter(element, box) {
  const rect = element.getBoundingClientRect();

  return {
    x: rect.left + ((box.x + box.width / 2) / 100) * rect.width,
    y: rect.top + ((box.y + box.height / 2) / 100) * rect.height,
  };
}

function getPointerAngle(event, center) {
  return (Math.atan2(event.clientY - center.y, event.clientX - center.x) * 180) / Math.PI;
}

export function PlacementStep({
  title,
  note,
  imageUrl,
  value,
  onChange,
  labels,
  maxPlacementBoxes = 3,
}) {
  const canvasRef = useRef(null);
  const [draft, setDraft] = useState(null);
  const [draggingBox, setDraggingBox] = useState(null);
  const [resizingBox, setResizingBox] = useState(null);
  const [rotatingBox, setRotatingBox] = useState(null);
  const reachedBoxLimit = value.length >= maxPlacementBoxes;

  function startDrawing(event) {
    if (!canvasRef.current) return;
    if (reachedBoxLimit) return;
    if (event.target.closest?.(".placement-control")) return;

    const point = getPoint(event, canvasRef.current);
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraft({ start: point, end: point });
  }

  function updateDrawing(event) {
    if (!canvasRef.current) return;

    if (draggingBox) {
      const point = getPoint(event, canvasRef.current);

      onChange(
        value.map((box) => {
          if (box.id !== draggingBox.id) return box;

          return {
            ...box,
            x: round(Math.min(100 - box.width, Math.max(0, point.x - draggingBox.offsetX))),
            y: round(Math.min(100 - box.height, Math.max(0, point.y - draggingBox.offsetY))),
          };
        })
      );
      return;
    }

    if (resizingBox) {
      const point = getPoint(event, canvasRef.current);

      onChange(
        value.map((box) => {
          if (box.id !== resizingBox.id) return box;

          const width = round(Math.min(100 - box.x, Math.max(4, point.x - box.x)));
          const height = round(Math.min(100 - box.y, Math.max(4, point.y - box.y)));

          return { ...box, width, height };
        })
      );
      return;
    }

    if (rotatingBox) {
      const box = value.find((item) => item.id === rotatingBox.id);
      if (!box) return;

      const currentAngle = getPointerAngle(event, rotatingBox.center);
      const angleDeg =
        rotatingBox.initialRotation + (currentAngle - rotatingBox.startAngle);

      onChange(
        value.map((item) =>
          item.id === rotatingBox.id ? { ...item, rotation: Math.round(angleDeg) } : item
        )
      );
      return;
    }

    if (!draft) return;
    setDraft({ ...draft, end: getPoint(event, canvasRef.current) });
  }

  function finishDrawing() {
    if (draggingBox) {
      setDraggingBox(null);
      return;
    }

    if (resizingBox) {
      setResizingBox(null);
      return;
    }

    if (rotatingBox) {
      setRotatingBox(null);
      return;
    }

    if (!draft) return;

    const box = createBox(draft.start, draft.end);
    setDraft(null);

    if (box.width < 1 || box.height < 1) return;
    if (reachedBoxLimit) return;

    onChange([...value, { id: `box-${Date.now()}`, ...box }]);
  }

  function removeBox(id) {
    onChange(value.filter((box) => box.id !== id));
  }

  function startMovingBox(event, box) {
    if (!canvasRef.current) return;
    const point = getPoint(event, canvasRef.current);

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingBox({
      id: box.id,
      offsetX: point.x - box.x,
      offsetY: point.y - box.y,
    });
  }

  function startResizingBox(event, box) {
    if (!canvasRef.current) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setResizingBox({ id: box.id });
  }

  function startRotatingBox(event, box) {
    if (!canvasRef.current) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    const center = getBoxCenter(canvasRef.current, box);
    setRotatingBox({
      id: box.id,
      center,
      startAngle: getPointerAngle(event, center),
      initialRotation: box.rotation || 0,
    });
  }

  function cancelGestures() {
    setDraft(null);
    setDraggingBox(null);
    setResizingBox(null);
    setRotatingBox(null);
  }

  const draftBox = draft ? { id: "draft", ...createBox(draft.start, draft.end) } : null;

  return (
    <div className="step">
      <h1>{title}</h1>
      {note ? <p>{note}</p> : null}

      <div className="placement-guide">
        <img
          src="/images/placement/placement-guide.gif"
          alt=""
          loading="lazy"
          decoding="async"
        />
      </div>

      <div className="placement">
        <div className="placement-tools">
          <span className="placement-limit">
            {value.length}/{maxPlacementBoxes} - {labels.maxPlacementBoxes}
          </span>
          <button
            className="ghost-button"
            type="button"
            disabled={value.length === 0}
            onClick={() => onChange([])}
          >
            {labels.clearAll}
          </button>
        </div>

        <div
          className="placement-canvas"
          ref={canvasRef}
          onPointerDown={startDrawing}
          onPointerMove={updateDrawing}
          onPointerUp={finishDrawing}
          onPointerCancel={cancelGestures}
        >
          <img
            className="placement-image"
            src={imageUrl}
            alt=""
            draggable="false"
            decoding="async"
          />

          {[...value, draftBox].filter(Boolean).map((box, index) => (
            <div
              className="placement-box"
              key={box.id}
              onPointerDown={
                box.id !== "draft" ? (event) => startMovingBox(event, box) : undefined
              }
              style={{
                left: `${box.x}%`,
                top: `${box.y}%`,
                width: `${box.width}%`,
                height: `${box.height}%`,
                transform: box.rotation ? `rotate(${box.rotation}deg)` : undefined,
              }}
            >
              {box.id !== "draft" ? (
                <>
                  <button
                    className="placement-control placement-delete"
                    type="button"
                    aria-label={`${labels.delete} ${index + 1}`}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      removeBox(box.id);
                    }}
                  >
                    ×
                  </button>
                  <button
                    className="placement-control placement-rotate"
                    type="button"
                    aria-label="Rotate"
                    onPointerDown={(event) => startRotatingBox(event, box)}
                  >
                    ⟳
                  </button>
                  <button
                    className="placement-control placement-resize"
                    type="button"
                    aria-label="Resize"
                    onPointerDown={(event) => startResizingBox(event, box)}
                  >
                    ⤡
                  </button>
                </>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
