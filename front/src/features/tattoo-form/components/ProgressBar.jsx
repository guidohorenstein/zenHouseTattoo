export function ProgressBar({ currentStep, totalSteps, label, ofLabel }) {
  const percent = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="progress">
      {label} {currentStep + 1} {ofLabel} {totalSteps}
      <div className="progress-bar">
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
