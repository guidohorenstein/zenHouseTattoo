import { normalizeCrop } from "../utils/cropUtils";

export function CroppedImage({
  alt = "",
  className = "",
  cropData,
  imageUrl,
  loading = "lazy",
  objectFit = "cover",
  fetchPriority,
}) {
  const crop = normalizeCrop(cropData);

  return (
    <span className={`cropped-image ${className}`}>
      {imageUrl ? (
        <img
          alt={alt}
          decoding="async"
          fetchPriority={fetchPriority}
          loading={loading}
          src={imageUrl}
          style={{
            objectFit,
            transform: `translate(${crop.x}%, ${crop.y}%) scale(${crop.zoom})`,
          }}
        />
      ) : null}
    </span>
  );
}
