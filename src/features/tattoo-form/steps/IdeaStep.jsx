const MAX_REFERENCE_IMAGES = 4;
const MAX_REFERENCE_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_REFERENCE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function IdeaStep({
  title,
  value,
  onDescriptionChange,
  placeholder,
  referenceImages,
  onReferenceImagesChange,
  labels,
  notice,
  onImageError,
}) {
  const canAddImage = referenceImages.length < MAX_REFERENCE_IMAGES;
  const characterCount = value.length;
  const hasEnoughCharacters = characterCount >= 20;

  function handleFilesChange(event) {
    const selectedFiles = Array.from(event.target.files || []);
    const freeSlots = Math.max(0, MAX_REFERENCE_IMAGES - referenceImages.length);
    const validFiles = [];

    for (const file of selectedFiles) {
      if (validFiles.length >= freeSlots) break;

      if (!ALLOWED_REFERENCE_IMAGE_TYPES.has(file.type)) {
        onImageError?.("Only JPG, PNG or WEBP images are allowed.");
        continue;
      }

      if (file.size > MAX_REFERENCE_IMAGE_SIZE) {
        onImageError?.("Each image must be under 10 MB.");
        continue;
      }

      validFiles.push(file);
    }

    if (selectedFiles.length > freeSlots) {
      onImageError?.("You can upload up to 4 reference images.");
    }

    const mappedFiles = validFiles.map((file) => ({
      id: `${file.name}-${file.lastModified}-${globalThis.crypto?.randomUUID?.() || Math.random()}`,
      name: file.name,
      size: file.size,
      previewUrl: URL.createObjectURL(file),
      file,
    }));

    if (mappedFiles.length > 0) {
      onReferenceImagesChange([...referenceImages, ...mappedFiles]);
    }

    event.target.value = "";
  }

  function removeImage(imageId) {
    const imageToRemove = referenceImages.find((image) => image.id === imageId);

    if (imageToRemove?.previewUrl) {
      URL.revokeObjectURL(imageToRemove.previewUrl);
    }

    onReferenceImagesChange(referenceImages.filter((image) => image.id !== imageId));
  }

  return (
    <div className="step">
      <h1>{title}</h1>

      {notice ? <p className="step-alert">{notice}</p> : null}

      <div className="textarea-wrap">
        <textarea
          className="textarea"
          maxLength={350}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onDescriptionChange(event.target.value)}
        />
        <span className="character-minimum">{labels.minIdeaCharacters}</span>
        <span
          className={`character-counter ${
            hasEnoughCharacters ? "is-valid" : "is-short"
          }`}
        >
          {characterCount}/350
        </span>
      </div>

      <label className="upload-box">
        <span>{labels.referenceImages}</span>
        <small>{labels.maxReferenceImages}</small>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={!canAddImage}
          onChange={handleFilesChange}
        />
      </label>

      {referenceImages.length > 0 ? (
        <div className="reference-grid">
          {referenceImages.map((image) => (
            <div className="reference-card" key={image.id}>
              <img src={image.previewUrl} alt={image.name} />
              <span>{image.name}</span>
              <button className="ghost-button" type="button" onClick={() => removeImage(image.id)}>
                {labels.delete}
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}



