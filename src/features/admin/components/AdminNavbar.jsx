const navItems = [
  { id: "dashboard", label: "Dashboard" },
  { id: "requests", label: "Requests" },
  { id: "styles", label: "Styles" },
  { id: "body", label: "Body photos" },
  { id: "texts", label: "Texts" },
  { id: "users", label: "Users" },
  { id: "settings", label: "Settings" },
];

export function AdminNavbar({ activeModule, onModuleChange }) {
  return (
    <nav className="admin-navbar" aria-label="Admin modules">
      {navItems.map((item) => (
        <button
          className={activeModule === item.id ? "is-active" : ""}
          key={item.id}
          type="button"
          onClick={() => onModuleChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
