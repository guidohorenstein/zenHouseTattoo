export function IdeaStep({
  title,
  value,
  onDescriptionChange,
  placeholder,
  referenceImages,
  onReferenceImagesChange,
  labels,
  notice,
}) {
  const canAddImage = referenceImages.length < 4;
  const characterCount = value.length;

  function handleFilesChange(event) {
    const freeSlots = Math.max(0, 4 - referenceImages.length);
    const files = Array.from(event.target.files || []).slice(0, freeSlots);
    const mappedFiles = files.map((file) => ({
      id: `${file.name}-${file.lastModified}`,
      name: file.name,
      size: file.size,
      previewUrl: URL.createObjectURL(file),
    }));

    onReferenceImagesChange([...referenceImages, ...mappedFiles]);
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
        <span
          className={`character-counter ${
            characterCount > 0 && characterCount < 20 ? "is-short" : ""
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
