import { useEffect, useMemo, useState } from "react";
import {
  deleteTattooStyle,
  listTattooStylesAdmin,
  normalizeSlug,
  saveTattooStyle,
  uploadTattooStyleImage,
} from "../services/stylesApi";

const emptyStyle = {
  id: "",
  slug: "",
  title_en: "",
  title_he: "",
  placement_group: "main",
  sort_order: 0,
  color_image_path: "",
  black_grey_image_path: "",
  colorPreviewUrl: "",
  blackGreyPreviewUrl: "",
  is_active: true,
};

export function StylesModule() {
  const [styles, setStyles] = useState([]);
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
  const [message, setMessage] = useState("");

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
      sortedStyles.filter(
        (style) =>
          style.is_active &&
          (previewMode === "blackGrey"
            ? style.hasBlackGrey
            : style.hasColor),
      ),
    [previewMode, sortedStyles],
  );
  const mainStyles = previewStyles.filter((style) => style.placement_group === "main");
  const moreStyles = previewStyles.filter((style) => style.placement_group === "more");

  useEffect(() => {
    loadStyles();
  }, []);

  async function loadStyles() {
    setLoading(true);
    const result = await listTattooStylesAdmin();
    setStyles(result.styles);
    setMessage(result.error || "");
    setLoading(false);
  }

  function openNewStyle() {
    setDraft({
      ...emptyStyle,
      sort_order: (styles.length + 1) * 10,
    });
    setColorFile(null);
    setBlackGreyFile(null);
    setEditorOpen(true);
    setMessage("");
  }

  function editStyle(style) {
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
    setSaving(true);
    const result = await saveTattooStyle({ ...style, ...patch });

    if (result.error) {
      setMessage(result.error);
    } else {
      await loadStyles();
    }

    setSaving(false);
  }

  async function removeStyle(style) {
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

  async function moveStyle(droppedGroup, targetStyleId = "") {
    if (!draggedStyleId) return;

    const draggedStyle = styles.find((style) => style.id === draggedStyleId);
    if (!draggedStyle) return;

    const groupStyles = sortStyles(
      styles.filter(
        (style) =>
          style.is_active &&
          style.id !== draggedStyleId &&
          style.placement_group === droppedGroup,
      ),
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
        placement_group: droppedGroup,
        sort_order: (index + 1) * 10,
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
            <button className="admin-primary-light" type="button" onClick={openNewStyle}>
              New style
            </button>
          </div>
        </div>

        {message ? <p className="admin-inline-message">{message}</p> : null}

        {editorOpen ? (
          <StyleEditor
            blackGreyFile={blackGreyFile}
            colorFile={colorFile}
            draft={draft}
            onBlackGreyFileChange={setBlackGreyFile}
            onClose={closeEditor}
            onColorFileChange={setColorFile}
            onSubmit={handleSubmit}
            onUpdateDraft={updateDraft}
            saving={saving}
          />
        ) : null}

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
            onStartDrag={setDraggedStyleId}
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
            onStartDrag={setDraggedStyleId}
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
    </section>
  );
}

function StyleEditor({
  blackGreyFile,
  colorFile,
  draft,
  onBlackGreyFileChange,
  onClose,
  onColorFileChange,
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
          Position
          <input
            min="0"
            type="number"
            value={draft.sort_order}
            onChange={(event) => onUpdateDraft("sort_order", event.target.value)}
            placeholder="Example: 10"
          />
        </label>
        <label>
          Display
          <select
            value={draft.placement_group}
            onChange={(event) => onUpdateDraft("placement_group", event.target.value)}
          >
            <option value="main">Always visible</option>
            <option value="more">Show more</option>
          </select>
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
          file={colorFile}
          imageUrl={draft.colorPreviewUrl}
          label="Color image"
          onChange={onColorFileChange}
        />
        <ImageUploadField
          file={blackGreyFile}
          imageUrl={draft.blackGreyPreviewUrl}
          label="Black & grey image"
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
  draggedStyleId,
  group,
  language,
  mode,
  onDropStyle,
  onEdit,
  onHide,
  onRemove,
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
            group={group}
            key={style.id}
            language={language}
            mode={mode}
            onDropStyle={onDropStyle}
            onEdit={onEdit}
            onHide={onHide}
            onRemove={onRemove}
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
  group,
  language,
  mode,
  onDropStyle,
  onEdit,
  onHide,
  onRemove,
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
      draggable
      onDragOver={(event) => event.preventDefault()}
      onDragStart={() => onStartDrag(style.id)}
      onDrop={(event) => {
        event.stopPropagation();
        onDropStyle(group, style.id);
      }}
    >
      {imageUrl ? <img src={imageUrl} alt={label} /> : <div>No image</div>}
      <strong>{label}</strong>
      <div className="admin-card-actions">
        <button type="button" onClick={() => onEdit(style)}>Edit</button>
        <button type="button" onClick={() => onHide(style)}>Hide</button>
        <button type="button" onClick={() => onRemove(style)}>Delete</button>
      </div>
    </article>
  );
}

function ImageUploadField({ file, imageUrl, label, onChange }) {
  return (
    <label className="admin-upload-card">
      <span>{label}</span>
      {imageUrl ? (
        <img src={imageUrl} alt={label} />
      ) : (
        <small>{file ? file.name : "No image selected yet"}</small>
      )}
      {file && imageUrl ? <small>New file selected: {file.name}</small> : null}
      <input
        accept="image/jpeg,image/png,image/webp"
        type="file"
        onChange={(event) => onChange(event.target.files?.[0] || null)}
      />
    </label>
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
