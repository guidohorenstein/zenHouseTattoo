/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import { listFormTexts, updateFormText } from "../services/textsApi";

const PAGES = [
  {
    id: "global",
    label: "Global",
    keys: [
      "brand", "intro", "step", "of", "back", "next", "quote",
      "clearAll", "delete", "mark", "marksEmpty", "referenceImages",
      "maxReferenceImages", "maxPlacementBoxes", "minIdeaCharacters",
      "moreStyles", "showLessStyles", "otherStyleNeedsReference", "submitting",
    ],
  },
  {
    id: "step-1",
    label: "Step 1 — Contact",
    keys: [
      "steps.name.title", "steps.name.note",
      "steps.name.placeholders.fullName", "steps.name.placeholders.email",
      "steps.name.placeholders.phone",
    ],
  },
  {
    id: "step-2",
    label: "Step 2 — Idea",
    keys: [
      "steps.description.title", "steps.description.ideaLabel",
      "steps.description.uploadLabel", "steps.description.placeholder",
    ],
  },
  {
    id: "step-3",
    label: "Step 3 — Color",
    keys: ["steps.color.title", "options.blackGrey", "options.color"],
  },
  {
    id: "step-4",
    label: "Step 4 — Style",
    keys: [
      "steps.style.title",
      "options.fineLine", "options.realism", "options.newAge",
      "options.traditional", "options.japanese", "options.blackwork",
      "options.geometric", "options.biomechanical", "options.chicano",
      "options.futuristic", "options.lettering", "options.dotwork",
      "options.microRealism", "options.abstract", "options.floral",
      "options.mandala", "options.neoTraditional", "options.newSchool",
      "options.ornamental", "options.portrait", "options.sketch",
      "options.surrealism", "options.trashPolka", "options.tribal",
      "options.watercolor", "options.other",
    ],
  },
  {
    id: "step-5",
    label: "Step 5 — Body model",
    keys: [
      "steps.bodyReference.title", "options.male", "options.female",
    ],
  },
  {
    id: "step-6",
    label: "Step 6 — Body zone",
    keys: [
      "steps.generalZone.title",
      "options.torso", "options.arm", "options.leg",
      "options.hand", "options.face",
    ],
  },
  {
    id: "step-7",
    label: "Step 7 — Specific zone",
    keys: [
      "steps.specificZone.title",
      "options.torsoFront", "options.torsoBack", "options.torsoRibs",
      "options.armInner", "options.armOuter", "options.sleeve",
      "options.legsFront", "options.legBack", "options.legSide",
      "options.handInner", "options.handOuter",
      "options.faceFront", "options.faceBack", "options.faceSide",
    ],
  },
  {
    id: "step-8",
    label: "Step 8 — Placement",
    keys: ["steps.placement.title", "steps.placement.note"],
  },
  {
    id: "step-9",
    label: "Step 9 — Timing",
    keys: [
      "steps.timing.title",
      "options.now", "options.weeks", "options.month", "options.dontCare",
    ],
  },
  {
    id: "step-10",
    label: "Step 10 — Contact time",
    keys: [
      "steps.contactTime.title", "steps.contactTime.note",
      "options.morning", "options.afternoon", "options.night",
    ],
  },
  {
    id: "step-11",
    label: "Step 11 — Has tattoos",
    keys: [
      "steps.hasTattoos.title", "options.yes", "options.no",
    ],
  },
  {
    id: "errors",
    label: "Error messages",
    keys: [
      "errors.name", "errors.description", "errors.style", "errors.color",
      "errors.bodyReference", "errors.generalZone", "errors.specificZone",
      "errors.placement", "errors.timing", "errors.contactTime",
      "errors.hasTattoos", "errors.default",
    ],
  },
  {
    id: "whatsapp",
    label: "WhatsApp message",
    keys: [
      "whatsapp.hello", "whatsapp.name", "whatsapp.email", "whatsapp.phone",
      "whatsapp.bodyReference", "whatsapp.hasTattoos", "whatsapp.generalZone",
      "whatsapp.specificZone", "whatsapp.placement", "whatsapp.style",
      "whatsapp.color", "whatsapp.idea", "whatsapp.referenceImages",
      "whatsapp.timing", "whatsapp.contactTime",
    ],
  },
];

function friendlyLabel(key) {
  const last = key.split(".").pop();
  return last
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

export function TextsModule({ canEdit = true }) {
  const [texts, setTexts] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [savingKey, setSavingKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [language, setLanguage] = useState("he");

  const page = PAGES[pageIndex];

  async function loadTexts() {
    setLoading(true);
    const result = await listFormTexts();
    setTexts(result.texts);

    const initial = {};
    for (const text of result.texts) {
      initial[text.key + ".en"] = text.en_text;
      initial[text.key + ".he"] = text.he_text;
    }
    setDrafts(initial);

    setMessage(result.error || "");
    setLoading(false);
  }

  useEffect(() => {
    loadTexts();
  }, []);

  const textsByKey = useMemo(() => {
    const map = {};
    for (const text of texts) {
      map[text.key] = text;
    }
    return map;
  }, [texts]);

  function getDraft(key) {
    return drafts[key + "." + language] ?? "";
  }

  function setDraft(key, value) {
    setDrafts((current) => ({ ...current, [key + "." + language]: value }));
  }

  function isDirty(key) {
    const original = textsByKey[key];
    if (!original) return false;

    const field = language === "he" ? "he_text" : "en_text";
    return drafts[key + "." + language] !== original[field];
  }

  async function saveText(key) {
    if (!canEdit) return;

    const heValue = drafts[key + ".he"] ?? "";
    const enValue = drafts[key + ".en"] ?? "";
    setSavingKey(key);
    const result = await updateFormText(key, heValue, enValue);

    if (result.error) {
      setMessage(result.error);
    } else {
      setTexts((current) =>
        current.map((text) =>
          text.key === key ? { ...text, he_text: heValue, en_text: enValue } : text,
        ),
      );
      setMessage("");
    }

    setSavingKey("");
  }

  function goPage(direction) {
    setPageIndex((current) => {
      const next = current + direction;
      if (next < 0 || next >= PAGES.length) return current;
      return next;
    });
  }

  return (
    <section className="admin-module-stack">
      <div className="admin-white-panel admin-texts-panel">
        <div className="admin-section-heading">
          <div>
            <h3>Text management</h3>
            <p>Edit the form texts step by step. Changes apply to the live form.</p>
          </div>
          <div className="admin-preview-controls">
            <div className="admin-texts-lang-toggle">
              <button
                className={language === "he" ? "is-active" : ""}
                type="button"
                onClick={() => setLanguage("he")}
              >
                עב Hebrew
              </button>
              <button
                className={language === "en" ? "is-active" : ""}
                type="button"
                onClick={() => setLanguage("en")}
              >
                EN English
              </button>
            </div>
            {canEdit ? null : <span className="admin-readonly-pill">Viewer mode</span>}
          </div>
        </div>

        {message ? <p className="admin-inline-message">{message}</p> : null}

        <div className="admin-texts-nav">
          <button
            className="admin-texts-arrow"
            disabled={pageIndex === 0}
            type="button"
            onClick={() => goPage(-1)}
          >
            ‹
          </button>
          <div className="admin-texts-page-info">
            <strong>{page.label}</strong>
            <span>{pageIndex + 1} / {PAGES.length}</span>
          </div>
          <button
            className="admin-texts-arrow"
            disabled={pageIndex === PAGES.length - 1}
            type="button"
            onClick={() => goPage(1)}
          >
            ›
          </button>
        </div>

        {loading ? <p className="admin-muted-light">Loading texts...</p> : null}

        {!loading ? (
          <div className="admin-texts-fields" dir={language === "he" ? "rtl" : "ltr"}>
            {page.keys.map((key) => {
              const text = textsByKey[key];
              if (!text) return null;

              const isTitle = key.endsWith(".title");
              const isNote = key.endsWith(".note");
              const isLong = key.startsWith("whatsapp.hello") ||
                key.startsWith("otherStyleNeedsReference") ||
                key.endsWith(".placeholder") ||
                key.endsWith("note");

              return (
                <div
                  className={`admin-texts-field ${isTitle ? "admin-texts-field--title" : ""}`}
                  key={key}
                >
                  <div className="admin-texts-field-header">
                    <span className="admin-texts-field-label">{friendlyLabel(key)}</span>
                    {isNote ? <span className="admin-texts-field-badge">Subtitle</span> : null}
                    {isTitle ? <span className="admin-texts-field-badge">Title</span> : null}
                  </div>
                  {isLong ? (
                    <textarea
                      className="admin-texts-input"
                      dir={language === "he" ? "rtl" : "ltr"}
                      disabled={!canEdit}
                      rows={2}
                      value={getDraft(key)}
                      onChange={(event) => setDraft(key, event.target.value)}
                    />
                  ) : (
                    <input
                      className="admin-texts-input"
                      dir={language === "he" ? "rtl" : "ltr"}
                      disabled={!canEdit}
                      value={getDraft(key)}
                      onChange={(event) => setDraft(key, event.target.value)}
                    />
                  )}
                  {canEdit && isDirty(key) ? (
                    <button
                      className="admin-texts-save"
                      disabled={savingKey === key}
                      type="button"
                      onClick={() => saveText(key)}
                    >
                      {savingKey === key ? "..." : "Save"}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
