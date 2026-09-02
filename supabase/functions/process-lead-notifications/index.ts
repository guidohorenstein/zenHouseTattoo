import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAX_LEADS_PER_RUN = 25;
const DEFAULT_FROM = "Zen House Tattoo <notifications@zenhousetattoo.com>";

type LeadRecord = {
  id: string;
  source_language?: string;
  created_at: string;
  updated_at?: string;
};

type NotificationSettings = {
  enabled: boolean;
  recipients: string[];
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeEmails(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((email) => String(email || "").trim().toLowerCase())
        .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
    ),
  ).slice(0, 10);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jerusalem",
  }).format(new Date(value));
}

async function getSettings(
  supabase: ReturnType<typeof createClient>,
): Promise<NotificationSettings> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "lead_notifications")
    .maybeSingle();

  if (error) {
    console.warn("Could not read lead notification settings:", error);
  }

  const value = (data?.value || {}) as Record<string, unknown>;

  return {
    enabled: value.enabled !== false,
    recipients: normalizeEmails(value.recipients),
  };
}

function buildEmail(lead: LeadRecord, leadType: "complete" | "partial") {
  const siteUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://zenhousetattoo.com";
  const adminUrl = `${siteUrl.replace(/\/$/, "")}/admin`;
  const statusLabel = leadType === "complete" ? "Complete lead" : "Partial lead";
  const subject = `Zen House Tattoo - ${statusLabel} received`;
  const safeLeadId = lead.id.slice(0, 8);
  const rows = [
    ["Lead type", statusLabel],
    ["Lead ID", safeLeadId],
    ["Language", String(lead.source_language || "-").toUpperCase()],
    ["Created", formatDate(lead.created_at)],
    ["Last updated", formatDate(lead.updated_at || lead.created_at)],
  ]
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:9px 10px;border-bottom:1px solid #e8edf3;color:#667085;font-weight:700;">${escapeHtml(label)}</td>
          <td style="padding:9px 10px;border-bottom:1px solid #e8edf3;color:#101828;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f6f7f9;color:#101828;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;">
      ${escapeHtml(statusLabel)} received in Zen House Tattoo admin.
    </div>
    <main style="max-width:640px;margin:0 auto;padding:28px 16px;">
      <section style="background:#ffffff;border:1px solid #e4e8ef;border-radius:14px;overflow:hidden;">
        <header style="padding:22px 24px;background:#111827;color:#ffffff;">
          <p style="margin:0 0 8px;color:#d6a56f;font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">Zen House Tattoo</p>
          <h1 style="margin:0;font-size:24px;line-height:1.25;">${escapeHtml(statusLabel)} received</h1>
        </header>
        <div style="padding:22px 24px;">
          <p style="margin:0 0 18px;color:#475467;line-height:1.55;">
            A lead reached the notification delay. Open the admin panel to review contact details and tattoo information.
          </p>
          <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;border:1px solid #e8edf3;border-radius:10px;overflow:hidden;">
            ${rows}
          </table>
          <p style="margin:22px 0 0;">
            <a href="${escapeHtml(adminUrl)}" style="display:inline-block;padding:12px 16px;border-radius:8px;background:#111827;color:#ffffff;text-decoration:none;font-weight:700;">
              Open admin panel
            </a>
          </p>
        </div>
      </section>
    </main>
  </body>
</html>`;
  const text = [
    `Zen House Tattoo - ${statusLabel} received`,
    "",
    `Lead ID: ${safeLeadId}`,
    `Language: ${String(lead.source_language || "-").toUpperCase()}`,
    `Created: ${formatDate(lead.created_at)}`,
    `Last updated: ${formatDate(lead.updated_at || lead.created_at)}`,
    "",
    `Open admin panel: ${adminUrl}`,
  ].join("\n");

  return { html, subject, text };
}

async function sendLeadEmail(
  recipients: string[],
  lead: LeadRecord,
  leadType: "complete" | "partial",
) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) return "Missing RESEND_API_KEY.";

  const from = Deno.env.get("LEAD_NOTIFICATION_FROM") || DEFAULT_FROM;
  const { html, subject, text } = buildEmail(lead, leadType);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: recipients,
      subject,
      html,
      text,
      tags: [
        { name: "source", value: "zen_house_tattoo" },
        { name: "lead_type", value: leadType },
      ],
    }),
  });

  if (response.ok) return "";

  const data = await response.json().catch(() => ({}));
  return data.message || data.error || `Resend returned ${response.status}.`;
}

async function markNotificationResult(
  supabase: ReturnType<typeof createClient>,
  table: "inquiries" | "partial_inquiries",
  id: string,
  error: string,
) {
  const now = new Date().toISOString();
  const payload = error
    ? {
        notification_attempted_at: now,
        notification_error: error.slice(0, 500),
      }
    : {
        notification_attempted_at: now,
        notification_sent_at: now,
        notification_error: null,
      };

  await supabase.from(table).update(payload).eq("id", id);
}

async function processLeads(
  supabase: ReturnType<typeof createClient>,
  recipients: string[],
  table: "inquiries" | "partial_inquiries",
  leadType: "complete" | "partial",
) {
  let query = supabase
    .from(table)
    .select("id, source_language, created_at, updated_at")
    .is("notification_sent_at", null)
    .not("notification_due_at", "is", null)
    .lte("notification_due_at", new Date().toISOString())
    .order("notification_due_at", { ascending: true })
    .limit(MAX_LEADS_PER_RUN);

  if (table === "partial_inquiries") {
    query = query.eq("status", "partial").is("archived_at", null);
  } else {
    query = query.is("archived_at", null);
  }

  const { data, error } = await query;
  if (error) {
    console.error(`Could not list ${table} for notifications:`, error);
    return { failed: 0, sent: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const lead of (data || []) as LeadRecord[]) {
    const emailError = await sendLeadEmail(recipients, lead, leadType);
    await markNotificationResult(supabase, table, lead.id, emailError);

    if (emailError) {
      failed += 1;
      console.error(`Lead notification failed for ${table}/${lead.id}:`, emailError);
    } else {
      sent += 1;
    }
  }

  return { failed, sent };
}

Deno.serve(async (request) => {
  if (!["GET", "POST"].includes(request.method)) {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const expectedSecret = Deno.env.get("LEAD_NOTIFICATION_SECRET");
  if (!expectedSecret) {
    return jsonResponse({ error: "Lead notification secret is not configured." }, 500);
  }

  if (request.headers.get("x-lead-notification-secret") !== expectedSecret) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey =
    Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Server is not configured." }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const settings = await getSettings(supabase);

  if (!settings.enabled) {
    return jsonResponse({ skipped: "Lead notifications are disabled." });
  }

  if (settings.recipients.length === 0) {
    return jsonResponse({ skipped: "No lead notification recipients configured." });
  }

  const [complete, partial] = await Promise.all([
    processLeads(supabase, settings.recipients, "inquiries", "complete"),
    processLeads(supabase, settings.recipients, "partial_inquiries", "partial"),
  ]);

  return jsonResponse({ complete, partial });
});
