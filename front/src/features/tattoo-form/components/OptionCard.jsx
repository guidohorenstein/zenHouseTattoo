export function OptionCard({ label, selected, onClick, imageUrl }) {
  return (
    <button
      className={`option-card ${imageUrl ? "option-card--visual" : ""} ${
        selected ? "selected" : ""
      }`}
      type="button"
      aria-pressed={selected}
      onClick={onClick}
    >
      {imageUrl ? (
        <span className="option-card__media">
          <img src={imageUrl} alt="" />
        </span>
      ) : null}
      <span className="option-card__label">{label}</span>
    </button>
  );
}
