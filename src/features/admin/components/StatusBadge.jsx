import { statusDescriptions, statusLabels } from "../utils/adminFormat";

export function StatusBadge({ status, as = "span", className = "" }) {
  const Component = as;

  return (
    <Component
      className={`admin-status admin-status--${status || "unknown"} ${className}`}
      title={statusDescriptions[status] || "Custom status"}
    >
      {statusLabels[status] || status || "Unknown"}
    </Component>
  );
}
