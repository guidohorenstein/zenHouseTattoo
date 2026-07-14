import { OptionCard } from "../components/OptionCard";

export function OptionsStep({ title, note, options, value, onChange, multiple = false }) {
  const hasImages = options.some((option) => option.imageUrl);

  function handleClick(optionId) {
    if (!multiple) {
      onChange(optionId);
      return;
    }

    if (value.includes(optionId)) {
      onChange(value.filter((item) => item !== optionId));
      return;
    }

    onChange([...value, optionId]);
  }

  return (
    <div className="step">
      <h1>{title}</h1>
      {note ? <p>{note}</p> : null}

      <div className={`options-grid ${hasImages ? "options-grid--visual" : ""}`}>
        {options.map((option) => (
          <OptionCard
            key={option.id}
            label={option.label}
            imageUrl={option.imageUrl}
            selected={multiple ? value.includes(option.id) : value === option.id}
            onClick={() => handleClick(option.id)}
          />
        ))}
      </div>
    </div>
  );
}
