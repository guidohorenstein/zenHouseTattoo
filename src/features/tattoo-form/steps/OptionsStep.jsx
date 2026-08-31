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
  morePreviewOption,
}) {
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const hasMoreOptions = moreOptions.length > 0;
  const shouldMergeStyleOptions = variant === "styles" && showMoreOptions;
  const visibleOptions = shouldMergeStyleOptions ? [...options, ...moreOptions] : options;

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

  function renderOptions(optionList, extraClassName = "", extraNode = null) {
    const gridHasImages = optionList.some((option) => option.imageUrl);
    const optionCount = optionList.length + (extraNode ? 1 : 0);

    return (
      <div
        className={`options-grid ${gridHasImages ? "options-grid--visual" : ""} ${
          variant ? `options-grid--${variant}` : ""
        } options-grid--count-${optionCount} ${extraClassName}`}
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
        {extraNode}
      </div>
    );
  }

  function renderMoreStylesButton() {
    const previewOption = morePreviewOption;

    if (variant !== "styles" || !previewOption?.imageUrl) {
      return (
        <button
          className="more-styles-toggle"
          type="button"
          aria-expanded={false}
          onClick={() => setShowMoreOptions(true)}
        >
          {moreLabel}
          <span aria-hidden="true">+</span>
        </button>
      );
    }

    return (
      <button
        className="option-card option-card--visual option-card--more-styles"
        type="button"
        aria-expanded={false}
        onClick={() => setShowMoreOptions(true)}
      >
        <span className="option-card__media">
          <img
            src={previewOption.imageUrl}
            alt=""
            draggable="false"
            decoding="async"
            fetchPriority="high"
            loading="eager"
          />
          <span className="more-style-overlay" aria-hidden="true">+</span>
        </span>
        <span className="option-card__label">{moreLabel}</span>
      </button>
    );
  }

  return (
    <div className="step">
      <h1>{title}</h1>
      {note ? <p>{note}</p> : null}

      {renderOptions(
        visibleOptions,
        "",
        hasMoreOptions && !showMoreOptions ? renderMoreStylesButton() : null,
      )}

      {hasMoreOptions && showMoreOptions ? (
        <div className="more-styles">
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
