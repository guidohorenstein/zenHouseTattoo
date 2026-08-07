function loadImage(imageUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load placement image."));
    image.src = new URL(imageUrl, window.location.origin).href;
  });
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not export marked placement image."));
      },
      "image/webp",
      0.9,
    );
  });
}

export async function exportMarkedPlacementImage({ imageUrl, boxes }) {
  if (!imageUrl || boxes.length === 0) return null;

  const image = await loadImage(imageUrl);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context || width === 0 || height === 0) {
    throw new Error("Could not prepare placement image.");
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  boxes.forEach((box, index) => {
    const x = (box.x / 100) * width;
    const y = (box.y / 100) * height;
    const boxWidth = (box.width / 100) * width;
    const boxHeight = (box.height / 100) * height;
    const strokeWidth = Math.max(4, Math.round(width * 0.006));

    context.save();
    context.lineWidth = strokeWidth;
    context.strokeStyle = "#0ea5e9";
    context.fillStyle = "rgba(14, 165, 233, 0.18)";
    context.shadowColor = "rgba(2, 6, 23, 0.42)";
    context.shadowBlur = strokeWidth * 2;
    context.fillRect(x, y, boxWidth, boxHeight);
    context.strokeRect(x, y, boxWidth, boxHeight);

    context.shadowBlur = 0;
    context.fillStyle = "#0f172a";
    context.beginPath();
    context.arc(x + strokeWidth * 3, y + strokeWidth * 3, strokeWidth * 2.4, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#ffffff";
    context.font = `700 ${strokeWidth * 2.5}px Arial, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(index + 1), x + strokeWidth * 3, y + strokeWidth * 3);
    context.restore();
  });

  let blob;

  try {
    blob = await canvasToBlob(canvas);
  } catch {
    throw new Error("Could not export marked placement image.");
  }

  return new File([blob], "placement-marked.webp", { type: "image/webp" });
}

