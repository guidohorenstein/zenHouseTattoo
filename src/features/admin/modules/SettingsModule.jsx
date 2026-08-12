import { useEffect, useState } from "react";
import {
  defaultFormSettings,
  getFormSettings,
  saveFormSettings,
} from "../services/settingsApi";

export function SettingsModule({ canEdit = true }) {
  const [draft, setDraft] = useState(defaultFormSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    const result = await getFormSettings();
    setDraft(result.settings);
    setMessage(result.error || "");
    setLoading(false);
  }

  function updateDraft(field, value) {
    setDraft((currentDraft) => ({ ...currentDraft, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canEdit) return;

    setSaving(true);
    setMessage("");
    const result = await saveFormSettings(draft);

    if (result.error) {
      setMessage(result.error);
    } else {
      setDraft(result.settings);
      setMessage("Settings saved.");
    }

    setSaving(false);
  }

  return (
    <section className="admin-module-stack">
      <form className="admin-white-panel admin-settings-panel" onSubmit={handleSubmit}>
        <div className="admin-section-heading">
          <div>
            <h3>Form settings</h3>
            <p>Control the public form behavior without changing code.</p>
          </div>
          <button className="admin-light-button" type="button" onClick={loadSettings}>
            {loading ? "Loading..." : "Reload"}
          </button>
        </div>

        {message ? <p className="admin-inline-message">{message}</p> : null}

        <div className="admin-form-grid">
          <label>
            WhatsApp destination
            <input
              disabled={!canEdit}
              inputMode="numeric"
              placeholder="Example: 972547505670"
              value={draft.whatsappPhone}
              onChange={(event) =>
                updateDraft("whatsappPhone", event.target.value.replace(/[^\d]/g, ""))
              }
            />
          </label>

          <label>
            Default language
            <select
              disabled={!canEdit}
              value={draft.defaultLanguage}
              onChange={(event) => updateDraft("defaultLanguage", event.target.value)}
            >
              <option value="he">Hebrew</option>
              <option value="en">English</option>
            </select>
          </label>

          <label>
            Public form
            <select
              disabled={!canEdit}
              value={draft.formEnabled ? "enabled" : "disabled"}
              onChange={(event) =>
                updateDraft("formEnabled", event.target.value === "enabled")
              }
            >
              <option value="enabled">Enabled</option>
              <option value="disabled">Paused</option>
            </select>
          </label>

          <label>
            Reference images limit
            <input
              disabled={!canEdit}
              max="4"
              min="1"
              type="number"
              value={draft.maxReferenceImages}
              onChange={(event) => updateDraft("maxReferenceImages", event.target.value)}
            />
          </label>

          <label>
            Placement marks limit
            <input
              disabled={!canEdit}
              max="3"
              min="1"
              type="number"
              value={draft.maxPlacementBoxes}
              onChange={(event) => updateDraft("maxPlacementBoxes", event.target.value)}
            />
          </label>
        </div>

        <div className="admin-settings-note">
          <strong>Production guardrails</strong>
          <p>
            Image and placement limits cannot exceed the backend safety limits:
            4 reference images and 3 placement marks.
          </p>
        </div>

        <div className="admin-settings-actions">
          <button className="admin-primary-light" disabled={!canEdit || saving} type="submit">
            {saving ? "Saving..." : "Save settings"}
          </button>
        </div>
      </form>
    </section>
  );
}
