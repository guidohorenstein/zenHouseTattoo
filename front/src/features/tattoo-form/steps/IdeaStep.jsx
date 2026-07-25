export function IdeaStep({
  title,
  value,
  onDescriptionChange,
  placeholder,
  referenceLinks,
  onReferenceLinksChange,
  referenceImages,
  onReferenceImagesChange,
  labels,
}) {
  const canAddImage = referenceImages.length < 4;

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

  function updateLink(index, value) {
    const nextLinks = [...referenceLinks];
    nextLinks[index] = value;
    onReferenceLinksChange(nextLinks);
  }

  function addLink() {
    if (referenceLinks.length >= 5) return;
    onReferenceLinksChange([...referenceLinks, ""]);
  }

  function removeLink(index) {
    onReferenceLinksChange(referenceLinks.filter((_, linkIndex) => linkIndex !== index));
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

      <textarea
        className="textarea"
        maxLength={700}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onDescriptionChange(event.target.value)}
      />

      <div className="link-list">
        {referenceLinks.map((link, index) => (
          <div className="link-row" key={`reference-link-${index + 1}`}>
            <input
              className="link-input"
              type="url"
              value={link}
              placeholder={labels.referenceLinkPlaceholder}
              onChange={(event) => updateLink(index, event.target.value)}
            />
            <button className="ghost-button" type="button" onClick={() => removeLink(index)}>
              {labels.delete}
            </button>
          </div>
        ))}

        <button
          className="ghost-button add-link-button"
          type="button"
          onClick={addLink}
          disabled={referenceLinks.length >= 5}
        >
          {labels.addLink}
        </button>
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
