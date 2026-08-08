/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CroppedImage } from "../../../components/CroppedImage";
import { normalizeCrop } from "../../../utils/cropUtils";
import {
  deleteBodyArea,
  deleteBodyCategory,
  listBodyPhotoContent,
  normalizeSlug,
  saveBodyReferenceImage,
  saveBodyArea,
  saveBodyCategory,
  saveBodyImage,
  uploadBodyPhoto,
} from "../services/bodyPhotosApi";

const bodyReferences = ["male", "female"];

const emptyCategory = {
  id: "",
  slug: "",
  title_en: "",
  title_he: "",
  sort_order: 0,
  is_active: true,
};

const emptyArea = {
  id: "",
  category_id: "",
  slug: "",
  title_en: "",
  title_he: "",
  sort_order: 0,
  is_active: true,
};

export function BodyPhotosModule({ canEdit = true }) {
  const [categories, setCategories] = useState([]);
  const [areas, setAreas] = useState([]);
  const [images, setImages] = useState([]);
  const [referenceImages, setReferenceImages] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [editingKind, setEditingKind] = useState("category");
  const [categoryDraft, setCategoryDraft] = useState(emptyCategory);
  const [areaDraft, setAreaDraft] = useState(emptyArea);
  const [draggedBodyItem, setDraggedBodyItem] = useState(null);
  const [cropTarget, setCropTarget] = useState(null);
  const [entityEditorOpen, setEntityEditorOpen] = useState(false);
  const [referenceEditorOpenModal, setReferenceEditorOpenModal] = useState(false);
  const [pendingEntityFiles, setPendingEntityFiles] = useState({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const hasInitializedRef = useRef(false);
  const entityEditorRef = useRef(null);

  const sortedCategories = useMemo(() => sortItems(categories), [categories]);
  const selectedCategory = sortedCategories.find((category) => category.id === selectedCategoryId);
  const selectedAreas = useMemo(
    () => sortItems(areas.filter((area) => area.category_id === selectedCategoryId)),
    [areas, selectedCategoryId],
  );

  const loadContent = useCallback(async () => {
    setLoading(true);
    const result = await listBodyPhotoContent();
    setCategories(result.categories);
    setAreas(result.areas);
    setImages(result.images);
    setReferenceImages(result.referenceImages);
    setMessage(result.error || "");

    if (!hasInitializedRef.current && result.categories[0]) {
      setSelectedCategoryId(result.categories[0].id);
      setCategoryDraft(result.categories[0]);
      hasInitializedRef.current = true;
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  useEffect(() => {
    if (!entityEditorOpen) return;

    window.setTimeout(() => {
      entityEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      entityEditorRef.current?.querySelector("input, select, button")?.focus();
    }, 0);
  }, [entityEditorOpen]);

  function startNewCategory() {
    if (!canEdit) return;

    setEditingKind("category");
    setCategoryDraft({
      ...emptyCategory,
      sort_order: (categories.length + 1) * 10,
    });
    setAreaDraft(emptyArea);
    setPendingEntityFiles({});
    setEntityEditorOpen(true);
  }

  function selectCategory(category) {
    setSelectedCategoryId(category.id);
    setEditingKind("category");
    setCategoryDraft(category);
    setAreaDraft({ ...emptyArea, category_id: category.id });
  }

  function startNewArea() {
    if (!canEdit) return;

    setEditingKind("area");
    setAreaDraft({
      ...emptyArea,
      category_id: selectedCategoryId,
      sort_order: (selectedAreas.length + 1) * 10,
    });
    setPendingEntityFiles({});
    setEntityEditorOpen(true);
  }

  function selectArea(area) {
    setEditingKind("area");
    setAreaDraft(area);
  }

  function editCategory(category) {
    if (!canEdit) return;

    setSelectedCategoryId(category.id);
    setEditingKind("category");
    setCategoryDraft(category);
    setAreaDraft({ ...emptyArea, category_id: category.id });
    setPendingEntityFiles({});
    setEntityEditorOpen(true);
  }

  function editArea(area) {
    if (!canEdit) return;

    setEditingKind("area");
    setAreaDraft(area);
    setPendingEntityFiles({});
    setEntityEditorOpen(true);
  }

  async function submitCategory(event) {
    event.preventDefault();
    if (!canEdit) return;

    setSaving(true);
    const result = await saveBodyCategory({
      ...categoryDraft,
      slug: categoryDraft.slug || normalizeSlug(categoryDraft.title_en),
    });

    setMessage(result.error || "Category saved.");
    if (!result.error) {
      if (result.item?.id) setSelectedCategoryId(result.item.id);
      if (result.item?.id) {
        await uploadPendingEntityImages({ ...result.item, kind: "category" });
      }
      await loadContent();
      setEntityEditorOpen(false);
    }
    setSaving(false);
  }

  async function submitArea(event) {
    event.preventDefault();
    if (!canEdit) return;

    setSaving(true);
    const result = await saveBodyArea({
      ...areaDraft,
      category_id: areaDraft.category_id || selectedCategoryId,
      slug: areaDraft.slug || normalizeSlug(areaDraft.title_en),
    });

    setMessage(result.error || "Area saved.");
    if (!result.error) {
      if (result.item?.id) {
        await uploadPendingEntityImages({ ...result.item, kind: "area" });
      }
      await loadContent();
      setEntityEditorOpen(false);
    }
    setSaving(false);
  }

  async function hideCategory(category) {
    if (!canEdit) return;
    await quickSaveCategory({ ...category, is_active: !category.is_active });
  }

  async function hideArea(area) {
    if (!canEdit) return;
    await quickSaveArea({ ...area, is_active: !area.is_active });
  }

  async function quickSaveCategory(category) {
    setSaving(true);
    const result = await saveBodyCategory(category);
    setMessage(result.error || "Category updated.");
    if (!result.error) await loadContent();
    setSaving(false);
  }

  async function quickSaveArea(area) {
    setSaving(true);
    const result = await saveBodyArea(area);
    setMessage(result.error || "Area updated.");
    if (!result.error) await loadContent();
    setSaving(false);
  }

  async function removeCategory(category) {
    if (!canEdit) return;

    const confirmed = window.confirm(`Delete ${category.title_en}? This also deletes its areas.`);
    if (!confirmed) return;

    setSaving(true);
    const result = await deleteBodyCategory(category.id);
    setMessage(result.error || "Category deleted.");
    if (!result.error) {
      setSelectedCategoryId("");
      setCategoryDraft(emptyCategory);
      setAreaDraft(emptyArea);
      await loadContent();
    }
    setSaving(false);
  }

  async function removeArea(area) {
    if (!canEdit) return;

    const confirmed = window.confirm(`Delete ${area.title_en}?`);
    if (!confirmed) return;

    setSaving(true);
    const result = await deleteBodyArea(area.id);
    setMessage(result.error || "Area deleted.");
    if (!result.error) {
      setAreaDraft({ ...emptyArea, category_id: selectedCategoryId });
      await loadContent();
    }
    setSaving(false);
  }

  async function moveCategory(targetCategoryId) {
    if (!canEdit) return;
    if (draggedBodyItem?.kind !== "category" || !targetCategoryId) return;

    const reordered = reorderItems(sortedCategories, draggedBodyItem.id, targetCategoryId);
    setSaving(true);
    const results = await Promise.all(
      reordered.map((category, index) =>
        saveBodyCategory({ ...category, sort_order: (index + 1) * 10 }),
      ),
    );
    const error = results.find((result) => result.error)?.error;
    setMessage(error || "Categories reordered.");
    if (!error) await loadContent();
    setDraggedBodyItem(null);
    setSaving(false);
  }

  async function moveArea(targetAreaId) {
    if (!canEdit) return;
    if (draggedBodyItem?.kind !== "area" || !targetAreaId) return;

    const reordered = reorderItems(selectedAreas, draggedBodyItem.id, targetAreaId);
    setSaving(true);
    const results = await Promise.all(
      reordered.map((area, index) =>
        saveBodyArea({ ...area, sort_order: (index + 1) * 10 }),
      ),
    );
    const error = results.find((result) => result.error)?.error;
    setMessage(error || "Areas reordered.");
    if (!error) await loadContent();
    setDraggedBodyItem(null);
    setSaving(false);
  }

  async function handleImageChange(target, bodyReference, imageRole, file) {
    if (!canEdit) return;
    if (!file || !target.id) return;

    setSaving(true);
    const upload = await uploadBodyPhoto(
      file,
      `${target.slug || target.title_en}-${bodyReference}-${imageRole}`,
    );

    if (upload.error) {
      setMessage(upload.error);
      setSaving(false);
      return;
    }

    const currentImage = findImage(target, bodyReference, imageRole);
    const result = await saveBodyImage({
      ...currentImage,
      category_id: target.kind === "category" ? target.id : null,
      body_area_id: target.kind === "area" ? target.id : null,
      body_reference: bodyReference,
      image_role: imageRole,
      storage_path: upload.path,
      is_active: true,
    });

    setMessage(result.error || "Image saved.");
    if (!result.error) await loadContent();
    setSaving(false);
  }

  async function handleReferenceImageChange(bodyReference, file) {
    if (!canEdit) return;
    if (!file) return;

    setSaving(true);
    const upload = await uploadBodyPhoto(file, `body-reference-${bodyReference}`);

    if (upload.error) {
      setMessage(upload.error);
      setSaving(false);
      return;
    }

    const currentImage = referenceImages.find(
      (image) => image.body_reference === bodyReference,
    );
    const result = await saveBodyReferenceImage({
      ...currentImage,
      body_reference: bodyReference,
      storage_path: upload.path,
      is_active: true,
    });

    setMessage(result.error || "Body reference image saved.");
    if (!result.error) await loadContent();
    setSaving(false);
  }

  async function saveCropData(cropData) {
    if (!canEdit) return;
    if (!cropTarget?.image) return;

    setSaving(true);
    const result =
      cropTarget.kind === "reference"
        ? await saveBodyReferenceImage({
            ...cropTarget.image,
            crop_data: cropData,
          })
        : await saveBodyImage({
            ...cropTarget.image,
            crop_data: cropData,
          });

    setMessage(result.error || "Image framing saved.");
    if (!result.error) {
      setCropTarget(null);
      await loadContent();
    }
    setSaving(false);
  }

  function findImage(target, bodyReference, imageRole) {
    return images.find((image) => {
      const sameTarget =
        target.kind === "category"
          ? image.category_id === target.id
          : image.body_area_id === target.id;

      return sameTarget && image.body_reference === bodyReference && image.image_role === imageRole;
    });
  }

  function handleEntityImageSelect(target, bodyReference, imageRole, file) {
    if (!canEdit || !file) return;

    if (target.id) {
      handleImageChange(target, bodyReference, imageRole, file);
      return;
    }

    setPendingEntityFiles((currentFiles) => ({
      ...currentFiles,
      [`${bodyReference}-${imageRole}`]: file,
    }));
  }

  async function uploadPendingEntityImages(target) {
    const entries = Object.entries(pendingEntityFiles);
    if (entries.length === 0) return;

    for (const [key, file] of entries) {
      const [bodyReference, imageRole] = key.split("-");
      await handleImageChange(target, bodyReference, imageRole, file);
    }

    setPendingEntityFiles({});
  }

  return (
    <section className="admin-module-stack">
      <div className="admin-white-panel admin-body-panel">
        <div className="admin-section-heading">
          <div>
            <h3>Body photos</h3>
            <p>Preview the client flow, then edit each card directly.</p>
          </div>
          <button className="admin-light-button" type="button" onClick={loadContent}>
            {loading ? "Loading..." : "Reload"}
          </button>
        </div>

        {message ? <p className="admin-inline-message">{message}</p> : null}

        <div className="admin-body-layout">
          <div className="admin-body-preview">
            <div className="admin-body-reference-preview admin-body-flow-card">
              <div className="admin-section-heading admin-section-heading--tight">
                <div>
                  <h3>Body reference preview</h3>
                  <p>These are the Step 5 male and female model images.</p>
                </div>
                <button
                  className="admin-light-button"
                  disabled={!canEdit}
                  type="button"
                  onClick={() => setReferenceEditorOpenModal(true)}
                >
                  Change body reference
                </button>
              </div>

              <div className="admin-body-reference-cards">
                {bodyReferences.map((bodyReference) => (
                  <ReferencePreviewCard
                    bodyReference={bodyReference}
                    image={referenceImages.find((item) => item.body_reference === bodyReference)}
                    key={bodyReference}
                  />
                ))}
              </div>
            </div>

            <div className="admin-body-flow-card">
              <div className="admin-section-heading">
                <div>
                  <h3>Category preview</h3>
                  <p>Choose a category to manage its areas below.</p>
                </div>
                {canEdit ? (
                  <button className="admin-primary-light" type="button" onClick={startNewCategory}>
                    New category
                  </button>
                ) : (
                  <span className="admin-readonly-pill">Viewer mode</span>
                )}
              </div>

              <div className="admin-body-category-grid">
                {sortedCategories.map((category) => (
                  <BodyPreviewCard
                    active={category.id === selectedCategoryId}
                    images={images}
                    key={category.id}
                    canEdit={canEdit}
                    onDelete={() => removeCategory(category)}
                    onDropItem={() => moveCategory(category.id)}
                    onDragEnd={() => setDraggedBodyItem(null)}
                    onEdit={() => editCategory(category)}
                    onHide={() => hideCategory(category)}
                    onSelect={() => selectCategory(category)}
                    onStartDrag={() => setDraggedBodyItem({ kind: "category", id: category.id })}
                    target={{ ...category, kind: "category" }}
                  />
                ))}
              </div>
            </div>

            <div className="admin-body-selected-preview admin-body-flow-card">
              <div className="admin-section-heading admin-section-heading--tight">
                <div>
                  <h3>{selectedCategory?.title_en || "Select a category"}</h3>
                  <p>{selectedCategory ? "Area preview" : "Areas will appear here."}</p>
                </div>
                <button
                  className="admin-light-button"
                  disabled={!canEdit || !selectedCategoryId}
                  type="button"
                  onClick={startNewArea}
                >
                  New area
                </button>
              </div>

              <div className="admin-body-area-grid">
                {selectedAreas.map((area) => (
                  <BodyPreviewCard
                    active={areaDraft.id === area.id && editingKind === "area"}
                    images={images}
                    key={area.id}
                    canEdit={canEdit}
                    onDelete={() => removeArea(area)}
                    onDropItem={() => moveArea(area.id)}
                    onDragEnd={() => setDraggedBodyItem(null)}
                    onEdit={() => editArea(area)}
                    onHide={() => hideArea(area)}
                    onSelect={() => selectArea(area)}
                    onStartDrag={() => setDraggedBodyItem({ kind: "area", id: area.id })}
                    target={{ ...area, kind: "area" }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {cropTarget ? (
        <CropAdjuster
          image={cropTarget.image}
          onClose={() => setCropTarget(null)}
          onSave={saveCropData}
          saving={saving}
          title={cropTarget.title}
        />
      ) : null}

      {entityEditorOpen ? (
        <div className="admin-editor-modal" role="dialog" aria-modal="true">
          <div className="admin-editor-panel-modal" ref={entityEditorRef}>
            <BodyEntityEditor
              draft={editingKind === "category" ? categoryDraft : areaDraft}
              images={images}
              kind={editingKind}
              onChange={editingKind === "category" ? setCategoryDraft : setAreaDraft}
              onClose={() => setEntityEditorOpen(false)}
              onAdjustImage={setCropTarget}
              onImageSelect={handleEntityImageSelect}
              onSubmit={editingKind === "category" ? submitCategory : submitArea}
              pendingFiles={pendingEntityFiles}
              saving={saving}
            />
          </div>
        </div>
      ) : null}

      {referenceEditorOpenModal ? (
        <div className="admin-editor-modal" role="dialog" aria-modal="true">
          <div className="admin-editor-panel-modal" ref={entityEditorRef}>
            <div className="admin-body-form">
              <div className="admin-section-heading admin-section-heading--tight">
                <div>
                  <h3>Edit body references</h3>
                  <p>These images appear in the body reference step.</p>
                </div>
                <button className="admin-light-button" type="button" onClick={() => setReferenceEditorOpenModal(false)}>
                  Close
                </button>
              </div>
              <div className="admin-image-editor-grid">
                {bodyReferences.map((bodyReference) => (
                  <ReferenceImageSlot
                    bodyReference={bodyReference}
                    image={referenceImages.find(
                      (item) => item.body_reference === bodyReference,
                    )}
                    key={bodyReference}
                    onAdjustImage={setCropTarget}
                    onImageChange={handleReferenceImageChange}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function BodyPreviewCard({
  active,
  canEdit,
  images,
  onDelete,
  onDragEnd,
  onDropItem,
  onEdit,
  onHide,
  onSelect,
  onStartDrag,
  target,
}) {
  const maleImage = getImage(images, target, "male", "card");
  const femaleImage = getImage(images, target, "female", "card");

  return (
    <article
      className={`admin-body-preview-card ${active ? "is-active" : ""}`}
      draggable={canEdit}
      onDragEnd={onDragEnd}
      onDragOver={(event) => event.preventDefault()}
      onDragStart={onStartDrag}
      onDrop={(event) => {
        event.preventDefault();
        onDropItem();
      }}
    >
      <button className="admin-body-card-main" type="button" onClick={onSelect}>
        <div className="admin-body-card-images">
          {maleImage?.previewUrl ? (
            <CroppedImage cropData={maleImage.crop_data} imageUrl={maleImage.previewUrl} />
          ) : (
            <small>Male</small>
          )}
          {femaleImage?.previewUrl ? (
            <CroppedImage cropData={femaleImage.crop_data} imageUrl={femaleImage.previewUrl} />
          ) : (
            <small>Female</small>
          )}
        </div>
        <strong>{target.title_en || "Untitled"}</strong>
        <span>{target.is_active ? "Visible" : "Hidden"}</span>
      </button>
      <div className="admin-card-actions">
        {canEdit ? (
          <>
            <button type="button" onClick={onEdit}>Edit</button>
            <button type="button" onClick={onHide}>{target.is_active ? "Hide" : "Show"}</button>
            <button type="button" onClick={onDelete}>Delete</button>
          </>
        ) : (
          <span className="admin-muted-light">Read only</span>
        )}
      </div>
    </article>
  );
}

function ReferencePreviewCard({ bodyReference, image }) {
  return (
    <article className="admin-body-reference-card">
      {image?.previewUrl ? (
        <CroppedImage cropData={image.crop_data} imageUrl={image.previewUrl} />
      ) : (
        <small>No image</small>
      )}
      <strong>{bodyReference}</strong>
    </article>
  );
}

function BodyEntityEditor({
  draft,
  images,
  kind,
  onAdjustImage,
  onChange,
  onClose,
  onImageSelect,
  onSubmit,
  pendingFiles,
  saving,
}) {
  const target = { ...draft, kind };

  return (
    <form className="admin-body-form" onSubmit={onSubmit}>
      <div className="admin-section-heading admin-section-heading--tight">
        <div>
          <h3>{draft.id ? `Edit ${kind}` : `New ${kind}`}</h3>
          <p>Title, order and visibility.</p>
        </div>
        <button className="admin-light-button" type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="admin-form-grid">
        <label>
          English title
          <input
            value={draft.title_en}
            onChange={(event) =>
              onChange({
                ...draft,
                title_en: event.target.value,
                slug: draft.id ? draft.slug : normalizeSlug(event.target.value),
              })
            }
            placeholder={kind === "category" ? "Example: Arm" : "Example: Inner arm"}
          />
        </label>
        <label>
          Hebrew title
          <input
            value={draft.title_he}
            onChange={(event) => onChange({ ...draft, title_he: event.target.value })}
            placeholder="Hebrew title"
          />
        </label>
        <label>
          Slug
          <input
            disabled={Boolean(draft.id)}
            value={draft.slug}
            onChange={(event) => onChange({ ...draft, slug: normalizeSlug(event.target.value) })}
            placeholder={kind === "category" ? "arm" : "arm-inner"}
          />
        </label>
        <label>
          Sort
          <input
            min="0"
            type="number"
            value={draft.sort_order}
            onChange={(event) => onChange({ ...draft, sort_order: event.target.value })}
            placeholder="10"
          />
        </label>
        <label>
          Visibility
          <select
            value={draft.is_active ? "yes" : "no"}
            onChange={(event) => onChange({ ...draft, is_active: event.target.value === "yes" })}
          >
            <option value="yes">Visible</option>
            <option value="no">Hidden</option>
          </select>
        </label>
      </div>
      <button className="admin-primary-light" disabled={saving} type="submit">
        {saving ? "Saving..." : `Save ${kind}`}
      </button>

      <ImageEditor
        images={images}
        onAdjustImage={onAdjustImage}
        onImageSelect={onImageSelect}
        pendingFiles={pendingFiles}
        target={target}
      />
    </form>
  );
}

function ImageEditor({ images, onAdjustImage, onImageSelect, pendingFiles, target }) {
  return (
    <div className="admin-body-image-editor">
      <h3>Images</h3>
      <p>
        Every category and area should have male and female images.
        {!target.id ? " Files selected here will upload after saving." : ""}
      </p>
      <div className="admin-image-editor-grid">
        {bodyReferences.map((bodyReference) => (
          <ImageSlot
            bodyReference={bodyReference}
            image={getImage(images, target, bodyReference, "card")}
            imageRole="card"
            key={`${bodyReference}-card`}
            onAdjustImage={onAdjustImage}
            onImageSelect={onImageSelect}
            pendingFile={pendingFiles?.[`${bodyReference}-card`]}
            target={target}
          />
        ))}
        {bodyReferences.map((bodyReference) => (
          <ImageSlot
            bodyReference={bodyReference}
            image={getImage(images, target, bodyReference, "placement")}
            imageRole="placement"
            key={`${bodyReference}-placement`}
            onAdjustImage={onAdjustImage}
            onImageSelect={onImageSelect}
            pendingFile={pendingFiles?.[`${bodyReference}-placement`]}
            target={target}
          />
        ))}
      </div>
    </div>
  );
}

function ImageSlot({ bodyReference, image, imageRole, onAdjustImage, onImageSelect, pendingFile, target }) {
  return (
    <div className="admin-body-image-slot">
      <label>
        <span>
          {bodyReference} / {imageRole}
        </span>
        {image?.previewUrl ? (
          <CroppedImage cropData={image.crop_data} imageUrl={image.previewUrl} />
        ) : pendingFile ? (
          <small>{pendingFile.name}</small>
        ) : (
          <small>No image</small>
        )}
        <input
          accept="image/jpeg,image/png,image/webp"
          type="file"
          onChange={(event) =>
            onImageSelect(target, bodyReference, imageRole, event.target.files?.[0])
          }
        />
      </label>
      <button
        className="admin-light-button"
        disabled={!image?.previewUrl}
        type="button"
        onClick={() =>
          onAdjustImage({
            image,
            kind: "body",
            title: `${target.title_en} - ${bodyReference} ${imageRole}`,
          })
        }
      >
        Adjust
      </button>
    </div>
  );
}

function ReferenceImageSlot({ bodyReference, image, onAdjustImage, onImageChange }) {
  const [selectedFile, setSelectedFile] = useState(null);

  async function handleSave() {
    if (!selectedFile) return;
    await onImageChange(bodyReference, selectedFile);
    setSelectedFile(null);
  }

  return (
    <div className="admin-body-image-slot admin-body-image-slot--confirm">
      <label>
        <span>{bodyReference}</span>
        {image?.previewUrl ? (
          <CroppedImage cropData={image.crop_data} imageUrl={image.previewUrl} />
        ) : (
          <small>No image</small>
        )}
        <input
          accept="image/jpeg,image/png,image/webp"
          type="file"
          onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
        />
      </label>
      {selectedFile ? <small>Selected: {selectedFile.name}</small> : null}
      <button
        className="admin-primary-light"
        disabled={!selectedFile}
        type="button"
        onClick={handleSave}
      >
        Save body reference
      </button>
      <button
        className="admin-light-button"
        disabled={!image?.previewUrl}
        type="button"
        onClick={() =>
          onAdjustImage({
            image,
            kind: "reference",
            title: `${bodyReference} body reference`,
          })
        }
      >
        Adjust
      </button>
    </div>
  );
}

function CropAdjuster({ image, onClose, onSave, saving, title }) {
  const [draft, setDraft] = useState(normalizeCrop(image.crop_data));

  function update(field, value) {
    setDraft((currentDraft) => normalizeCrop({ ...currentDraft, [field]: Number(value) }));
  }

  return (
    <div className="admin-crop-modal" role="dialog" aria-modal="true">
      <div className="admin-crop-panel">
        <div className="admin-section-heading">
          <div>
            <h3>{title}</h3>
            <p>Adjust zoom and position. This changes how the image is framed in cards.</p>
          </div>
          <button className="admin-light-button" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="admin-crop-preview">
          <CroppedImage cropData={draft} imageUrl={image.previewUrl} loading="eager" />
        </div>

        <div className="admin-crop-controls">
          <label>
            Zoom
            <input
              max="2.5"
              min="1"
              step="0.05"
              type="range"
              value={draft.zoom}
              onChange={(event) => update("zoom", event.target.value)}
            />
          </label>
          <label>
            Horizontal
            <input
              max="45"
              min="-45"
              step="1"
              type="range"
              value={draft.x}
              onChange={(event) => update("x", event.target.value)}
            />
          </label>
          <label>
            Vertical
            <input
              max="45"
              min="-45"
              step="1"
              type="range"
              value={draft.y}
              onChange={(event) => update("y", event.target.value)}
            />
          </label>
        </div>

        <div className="admin-crop-actions">
          <button className="admin-light-button" type="button" onClick={() => setDraft({ x: 0, y: 0, zoom: 1 })}>
            Reset
          </button>
          <button className="admin-primary-light" disabled={saving} type="button" onClick={() => onSave(draft)}>
            {saving ? "Saving..." : "Save framing"}
          </button>
        </div>
      </div>
    </div>
  );
}

function getImage(images, target, bodyReference, imageRole) {
  return images.find((image) => {
    const sameTarget =
      target.kind === "category"
        ? image.category_id === target.id
        : image.body_area_id === target.id;

    return sameTarget && image.body_reference === bodyReference && image.image_role === imageRole;
  });
}

function sortItems(items) {
  return [...items].sort((a, b) => a.sort_order - b.sort_order);
}

function reorderItems(items, draggedId, targetId) {
  const draggedIndex = items.findIndex((item) => item.id === draggedId);
  const targetIndex = items.findIndex((item) => item.id === targetId);

  if (draggedIndex < 0 || targetIndex < 0 || draggedIndex === targetIndex) {
    return items;
  }

  const nextItems = [...items];
  const [draggedItem] = nextItems.splice(draggedIndex, 1);
  nextItems.splice(targetIndex, 0, draggedItem);
  return nextItems;
}
