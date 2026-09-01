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
      {canGoBack ? (
        <button
          className="secondary-button"
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
        >
          {backLabel}
        </button>
      ) : null}

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
