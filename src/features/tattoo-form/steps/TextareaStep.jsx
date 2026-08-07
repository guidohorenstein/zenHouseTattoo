export function TextareaStep({ title, value, onChange, placeholder }) {
  return (
    <div className="step">
      <h1>{title}</h1>
      <textarea
        className="textarea"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
