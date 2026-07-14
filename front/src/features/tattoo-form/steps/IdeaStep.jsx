export function IdeaStep({
  title,
  value,
  onDescriptionChange,
  placeholder,
  referenceImages,
  onReferenceImagesChange,
  labels,
}) {
  function handleFilesChange(event) {
    const files = Array.from(event.target.files || []);
    const mappedFiles = files.map((file) => ({
      id: `${file.name}-${file.lastModified}`,
      name: file.name,
      size: file.size,
    }));

    onReferenceImagesChange(mappedFiles);
  }

  function removeImage(imageId) {
    onReferenceImagesChange(referenceImages.filter((image) => image.id !== imageId));
  }

  return (
    <div className="step">
      <h1>{title}</h1>

      <textarea
        className="textarea"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onDescriptionChange(event.target.value)}
      />

      <label className="upload-box">
        <span>{labels.referenceImages}</span>
        <input type="file" accept="image/*" multiple onChange={handleFilesChange} />
      </label>

      {referenceImages.length > 0 ? (
        <div className="file-list">
          {referenceImages.map((image) => (
            <div className="file-row" key={image.id}>
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
