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
  };
}

export function PlacementStep({ title, note, imageUrl, value, onChange, labels }) {
  const canvasRef = useRef(null);
  const [draft, setDraft] = useState(null);

  function startDrawing(event) {
    if (!canvasRef.current) return;
    const point = getPoint(event, canvasRef.current);
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraft({ start: point, end: point });
  }

  function updateDrawing(event) {
    if (!draft || !canvasRef.current) return;
    setDraft({ ...draft, end: getPoint(event, canvasRef.current) });
  }

  function finishDrawing() {
    if (!draft) return;

    const box = createBox(draft.start, draft.end);
    setDraft(null);

    if (box.width < 1 || box.height < 1) return;
    onChange([...value, { id: `box-${Date.now()}`, ...box }]);
  }

  function removeBox(id) {
    onChange(value.filter((box) => box.id !== id));
  }

  const draftBox = draft ? { id: "draft", ...createBox(draft.start, draft.end) } : null;

  return (
    <div className="step">
      <h1>{title}</h1>
      {note ? <p>{note}</p> : null}

      <div className="placement">
        <div className="placement-tools">
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
          onPointerCancel={() => setDraft(null)}
        >
          <img className="placement-image" src={imageUrl} alt="" draggable="false" />

          {[...value, draftBox].filter(Boolean).map((box, index) => (
            <div
              className="placement-box"
              key={box.id}
              style={{
                left: `${box.x}%`,
                top: `${box.y}%`,
                width: `${box.width}%`,
                height: `${box.height}%`,
              }}
            >
              {box.id !== "draft" ? (
                <button
                  className="placement-delete"
                  type="button"
                  aria-label={`${labels.delete} ${index + 1}`}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => removeBox(box.id)}
                >
                  ×
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
