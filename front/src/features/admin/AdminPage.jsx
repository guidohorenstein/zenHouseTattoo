import { useEffect, useState } from "react";
import { hasSupabaseConfig } from "../../lib/supabaseClient";
import { getCurrentAdminSession, signInAdmin, signOutAdmin } from "./services/adminAuth";
import { listDashboardMetrics, listInquiries } from "./services/inquiriesApi";

const statusLabels = {
  requested: "Requested",
  no_response: "No response",
  quoted: "Quoted",
  booked: "Booked",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function AdminPage() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [metrics, setMetrics] = useState(null);
  const [inquiries, setInquiries] = useState([]);

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

    async function loadAdminData() {
      const [metricsResult, inquiriesResult] = await Promise.all([
        listDashboardMetrics(),
        listInquiries(),
      ]);

      setMetrics(metricsResult.metrics);
      setInquiries(inquiriesResult.inquiries);
      setError(metricsResult.error || inquiriesResult.error || "");
    }

    loadAdminData();
  }, [session]);

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

  if (loading) {
    return <main className="admin-page"><p className="admin-muted">Loading...</p></main>;
  }

  if (!session) {
    return (
      <main className="admin-page">
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
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="admin-kicker">Zen House Tattoo</p>
          <h1>Admin panel</h1>
          <p className="admin-muted">Logged in as {session.user.email}</p>
        </div>
        <button className="secondary-button" type="button" onClick={handleLogout}>Logout</button>
      </header>

      {error ? <p className="admin-alert">{error}</p> : null}

      <section className="admin-grid admin-grid--metrics">
        <AdminMetric label="Total" value={metrics?.total ?? 0} />
        <AdminMetric label="Requested" value={metrics?.requested ?? 0} />
        <AdminMetric label="Quoted" value={metrics?.quoted ?? 0} />
        <AdminMetric label="Booked" value={metrics?.booked ?? 0} />
        <AdminMetric label="Completed" value={metrics?.completed ?? 0} />
        <AdminMetric label="Conversion" value={`${metrics?.conversionRate ?? 0}%`} />
      </section>

      <section className="admin-panel">
        <div className="admin-panel-title">
          <h2>Latest inquiries</h2>
          <span>{inquiries.length} shown</span>
        </div>

        <div className="admin-table">
          {inquiries.length === 0 ? (
            <p className="admin-muted">No inquiries yet.</p>
          ) : (
            inquiries.map((inquiry) => (
              <article className="admin-row" key={inquiry.id}>
                <div>
                  <strong>{inquiry.full_name}</strong>
                  <span>{inquiry.email}</span>
                </div>
                <div>
                  <span>{inquiry.phone}</span>
                  <span>{new Date(inquiry.created_at).toLocaleDateString()}</span>
                </div>
                <span className="admin-status">{statusLabels[inquiry.status] || inquiry.status}</span>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="admin-grid">
        <AdminPlaceholder title="Styles" text="Create, edit, reorder and choose Main or More styles." />
        <AdminPlaceholder title="Body references" text="Manage categories, views, titles, crops and images." />
        <AdminPlaceholder title="Media" text="Upload, crop and organize studio visual assets." />
        <AdminPlaceholder title="Settings" text="Domain, WhatsApp/Twilio and form behavior will live here." />
      </section>
    </main>
  );
}

function AdminMetric({ label, value }) {
  return (
    <article className="admin-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function AdminPlaceholder({ title, text }) {
  return (
    <article className="admin-panel admin-placeholder">
      <h2>{title}</h2>
      <p>{text}</p>
    </article>
  );
}
