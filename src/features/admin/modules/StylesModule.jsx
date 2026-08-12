import { useEffect, useMemo, useRef, useState } from "react";
import { CroppedImage } from "../../../components/CroppedImage";
import { normalizeCrop } from "../../../utils/cropUtils";
import {
  deleteTattooStyle,
  listMoreStylePreviews,
  listTattooStylesAdmin,
  normalizeSlug,
  saveMoreStylePreview,
  saveTattooStyle,
  uploadMoreStylePreviewImage,
  uploadTattooStyleImage,
} from "../services/stylesApi";

const emptyStyle = {
  id: "",
  slug: "",
  title_en: "",
  title_he: "",
  placement_group: "main",
  sort_order: 0,
  color_placement_group: "main",
  color_sort_order: 0,
  black_grey_placement_group: "main",
  black_grey_sort_order: 0,
  color_image_path: "",
  black_grey_image_path: "",
  color_crop_data: {},
  black_grey_crop_data: {},
  colorPreviewUrl: "",
  blackGreyPreviewUrl: "",
  is_more_styles_preview: false,
  is_active: true,
};

export function StylesModule({ canEdit = true }) {
  const [styles, setStyles] = useState([]);
  const [moreStylePreviews, setMoreStylePreviews] = useState([]);
  const [draft, setDraft] = useState(emptyStyle);
  const [colorFile, setColorFile] = useState(null);
  const [blackGreyFile, setBlackGreyFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState("color");
  const [previewLanguage, setPreviewLanguage] = useState("en");
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryGroupFilter, setLibraryGroupFilter] = useState("all");
  const [libraryVisibilityFilter, setLibraryVisibilityFilter] = useState("all");
  const [draggedStyleId, setDraggedStyleId] = useState("");
  const [cropTarget, setCropTarget] = useState(null);
  const [message, setMessage] = useState("");
  const editorRef = useRef(null);

  const sortedStyles = useMemo(() => sortStyles(styles), [styles]);
  const filteredLibraryStyles = useMemo(
    () =>
      sortedStyles.filter((style) => {
        const searchValue = librarySearch.trim().toLowerCase();
        const matchesSearch =
          !searchValue ||
          [style.title_en, style.title_he, style.slug]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(searchValue));
        const matchesGroup =
          libraryGroupFilter === "all" ||
          style.placement_group === libraryGroupFilter;
        const matchesVisibility =
          libraryVisibilityFilter === "all" ||
          (libraryVisibilityFilter === "visible" && style.is_active) ||
          (libraryVisibilityFilter === "hidden" && !style.is_active);

        return matchesSearch && matchesGroup && matchesVisibility;
      }),
    [libraryGroupFilter, librarySearch, libraryVisibilityFilter, sortedStyles],
  );
  const previewStyles = useMemo(
    () =>
      sortStylesForMode(
        sortedStyles.filter(
          (style) =>
            style.is_active &&
            (previewMode === "blackGrey"
              ? style.hasBlackGrey
              : style.hasColor),
        ),
        previewMode,
      ),
    [previewMode, sortedStyles],
  );
  const mainStyles = previewStyles.filter(
    (style) => getStyleGroup(style, previewMode) === "main",
  );
  const moreStyles = previewStyles.filter(
    (style) => getStyleGroup(style, previewMode) === "more",
  );

  useEffect(() => {
    loadStyles();
  }, []);

  useEffect(() => {
    if (!editorOpen) return;

    window.setTimeout(() => {
      editorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      editorRef.current?.querySelector("input, select, button")?.focus();
    }, 0);
  }, [editorOpen]);

  async function loadStyles() {
    setLoading(true);
    const [stylesResult, previewsResult] = await Promise.all([
      listTattooStylesAdmin(),
      listMoreStylePreviews(),
    ]);
    setStyles(stylesResult.styles);
    setMoreStylePreviews(previewsResult.previews);
    setMessage(stylesResult.error || previewsResult.error || "");
    setLoading(false);
  }

  function openNewStyle() {
    if (!canEdit) return;

    setDraft({
      ...emptyStyle,
      sort_order: (styles.length + 1) * 10,
      color_sort_order: (styles.length + 1) * 10,
      black_grey_sort_order: (styles.length + 1) * 10,
    });
    setColorFile(null);
    setBlackGreyFile(null);
    setEditorOpen(true);
    setMessage("");
  }

  function editStyle(style) {
    if (!canEdit) return;

    setDraft(style);
    setColorFile(null);
    setBlackGreyFile(null);
    setEditorOpen(true);
    setMessage("");
  }

  function closeEditor() {
    setDraft(emptyStyle);
    setColorFile(null);
    setBlackGreyFile(null);
    setEditorOpen(false);
  }

  function updateDraft(field, value) {
    setDraft((currentDraft) => {
      const nextDraft = { ...currentDraft, [field]: value };

      if (field === "title_en" && !currentDraft.id) {
        nextDraft.slug = normalizeSlug(value);
      }

      if (field === "slug") {
        nextDraft.slug = normalizeSlug(value);
      }

      return nextDraft;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canEdit) return;

    setSaving(true);
    setMessage("");

    const baseSlug = draft.id ? draft.slug.trim() : normalizeSlug(draft.slug || draft.title_en);
    let nextDraft = { ...draft, slug: baseSlug };

    if (!baseSlug || !draft.title_en.trim()) {
      setMessage("Name and slug are required.");
      setSaving(false);
      return;
    }

    if (colorFile) {
      const upload = await uploadTattooStyleImage(colorFile, baseSlug, "color");
      if (upload.error) {
        setMessage(upload.error);
        setSaving(false);
        return;
      }

      nextDraft = {
        ...nextDraft,
        color_image_path: upload.path,
        colorPreviewUrl: upload.previewUrl,
      };
    }

    if (blackGreyFile) {
      const upload = await uploadTattooStyleImage(
        blackGreyFile,
        baseSlug,
        "black-grey",
      );

      if (upload.error) {
        setMessage(upload.error);
        setSaving(false);
        return;
      }

      nextDraft = {
        ...nextDraft,
        black_grey_image_path: upload.path,
        blackGreyPreviewUrl: upload.previewUrl,
      };
    }

    const result = await saveTattooStyle(nextDraft);

    if (result.error) {
      setMessage(result.error);
      setSaving(false);
      return;
    }

    await loadStyles();
    closeEditor();
    setMessage("Style saved.");
    setSaving(false);
  }

  async function quickUpdate(style, patch) {
    if (!canEdit) return;

    setSaving(true);
    const result = await saveTattooStyle({ ...style, ...patch });

    if (result.error) {
      setMessage(result.error);
    } else {
      await loadStyles();
    }

    setSaving(false);
  }

  async function handleMorePreviewUpload(colorMode, file) {
    if (!canEdit) return;
    if (!file) return;

    setSaving(true);
    setMessage("");

    const upload = await uploadMoreStylePreviewImage(file, colorMode);
    if (upload.error) {
      setMessage(upload.error);
      setSaving(false);
      return;
    }

    const currentPreview = getMoreStylePreview(moreStylePreviews, colorMode);
    const result = await saveMoreStylePreview({
      ...currentPreview,
      color_mode: colorMode,
      image_path: upload.path,
      crop_data: currentPreview?.crop_data || {},
    });

    if (result.error) {
      setMessage(result.error);
    } else {
      await loadStyles();
      setMessage("More styles image saved.");
    }

    setSaving(false);
  }

  async function removeStyle(style) {
    if (!canEdit) return;

    const confirmed = window.confirm(`Delete ${style.title_en}? This cannot be undone.`);
    if (!confirmed) return;

    setSaving(true);
    const result = await deleteTattooStyle(style.id);

    if (result.error) {
      setMessage(result.error);
    } else {
      await loadStyles();
      if (draft.id === style.id) closeEditor();
      setMessage("Style deleted.");
    }

    setSaving(false);
  }

  async function saveStyleCrop(cropData) {
    if (!canEdit) return;

    if (cropTarget?.preview) {
      setSaving(true);
      const result = await saveMoreStylePreview({
        ...cropTarget.preview,
        crop_data: cropData,
      });

      if (result.error) {
        setMessage(result.error);
      } else {
        setCropTarget(null);
        await loadStyles();
        setMessage("More styles framing saved.");
      }

      setSaving(false);
      return;
    }

    if (!cropTarget?.style) return;

    const cropField =
      cropTarget.mode === "blackGrey" ? "black_grey_crop_data" : "color_crop_data";

    setSaving(true);
    const result = await saveTattooStyle({
      ...cropTarget.style,
      [cropField]: cropData,
    });

    if (result.error) {
      setMessage(result.error);
    } else {
      setCropTarget(null);
      await loadStyles();
      setMessage("Style framing saved.");
    }

    setSaving(false);
  }

  async function moveStyle(droppedGroup, targetStyleId = "") {
    if (!canEdit) return;
    if (!draggedStyleId) return;

    const draggedStyle = styles.find((style) => style.id === draggedStyleId);
    if (!draggedStyle) return;

    const groupStyles = sortStylesForMode(
      styles.filter(
        (style) =>
          style.is_active &&
          style.id !== draggedStyleId &&
          getStyleGroup(style, previewMode) === droppedGroup &&
          (previewMode === "blackGrey" ? style.hasBlackGrey : style.hasColor),
      ),
      previewMode,
    );
    const targetIndex = targetStyleId
      ? groupStyles.findIndex((style) => style.id === targetStyleId)
      : groupStyles.length;
    const insertIndex = targetIndex >= 0 ? targetIndex : groupStyles.length;
    const reorderedGroup = [
      ...groupStyles.slice(0, insertIndex),
      { ...draggedStyle, placement_group: droppedGroup },
      ...groupStyles.slice(insertIndex),
    ];

    setSaving(true);
    const updates = reorderedGroup.map((style, index) =>
      saveTattooStyle({
        ...style,
        ...getStyleModePatch(previewMode, droppedGroup, (index + 1) * 10),
      }),
    );
    const results = await Promise.all(updates);
    const error = results.find((result) => result.error)?.error;

    if (error) {
      setMessage(error);
    } else {
      await loadStyles();
    }

    setDraggedStyleId("");
    setSaving(false);
  }

  return (
    <section className="admin-module-stack">
      <div className="admin-white-panel admin-styles-preview-panel">
        <div className="admin-section-heading">
          <div>
            <h3>Form preview</h3>
            <p>Drag cards to reorder or move between Main and Show more.</p>
          </div>
          <div className="admin-preview-controls">
            <select value={previewMode} onChange={(event) => setPreviewMode(event.target.value)}>
              <option value="color">Color</option>
              <option value="blackGrey">Black & grey</option>
            </select>
            <select
              value={previewLanguage}
              onChange={(event) => setPreviewLanguage(event.target.value)}
            >
              <option value="en">English</option>
              <option value="he">Hebrew</option>
            </select>
            {canEdit ? (
              <button className="admin-primary-light" type="button" onClick={openNewStyle}>
                New style
              </button>
            ) : (
              <span className="admin-readonly-pill">Viewer mode</span>
            )}
          </div>
        </div>

        {message ? <p className="admin-inline-message">{message}</p> : null}

        {editorOpen ? (
          <div className="admin-editor-modal" role="dialog" aria-modal="true">
            <div className="admin-editor-panel-modal" ref={editorRef}>
              <StyleEditor
                blackGreyFile={blackGreyFile}
                colorFile={colorFile}
                draft={draft}
                onBlackGreyFileChange={setBlackGreyFile}
                onClose={closeEditor}
                onColorFileChange={setColorFile}
                onOpenCrop={setCropTarget}
                onSubmit={handleSubmit}
                onUpdateDraft={updateDraft}
                saving={saving}
              />
            </div>
          </div>
        ) : null}

        <MoreStylesPreviewManager
          canEdit={canEdit}
          colorPreview={getMoreStylePreview(moreStylePreviews, "color")}
          blackGreyPreview={getMoreStylePreview(moreStylePreviews, "blackGrey")}
          onAdjust={(preview) => setCropTarget({ preview })}
          onUpload={handleMorePreviewUpload}
          saving={saving}
        />

        <div className="admin-preview-board">
          <StyleDropZone
            draggedStyleId={draggedStyleId}
            group="main"
            language={previewLanguage}
            mode={previewMode}
            onDropStyle={moveStyle}
            onEdit={editStyle}
            onHide={(style) => quickUpdate(style, { is_active: false })}
            onRemove={removeStyle}
            onOpenCrop={setCropTarget}
            onStartDrag={setDraggedStyleId}
            canEdit={canEdit}
            styles={mainStyles}
            title="Always visible"
          />

          <StyleDropZone
            draggedStyleId={draggedStyleId}
            group="more"
            language={previewLanguage}
            mode={previewMode}
            onDropStyle={moveStyle}
            onEdit={editStyle}
            onHide={(style) => quickUpdate(style, { is_active: false })}
            onRemove={removeStyle}
            onOpenCrop={setCropTarget}
            onStartDrag={setDraggedStyleId}
            canEdit={canEdit}
            styles={moreStyles}
            title="Show more"
          />
        </div>
      </div>

      <div className="admin-white-panel admin-style-library-panel">
        <div className="admin-section-heading">
          <div>
            <h3>Style library</h3>
            <p>
              {loading
                ? "Loading..."
                : `${filteredLibraryStyles.length} of ${styles.length} styles`}
            </p>
          </div>
          <button className="admin-light-button" type="button" onClick={loadStyles}>
            Reload
          </button>
        </div>

        <div className="admin-library-filters">
          <label>
            Search
            <input
              value={librarySearch}
              onChange={(event) => setLibrarySearch(event.target.value)}
              placeholder="Search by name or slug"
            />
          </label>
          <label>
            Display
            <select
              value={libraryGroupFilter}
              onChange={(event) => setLibraryGroupFilter(event.target.value)}
            >
              <option value="all">All displays</option>
              <option value="main">Always visible</option>
              <option value="more">Show more</option>
            </select>
          </label>
          <label>
            Visibility
            <select
              value={libraryVisibilityFilter}
              onChange={(event) => setLibraryVisibilityFilter(event.target.value)}
            >
              <option value="all">All visibility</option>
              <option value="visible">Visible</option>
              <option value="hidden">Hidden</option>
            </select>
          </label>
          <button
            className="admin-light-button"
            type="button"
            onClick={() => {
              setLibrarySearch("");
              setLibraryGroupFilter("all");
              setLibraryVisibilityFilter("all");
            }}
          >
            Clear
          </button>
        </div>

        <div className="admin-style-table">
          {filteredLibraryStyles.map((style) => (
            <article className="admin-style-library-row" key={style.id}>
              <img
                src={style.colorPreviewUrl || style.blackGreyPreviewUrl}
                alt={style.title_en}
              />
              <div>
                <strong>{style.title_en}</strong>
                <span>{style.slug}</span>
                <div className="admin-availability-row">
                  <AvailabilityBadge active={style.hasColor} label="Color" />
                  <AvailabilityBadge
                    active={style.hasBlackGrey}
                    label="Black & grey"
                  />
                </div>
              </div>
              <small>{style.is_active ? style.placement_group : "hidden"}</small>
              <div className="admin-style-actions">
                {canEdit ? (
                  <>
                    <button className="admin-light-button" type="button" onClick={() => editStyle(style)}>
                      Edit
                    </button>
                    <button
                      className="admin-light-button"
                      disabled={saving}
                      type="button"
                      onClick={() => quickUpdate(style, { is_active: !style.is_active })}
                    >
                      {style.is_active ? "Hide" : "Show"}
                    </button>
                    <button
                      className="admin-light-button admin-delete-button"
                      disabled={saving}
                      type="button"
                      onClick={() => removeStyle(style)}
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <span className="admin-muted-light">Read only</span>
                )}
              </div>
            </article>
          ))}

          {!loading && styles.length === 0 ? (
            <p className="admin-muted-light">No styles yet. Create the first one from New style.</p>
          ) : null}

          {!loading && styles.length > 0 && filteredLibraryStyles.length === 0 ? (
            <p className="admin-muted-light">No styles match those filters.</p>
          ) : null}
        </div>
      </div>

      {cropTarget ? (
        <StyleCropAdjuster
          cropData={
            cropTarget.preview
              ? cropTarget.preview.crop_data
              : cropTarget.mode === "blackGrey"
              ? cropTarget.style.black_grey_crop_data
              : cropTarget.style.color_crop_data
          }
          imageUrl={
            cropTarget.preview
              ? cropTarget.preview.previewUrl
              : cropTarget.mode === "blackGrey"
              ? cropTarget.style.blackGreyPreviewUrl
              : cropTarget.style.colorPreviewUrl
          }
          onClose={() => setCropTarget(null)}
          onSave={saveStyleCrop}
          saving={saving}
          title={
            cropTarget.preview
              ? `More styles - ${
                  cropTarget.preview.color_mode === "blackGrey" ? "Black & grey" : "Color"
                }`
              : `${cropTarget.style.title_en} - ${
                  cropTarget.mode === "blackGrey" ? "Black & grey" : "Color"
                }`
          }
        />
      ) : null}
    </section>
  );
}

function MoreStylesPreviewManager({
  blackGreyPreview,
  canEdit,
  colorPreview,
  onAdjust,
  onUpload,
  saving,
}) {
  return (
    <div className="admin-more-styles-preview-manager">
      <div>
        <h4>More styles card image</h4>
        <p>This image only opens the extra styles. It is not a selectable style.</p>
      </div>
      <div className="admin-more-styles-preview-grid">
        <ImageUploadField
          cropData={colorPreview?.crop_data}
          disabled={!canEdit}
          file={null}
          imageUrl={colorPreview?.previewUrl}
          label="More styles - Color"
          onAdjust={() => colorPreview && onAdjust(colorPreview)}
          onChange={(file) => onUpload("color", file)}
        />
        <ImageUploadField
          cropData={blackGreyPreview?.crop_data}
          disabled={!canEdit}
          file={null}
          imageUrl={blackGreyPreview?.previewUrl}
          label="More styles - Black & grey"
          onAdjust={() => blackGreyPreview && onAdjust(blackGreyPreview)}
          onChange={(file) => onUpload("blackGrey", file)}
        />
      </div>
      {!canEdit ? <p className="admin-muted-light">Viewer mode.</p> : null}
      {saving ? <p className="admin-muted-light">Saving image...</p> : null}
    </div>
  );
}

function StyleEditor({
  blackGreyFile,
  colorFile,
  draft,
  onBlackGreyFileChange,
  onClose,
  onColorFileChange,
  onOpenCrop,
  onSubmit,
  onUpdateDraft,
  saving,
}) {
  return (
    <form className="admin-editor-drawer" onSubmit={onSubmit}>
      <div className="admin-section-heading">
        <div>
          <h3>{draft.id ? "Edit style" : "New style"}</h3>
          <p>A style can be available in Color, Black & grey, or both.</p>
        </div>
        <button className="admin-light-button" type="button" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="admin-form-grid">
        <label>
          English name
          <input
            value={draft.title_en}
            onChange={(event) => onUpdateDraft("title_en", event.target.value)}
            placeholder="Example: Fine line"
          />
        </label>
        <label>
          Hebrew name
          <input
            value={draft.title_he}
            onChange={(event) => onUpdateDraft("title_he", event.target.value)}
            placeholder="Example: קו עדין"
          />
        </label>
        <label>
          Slug
          <input
            disabled={Boolean(draft.id)}
            value={draft.slug}
            onChange={(event) => onUpdateDraft("slug", event.target.value)}
            placeholder="Example: fine-line"
          />
        </label>
        <label>
          Color display
          <select
            value={draft.color_placement_group}
            onChange={(event) => onUpdateDraft("color_placement_group", event.target.value)}
          >
            <option value="main">Always visible</option>
            <option value="more">Show more</option>
          </select>
        </label>
        <label>
          Color position
          <input
            min="0"
            type="number"
            value={draft.color_sort_order}
            onChange={(event) => onUpdateDraft("color_sort_order", event.target.value)}
            placeholder="Example: 10"
          />
        </label>
        <label>
          Black & grey display
          <select
            value={draft.black_grey_placement_group}
            onChange={(event) =>
              onUpdateDraft("black_grey_placement_group", event.target.value)
            }
          >
            <option value="main">Always visible</option>
            <option value="more">Show more</option>
          </select>
        </label>
        <label>
          Black & grey position
          <input
            min="0"
            type="number"
            value={draft.black_grey_sort_order}
            onChange={(event) => onUpdateDraft("black_grey_sort_order", event.target.value)}
            placeholder="Example: 10"
          />
        </label>
        <label>
          Active
          <select
            value={draft.is_active ? "yes" : "no"}
            onChange={(event) => onUpdateDraft("is_active", event.target.value === "yes")}
          >
            <option value="yes">Visible</option>
            <option value="no">Hidden</option>
          </select>
        </label>
      </div>

      <div className="admin-upload-grid">
        <ImageUploadField
          cropData={draft.color_crop_data}
          disabled={saving}
          file={colorFile}
          imageUrl={draft.colorPreviewUrl}
          label="Color image"
          onAdjust={() => onOpenCrop({ style: draft, mode: "color" })}
          onChange={onColorFileChange}
        />
        <ImageUploadField
          cropData={draft.black_grey_crop_data}
          disabled={saving}
          file={blackGreyFile}
          imageUrl={draft.blackGreyPreviewUrl}
          label="Black & grey image"
          onAdjust={() => onOpenCrop({ style: draft, mode: "blackGrey" })}
          onChange={onBlackGreyFileChange}
        />
      </div>

      <button className="admin-primary-light" disabled={saving} type="submit">
        {saving ? "Saving..." : "Save style"}
      </button>
    </form>
  );
}

function StyleDropZone({
  canEdit,
  draggedStyleId,
  group,
  language,
  mode,
  onDropStyle,
  onEdit,
  onHide,
  onRemove,
  onOpenCrop,
  onStartDrag,
  styles,
  title,
}) {
  return (
    <div
      className={`admin-style-dropzone ${
        draggedStyleId ? "is-drop-ready" : ""
      }`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => onDropStyle(group)}
    >
      <div className="admin-style-dropzone-header">
        <h4>{title}</h4>
        <span>{styles.length}</span>
      </div>

      <div className="admin-preview-grid">
        {styles.map((style) => (
          <StylePreviewCard
            canEdit={canEdit}
            group={group}
            key={style.id}
            language={language}
            mode={mode}
            onDropStyle={onDropStyle}
            onEdit={onEdit}
            onHide={onHide}
            onRemove={onRemove}
            onOpenCrop={onOpenCrop}
            onStartDrag={onStartDrag}
            style={style}
          />
        ))}
      </div>

      {styles.length === 0 ? <p className="admin-muted-light">Drop styles here.</p> : null}
    </div>
  );
}

function StylePreviewCard({
  canEdit,
  group,
  language,
  mode,
  onDropStyle,
  onEdit,
  onHide,
  onRemove,
  onOpenCrop,
  onStartDrag,
  style,
}) {
  const imageUrl =
    mode === "blackGrey"
      ? style.blackGreyPreviewUrl
      : style.colorPreviewUrl;
  const label = language === "he" ? style.title_he : style.title_en;

  return (
    <article
      className="admin-style-preview-card"
      draggable={canEdit}
      onDragOver={(event) => event.preventDefault()}
      onDragStart={() => onStartDrag(style.id)}
      onDrop={(event) => {
        event.stopPropagation();
        onDropStyle(group, style.id);
      }}
    >
      {imageUrl ? (
        <CroppedImage
          cropData={
            mode === "blackGrey"
              ? style.black_grey_crop_data
              : style.color_crop_data
          }
          imageUrl={imageUrl}
        />
      ) : (
        <div>No image</div>
      )}
      <strong>{label}</strong>
      <div className="admin-card-actions">
        {canEdit ? (
          <>
            <button type="button" onClick={() => onEdit(style)}>Edit</button>
            <button
              disabled={!imageUrl}
              type="button"
              onClick={() => onOpenCrop({ style, mode })}
            >
              Adjust
            </button>
            <button type="button" onClick={() => onHide(style)}>Hide</button>
            <button type="button" onClick={() => onRemove(style)}>Delete</button>
          </>
        ) : (
          <span className="admin-muted-light">Read only</span>
        )}
      </div>
    </article>
  );
}

function ImageUploadField({ cropData, disabled = false, file, imageUrl, label, onAdjust, onChange }) {
  return (
    <div className="admin-upload-card">
      <label>
        <span>{label}</span>
        {imageUrl ? (
          <CroppedImage cropData={cropData} imageUrl={imageUrl} />
        ) : (
          <small>{file ? file.name : "No image selected yet"}</small>
        )}
        {file && imageUrl ? <small>New file selected: {file.name}</small> : null}
        <input
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled}
          type="file"
          onChange={(event) => onChange(event.target.files?.[0] || null)}
        />
      </label>
      <button
        className="admin-light-button"
        disabled={!imageUrl || disabled}
        type="button"
        onClick={onAdjust}
      >
        Adjust
      </button>
    </div>
  );
}

function StyleCropAdjuster({ cropData, imageUrl, onClose, onSave, saving, title }) {
  const [draft, setDraft] = useState(normalizeCrop(cropData));

  function update(field, value) {
    setDraft((currentDraft) => normalizeCrop({ ...currentDraft, [field]: Number(value) }));
  }

  return (
    <div className="admin-crop-modal" role="dialog" aria-modal="true">
      <div className="admin-crop-panel">
        <div className="admin-section-heading">
          <div>
            <h3>{title}</h3>
            <p>Adjust how this style image appears in cards.</p>
          </div>
          <button className="admin-light-button" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="admin-crop-preview">
          <CroppedImage cropData={draft} imageUrl={imageUrl} loading="eager" />
        </div>
        <div className="admin-crop-controls">
          <label>
            Zoom
            <input max="2.5" min="1" step="0.05" type="range" value={draft.zoom} onChange={(event) => update("zoom", event.target.value)} />
          </label>
          <label>
            Horizontal
            <input max="45" min="-45" step="1" type="range" value={draft.x} onChange={(event) => update("x", event.target.value)} />
          </label>
          <label>
            Vertical
            <input max="45" min="-45" step="1" type="range" value={draft.y} onChange={(event) => update("y", event.target.value)} />
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

function AvailabilityBadge({ active, label }) {
  return (
    <span className={`admin-availability-badge ${active ? "is-active" : ""}`}>
      {label}
    </span>
  );
}

function sortStyles(styles) {
  return [...styles].sort((a, b) => {
    if (a.placement_group !== b.placement_group) {
      return a.placement_group === "main" ? -1 : 1;
    }

    return a.sort_order - b.sort_order;
  });
}

function getStyleGroup(style, mode) {
  if (mode === "blackGrey") {
    return style.black_grey_placement_group || style.placement_group || "main";
  }

  return style.color_placement_group || style.placement_group || "main";
}

function getStyleOrder(style, mode) {
  if (mode === "blackGrey") {
    return Number(style.black_grey_sort_order ?? style.sort_order) || 0;
  }

  return Number(style.color_sort_order ?? style.sort_order) || 0;
}

function getStyleModePatch(mode, group, sortOrder) {
  if (mode === "blackGrey") {
    return {
      black_grey_placement_group: group,
      black_grey_sort_order: sortOrder,
    };
  }

  return {
    color_placement_group: group,
    color_sort_order: sortOrder,
  };
}

function getMoreStylePreview(previews, colorMode) {
  return previews.find((preview) => preview.color_mode === colorMode) || null;
}

function sortStylesForMode(styles, mode) {
  return [...styles].sort((a, b) => {
    const groupA = getStyleGroup(a, mode);
    const groupB = getStyleGroup(b, mode);

    if (groupA !== groupB) return groupA === "main" ? -1 : 1;

    return getStyleOrder(a, mode) - getStyleOrder(b, mode);
  });
}
