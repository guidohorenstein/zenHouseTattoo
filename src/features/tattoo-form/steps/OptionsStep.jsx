import { useState } from "react";
import { OptionCard } from "../components/OptionCard";

export function OptionsStep({
  title,
  note,
  options,
  value,
  onChange,
  multiple = false,
  variant = "",
  moreLabel = "",
  showLessLabel = "Show less",
  moreOptions = [],
}) {
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const hasMoreOptions = moreOptions.length > 0;

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

  function renderOptions(optionList, extraClassName = "") {
    const gridHasImages = optionList.some((option) => option.imageUrl);

    return (
      <div
        className={`options-grid ${gridHasImages ? "options-grid--visual" : ""} ${
          variant ? `options-grid--${variant}` : ""
        } options-grid--count-${optionList.length} ${extraClassName}`}
      >
        {optionList.map((option) => (
          <OptionCard
            key={option.id}
            cropData={option.cropData}
            label={option.label}
            imageUrl={option.imageUrl}
            selected={multiple ? value.includes(option.id) : value === option.id}
            onClick={() => handleClick(option.id)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="step">
      <h1>{title}</h1>
      {note ? <p>{note}</p> : null}

      {renderOptions(options)}

      {hasMoreOptions ? (
        <div className="more-styles">
          {!showMoreOptions ? (
            <button
              className="more-styles-toggle"
              type="button"
              aria-expanded={false}
              onClick={() => setShowMoreOptions(true)}
            >
              {moreLabel}
              <span aria-hidden="true">+</span>
            </button>
          ) : null}

          {showMoreOptions ? renderOptions(moreOptions, "options-grid--more") : null}

          {showMoreOptions ? (
            <button
              className="more-styles-toggle"
              type="button"
              aria-expanded={true}
              onClick={() => setShowMoreOptions(false)}
            >
              {showLessLabel}
              <span aria-hidden="true">-</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
