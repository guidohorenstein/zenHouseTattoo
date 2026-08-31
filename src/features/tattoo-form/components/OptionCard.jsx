import { CroppedImage } from "../../../components/CroppedImage";

export function OptionCard({ cropData, label, selected, onClick, imageUrl }) {
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
        <CroppedImage
          className="option-card__media"
          cropData={cropData}
          fetchPriority="high"
          imageUrl={imageUrl}
          loading="eager"
        />
      ) : null}
      <span className="option-card__label">{label}</span>
    </button>
  );
}
