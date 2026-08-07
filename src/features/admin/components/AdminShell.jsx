import { AdminNavbar } from "./AdminNavbar";

export function AdminShell({
  activeModule,
  children,
  error,
  isRefreshing,
  onModuleChange,
  onRefresh,
  onLogout,
  userEmail,
}) {
  return (
    <main className="admin-app">
      <aside className="admin-sidebar">
        <div>
          <p className="admin-kicker">Zen House Tattoo</p>
          <h1>Admin</h1>
          <p className="admin-muted">{userEmail}</p>
        </div>
        <AdminNavbar activeModule={activeModule} onModuleChange={onModuleChange} />
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="admin-kicker">Control panel</p>
            <h2>{getModuleTitle(activeModule)}</h2>
          </div>
          <div className="admin-header-actions">
            <button className="secondary-button" type="button" onClick={onRefresh}>
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button className="secondary-button" type="button" onClick={onLogout}>Logout</button>
          </div>
        </header>

        {error ? <p className="admin-alert admin-alert--light">{error}</p> : null}
        {children}
      </section>
    </main>
  );
}

function getModuleTitle(moduleId) {
  const titles = {
    dashboard: "Dashboard",
    requests: "Requests",
    styles: "Styles",
    body: "Body photos",
    settings: "Settings",
  };

  return titles[moduleId] || "Admin";
}
