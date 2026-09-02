import { useEffect, useState } from "react";
import {
  defaultLeadNotificationSettings,
  defaultFormSettings,
  getLeadNotificationSettings,
  getFormSettings,
  saveLeadNotificationSettings,
  saveFormSettings,
} from "../services/settingsApi";

export function SettingsModule({ canEdit = true }) {
  const [draft, setDraft] = useState(defaultFormSettings);
  const [notificationDraft, setNotificationDraft] = useState(
    defaultLeadNotificationSettings,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    const [formResult, notificationResult] = await Promise.all([
      getFormSettings(),
      getLeadNotificationSettings(),
    ]);
    setDraft(formResult.settings);
    setNotificationDraft(notificationResult.settings);
    setMessage(formResult.error || notificationResult.error || "");
    setLoading(false);
  }

  function updateDraft(field, value) {
    setDraft((currentDraft) => ({ ...currentDraft, [field]: value }));
  }

  function updateNotificationDraft(field, value) {
    setNotificationDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
  }

  function updateRecipient(index, value) {
    setNotificationDraft((currentDraft) => ({
      ...currentDraft,
      recipients: currentDraft.recipients.map((recipient, recipientIndex) =>
        recipientIndex === index ? value : recipient,
      ),
    }));
  }

  function addRecipient() {
    setNotificationDraft((currentDraft) => ({
      ...currentDraft,
      recipients: [...currentDraft.recipients, ""],
    }));
  }

  function deleteRecipient(index) {
    setNotificationDraft((currentDraft) => ({
      ...currentDraft,
      recipients: currentDraft.recipients.filter((_, recipientIndex) => recipientIndex !== index),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canEdit) return;

    setSaving(true);
    setMessage("");
    const [formResult, notificationResult] = await Promise.all([
      saveFormSettings(draft),
      saveLeadNotificationSettings(notificationDraft),
    ]);

    if (formResult.error || notificationResult.error) {
      setMessage(formResult.error || notificationResult.error);
    } else {
      setDraft(formResult.settings);
      setNotificationDraft(notificationResult.settings);
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

        <div className="admin-settings-notifications">
          <div className="admin-section-heading">
            <div>
              <h3>Lead notification emails</h3>
              <p>
                Send an email as soon as a partial lead is saved.
              </p>
            </div>
            <button
              className="admin-light-button"
              disabled={!canEdit}
              type="button"
              onClick={addRecipient}
            >
              Add email
            </button>
          </div>

          <div className="admin-form-grid admin-notification-grid">
            <label>
              Notifications
              <select
                disabled={!canEdit}
                value={notificationDraft.enabled ? "enabled" : "disabled"}
                onChange={(event) =>
                  updateNotificationDraft("enabled", event.target.value === "enabled")
                }
              >
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
            </label>
          </div>

          <div className="admin-notification-email-list">
            {notificationDraft.recipients.length === 0 ? (
              <p className="admin-muted-light">
                No notification emails yet. Add one to start receiving lead alerts.
              </p>
            ) : null}

            {notificationDraft.recipients.map((recipient, index) => (
              <div className="admin-notification-email-row" key={index}>
                <input
                  disabled={!canEdit}
                  placeholder="name@example.com"
                  type="email"
                  value={recipient}
                  onChange={(event) => updateRecipient(index, event.target.value)}
                />
                <button
                  className="admin-light-button"
                  disabled={!canEdit}
                  type="button"
                  onClick={() => deleteRecipient(index)}
                >
                  Delete email
                </button>
              </div>
            ))}
          </div>

          <div className="admin-settings-note">
            <strong>Delivery guardrails</strong>
            <p>
              Emails are sent from the backend as soon as contact details create a partial lead. Duplicate saves for the same lead do not send another email.
            </p>
          </div>
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
