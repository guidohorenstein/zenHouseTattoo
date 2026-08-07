export function MetricCard({ label, value, hint, active = false, onClick }) {
  const Component = onClick ? "button" : "article";

  return (
    <Component
      className={`admin-metric ${active ? "is-active" : ""}`}
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={hint}
    >
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </Component>
  );
}
