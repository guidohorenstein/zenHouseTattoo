export function FormNavigation({
  backLabel,
  nextLabel,
  quoteLabel,
  submittingLabel = quoteLabel,
  canGoBack,
  canGoNext,
  isLastStep,
  isSubmitting = false,
  hideNext = false,
  onBack,
  onNext,
  onSubmit,
  onInvalid,
}) {
  const primaryDisabled = !canGoNext || isSubmitting;

  function handlePrimaryClick() {
    if (isSubmitting) return;

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
        disabled={!canGoBack || isSubmitting}
      >
        {backLabel}
      </button>

      {hideNext && !isLastStep ? null : (
        <button
          className={`primary-button ${isLastStep ? "success" : ""} ${
            primaryDisabled ? "is-disabled" : ""
          }`}
          type="button"
          onClick={handlePrimaryClick}
          disabled={isSubmitting}
          aria-disabled={primaryDisabled}
        >
          {isLastStep && isSubmitting ? submittingLabel : isLastStep ? quoteLabel : nextLabel}
        </button>
      )}
    </div>
  );
}
