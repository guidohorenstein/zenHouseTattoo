import { lazy, Suspense, useEffect } from "react";
import { TattooFormPage } from "./features/tattoo-form/TattooFormPage";
import { initMetaPixel } from "./lib/metaPixel";
import "./App.css";

const AdminPage = lazy(() =>
  import("./features/admin/AdminPage").then((module) => ({
    default: module.AdminPage,
  })),
);

function App() {
  const isAdminRoute = window.location.pathname.startsWith("/admin");

  useEffect(() => {
    if (!isAdminRoute) {
      initMetaPixel();
    }
  }, [isAdminRoute]);

  if (isAdminRoute) {
    return (
      <Suspense fallback={<main className="admin-page"><p className="admin-muted">Loading...</p></main>}>
        <AdminPage />
      </Suspense>
    );
  }

  return <TattooFormPage />;
}

export default App;
