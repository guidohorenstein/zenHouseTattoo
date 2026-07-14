export function TextInputStep({
  title,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
}) {
  return (
    <div className="step">
      <h1>{title}</h1>
      <input
        className="text-input"
        type={type}
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
