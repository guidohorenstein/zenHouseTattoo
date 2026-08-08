/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from "react";
import { hasSupabaseConfig } from "../../lib/supabaseClient";
import { AdminShell } from "./components/AdminShell";
import { getCurrentAdminSession, signInAdmin, signOutAdmin } from "./services/adminAuth";
import {
  addInquiryNote,
  deleteInquiry,
  discardInquiry,
  getInquiryDetail,
  listDashboardMetrics,
  listInquiries,
  updateInquiryStatus,
} from "./services/inquiriesApi";
import { DashboardModule } from "./modules/DashboardModule";
import { BodyPhotosModule } from "./modules/BodyPhotosModule";
import { PlaceholderModule } from "./modules/PlaceholderModule";
import { RequestsModule } from "./modules/RequestsModule";
import { StylesModule } from "./modules/StylesModule";
import { UsersModule } from "./modules/UsersModule";

export function AdminPage() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeModule, setActiveModule] = useState("dashboard");
  const [activeFilter, setActiveFilter] = useState(null);
  const [error, setError] = useState("");
  const [metrics, setMetrics] = useState(null);
  const [inquiries, setInquiries] = useState([]);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [noteText, setNoteText] = useState("");

  const loadInquiryDetail = useCallback(async (inquiryId) => {
    setDetailLoading(true);
    const result = await getInquiryDetail(inquiryId);
    setSelectedDetail(result);
    setError(result.error || "");
    setDetailLoading(false);
  }, []);

  const loadAdminData = useCallback(async () => {
    setIsRefreshing(true);
    const [metricsResult, inquiriesResult] = await Promise.all([
      listDashboardMetrics(),
      listInquiries(),
    ]);

    setMetrics(metricsResult.metrics);
    setInquiries(inquiriesResult.inquiries);
    setError(metricsResult.error || inquiriesResult.error || "");
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    async function loadSession() {
      const result = await getCurrentAdminSession();
      setSession(result.session);
      setError(result.error || "");
      setLoading(false);
    }

    loadSession();
  }, []);

  useEffect(() => {
    if (!session) return;
    loadAdminData();
  }, [loadAdminData, session]);

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const result = await signInAdmin(email, password);
    setSession(result.session);
    setError(result.error || "");
    setLoading(false);
  }

  async function handleLogout() {
    await signOutAdmin();
    setSession(null);
  }

  function handleDrillDown(filter) {
    setActiveFilter(filter);
    setActiveModule("requests");
  }

  function handleDrillUp() {
    setActiveFilter(null);
  }

  async function handleStatusChange(inquiry, nextStatus) {
    const result = await updateInquiryStatus(inquiry, nextStatus, session.user.id);

    if (result.error) {
      setError(result.error);
      return;
    }

    await Promise.all([loadAdminData(), loadInquiryDetail(inquiry.id)]);
  }

  async function handleDiscard(inquiry) {
    const result = await discardInquiry(inquiry, session.user.id);

    if (result.error) {
      setError(result.error);
      return;
    }

    await Promise.all([loadAdminData(), loadInquiryDetail(inquiry.id)]);
  }

  async function handleDelete(inquiry) {
    const confirmed = window.confirm(`Delete request from ${inquiry.full_name}? This cannot be undone.`);
    if (!confirmed) return;

    const result = await deleteInquiry(inquiry.id);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSelectedDetail(null);
    await loadAdminData();
  }

  async function handleAddNote(event, inquiryId) {
    event.preventDefault();

    const result = await addInquiryNote(inquiryId, session.user.id, noteText);

    if (result.error) {
      setError(result.error);
      return;
    }

    setNoteText("");
    await loadInquiryDetail(inquiryId);
  }

  if (loading) {
    return <main className="admin-page admin-page--login"><p className="admin-muted">Loading...</p></main>;
  }

  if (!session) {
    return (
      <main className="admin-page admin-page--login">
        <section className="admin-login-card">
          <p className="admin-kicker">Zen House Tattoo</p>
          <h1>Admin panel</h1>
          {!hasSupabaseConfig ? (
            <p className="admin-alert">Add Supabase keys in `.env.local` to enable login.</p>
          ) : null}
          {error ? <p className="admin-alert">{error}</p> : null}

          <form className="admin-form" onSubmit={handleLogin}>
            <label>
              Email
              <input value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <button className="primary-button" type="submit">Login</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <AdminShell
      activeModule={activeModule}
      error={error}
      isRefreshing={isRefreshing}
      onLogout={handleLogout}
      onModuleChange={setActiveModule}
      onRefresh={loadAdminData}
      userEmail={session.user.email}
    >
      {activeModule === "dashboard" ? (
        <DashboardModule
          activeFilter={activeFilter}
          metrics={metrics}
          onDrillDown={handleDrillDown}
          onDrillUp={handleDrillUp}
        />
      ) : null}

      {activeModule === "requests" ? (
        <RequestsModule
          activeFilter={activeFilter}
          detailLoading={detailLoading}
          inquiries={inquiries}
          noteText={noteText}
          onAddNote={handleAddNote}
          onDelete={handleDelete}
          onDiscard={handleDiscard}
          onDrillUp={handleDrillUp}
          onNoteTextChange={setNoteText}
          onRequestDetail={loadInquiryDetail}
          onStatusChange={handleStatusChange}
          selectedDetail={selectedDetail}
        />
      ) : null}

      {activeModule === "styles" ? (
        <StylesModule />
      ) : null}

      {activeModule === "body" ? (
        <BodyPhotosModule />
      ) : null}

      {activeModule === "users" ? (
        <UsersModule currentUserEmail={session.user.email} />
      ) : null}

      {activeModule === "settings" ? (
        <PlaceholderModule title="Settings" text="Soon: WhatsApp/Twilio, domain, admin preferences and form behavior." />
      ) : null}
    </AdminShell>
  );
}
