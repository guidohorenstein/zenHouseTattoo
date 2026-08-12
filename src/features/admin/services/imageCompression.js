const DEFAULT_WEBP_QUALITY = 0.85;
const MAX_IMAGE_SIDE = 1800;

export async function prepareImageForUpload(file) {
  if (!file) return { file: null, extension: "webp", contentType: "image/webp" };

  if (!file.type?.startsWith("image/") || file.type === "image/gif") {
    return {
      file,
      extension: getOriginalExtension(file),
      contentType: file.type || "application/octet-stream",
    };
  }

  try {
    const bitmap = await loadImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas context unavailable.");

    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/webp", DEFAULT_WEBP_QUALITY),
    );

    if (!blob) throw new Error("WebP compression failed.");

    const compressedFile = new File([blob], replaceExtension(file.name, "webp"), {
      type: "image/webp",
    });

    return {
      file: compressedFile,
      extension: "webp",
      contentType: "image/webp",
    };
  } catch {
    return {
      file,
      extension: getOriginalExtension(file),
      contentType: file.type || "application/octet-stream",
    };
  }
}

async function loadImageBitmap(file) {
  if ("createImageBitmap" in window) {
    return createImageBitmap(file);
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    return createImageBitmap(canvas);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function getOriginalExtension(file) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ["jpg", "jpeg", "png", "webp"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }

  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

function replaceExtension(fileName, extension) {
  const cleanName = fileName.replace(/\.[^/.]+$/, "");
  return `${cleanName || "image"}.${extension}`;
}
