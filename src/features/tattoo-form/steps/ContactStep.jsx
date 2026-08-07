export function ContactStep({
  title,
  fullName,
  email,
  phone,
  placeholders,
  onFullNameChange,
  onEmailChange,
  onPhoneChange,
}) {
  return (
    <div className="step">
      <h1>{title}</h1>

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
    </div>
  );
}
