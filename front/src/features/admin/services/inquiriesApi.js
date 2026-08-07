import { hasSupabaseConfig, supabase } from "../../../lib/supabaseClient";

export async function listInquiries() {
  if (!hasSupabaseConfig) return { inquiries: [], error: "Supabase is not configured yet." };

  const { data, error } = await supabase
    .from("inquiries")
    .select("id, full_name, email, phone, status, color_mode, timing, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return { inquiries: data || [], error: error?.message || null };
}

export async function listDashboardMetrics() {
  if (!hasSupabaseConfig) {
    return { metrics: null, error: "Supabase is not configured yet." };
  }

  const { data, error } = await supabase
    .from("inquiries")
    .select("status, styles, general_zone, created_at");

  if (error) return { metrics: null, error: error.message };

  const total = data.length;
  const byStatus = data.reduce((acc, inquiry) => {
    acc[inquiry.status] = (acc[inquiry.status] || 0) + 1;
    return acc;
  }, {});

  const requested = byStatus.requested || 0;
  const completed = byStatus.completed || 0;

  return {
    metrics: {
      total,
      requested,
      quoted: byStatus.quoted || 0,
      booked: byStatus.booked || 0,
      completed,
      cancelled: byStatus.cancelled || 0,
      conversionRate: total ? Math.round((completed / total) * 100) : 0,
    },
    error: null,
  };
}
