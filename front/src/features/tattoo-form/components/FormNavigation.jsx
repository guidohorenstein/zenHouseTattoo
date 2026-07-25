export function FormNavigation({
  backLabel,
  nextLabel,
  quoteLabel,
  canGoBack,
  canGoNext,
  isLastStep,
  onBack,
  onNext,
  onSubmit,
  onInvalid,
}) {
  function handlePrimaryClick() {
    if (!canGoNext) {
      onInvalid();
      return;
    }

    if (isLastStep) {
      onSubmit();
      return;
    }

    onNext();
  }

  return (
    <div className="navigation">
      <button
        className="secondary-button"
        type="button"
        onClick={onBack}
        disabled={!canGoBack}
      >
        {backLabel}
      </button>

      <button
        className={`primary-button ${isLastStep ? "success" : ""} ${
          !canGoNext ? "is-disabled" : ""
        }`}
        type="button"
        onClick={handlePrimaryClick}
        aria-disabled={!canGoNext}
      >
        {isLastStep ? quoteLabel : nextLabel}
      </button>
    </div>
  );
}
