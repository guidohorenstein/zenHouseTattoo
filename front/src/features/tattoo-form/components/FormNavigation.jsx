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
}) {
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
        className={`primary-button ${isLastStep ? "success" : ""}`}
        type="button"
        onClick={isLastStep ? onSubmit : onNext}
        disabled={!canGoNext}
      >
        {isLastStep ? quoteLabel : nextLabel}
      </button>
    </div>
  );
}
