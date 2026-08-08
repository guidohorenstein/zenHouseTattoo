export function normalizeCrop(cropData) {
  return {
    x: clamp(Number(cropData?.x) || 0, -45, 45),
    y: clamp(Number(cropData?.y) || 0, -45, 45),
    zoom: clamp(Number(cropData?.zoom) || 1, 1, 2.5),
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
