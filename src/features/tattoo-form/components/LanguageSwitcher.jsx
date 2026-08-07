import { languageOptions } from "../data/translations";

export function LanguageSwitcher({ language, onChange }) {
  return (
    <div className="language-switcher" aria-label="Language">
      {languageOptions.map((option) => (
        <button
          className={language === option.id ? "active" : ""}
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
