import { useState } from "react";

export function ContactStep({
  title,
  note,
  fullName,
  email,
  phone,
  placeholders,
  terms,
  acceptedTerms,
  onFullNameChange,
  onEmailChange,
  onPhoneChange,
  onAcceptedTermsChange,
}) {
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  return (
    <div className="step">
      <h1>{title}</h1>
      {note ? <p>{note}</p> : null}

      <div className="contact-fields">
        <input
          className="text-input contact-input"
          type="text"
          value={fullName}
          placeholder={placeholders.fullName}
          autoComplete="name"
          onChange={(event) => onFullNameChange(event.target.value)}
        />

        <input
          className="text-input contact-input"
          type="email"
          value={email}
          placeholder={placeholders.email}
          autoComplete="email"
          onChange={(event) => onEmailChange(event.target.value)}
        />

        <input
          className="text-input contact-input"
          type="tel"
          inputMode="tel"
          value={phone}
          placeholder={placeholders.phone}
          autoComplete="tel"
          onChange={(event) => onPhoneChange(event.target.value)}
        />
      </div>

      <div className="terms-consent">
        <label className="terms-checkbox">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(event) => onAcceptedTermsChange(event.target.checked)}
          />
          <span className="terms-checkbox-box" aria-hidden="true" />
          <span>{terms.checkbox} <strong aria-hidden="true">*</strong></span>
        </label>
        <button className="terms-link-button" type="button" onClick={() => setIsTermsOpen(true)}>
          {terms.open}
        </button>
      </div>

      {isTermsOpen ? (
        <div className="terms-modal" role="dialog" aria-modal="true" aria-labelledby="terms-title">
          <div className="terms-modal-backdrop" onClick={() => setIsTermsOpen(false)} />
          <section className="terms-modal-card">
            <div className="terms-modal-header">
              <h2 id="terms-title">{terms.title}</h2>
              <button type="button" onClick={() => setIsTermsOpen(false)}>
                {terms.close}
              </button>
            </div>
            <div className="terms-modal-body">
              {terms.body.split("\n").map((line, index) => (
                <p key={`${line.slice(0, 12)}-${index}`}>{line || "\u00A0"}</p>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
