import { hasSupabaseConfig, supabase } from "../../../lib/supabaseClient";

export const inquiryStatuses = [
  "requested",
  "no_response",
  "quoted",
  "booked",
  "completed",
  "cancelled",
];

const inquiryListSelect = [
  "id",
  "full_name",
  "email",
  "phone",
  "status",
  "color_mode",
  "timing",
  "contact_times",
  "general_zone",
  "specific_zone",
  "styles",
  "created_at",
  "archived_at",
].join(", ");

export async function listInquiries({ includeArchived = false } = {}) {
  if (!hasSupabaseConfig) return { inquiries: [], error: "Supabase is not configured yet." };

  let query = supabase
    .from("inquiries")
    .select(inquiryListSelect)
    .order("created_at", { ascending: false })
    .limit(100);

  if (!includeArchived) {
    query = query.is("archived_at", null);
  }

  const { data, error } = await query;

  return { inquiries: data || [], error: error?.message || null };
}

export async function getInquiryDetail(inquiryId) {
  if (!hasSupabaseConfig) {
    return { inquiry: null, notes: [], statusEvents: [], images: [], error: "Supabase is not configured yet." };
  }

  const [inquiryResult, notesResult, statusEventsResult, imagesResult] = await Promise.all([
    supabase.from("inquiries").select("*").eq("id", inquiryId).single(),
    supabase
      .from("inquiry_notes")
      .select("id, note, created_at")
      .eq("inquiry_id", inquiryId)
      .order("created_at", { ascending: false }),
    supabase
      .from("inquiry_status_events")
      .select("id, from_status, to_status, created_at")
      .eq("inquiry_id", inquiryId)
      .order("created_at", { ascending: false }),
    supabase
      .from("inquiry_reference_images")
      .select("id, storage_path, public_url, original_name, created_at")
      .eq("inquiry_id", inquiryId)
      .order("created_at", { ascending: false }),
  ]);

  const images = await withSignedImageUrls(imagesResult.data || []);
  const inquiry = inquiryResult.data
    ? await withSignedPlacementImageUrl(inquiryResult.data)
    : null;

  const error =
    inquiryResult.error?.message ||
    notesResult.error?.message ||
    statusEventsResult.error?.message ||
    imagesResult.error?.message ||
    null;

  return {
    inquiry,
    notes: notesResult.data || [],
    statusEvents: statusEventsResult.data || [],
    images,
    error,
  };
}

export async function updateInquiryStatus(inquiry, nextStatus, adminId) {
  if (!hasSupabaseConfig) return { error: "Supabase is not configured yet." };
  if (!inquiry || inquiry.status === nextStatus) return { error: null };

  const { error: updateError } = await supabase
    .from("inquiries")
    .update({ status: nextStatus })
    .eq("id", inquiry.id);

  if (updateError) return { error: updateError.message };

  const { error: eventError } = await supabase.from("inquiry_status_events").insert({
    inquiry_id: inquiry.id,
    admin_id: adminId,
    from_status: inquiry.status,
    to_status: nextStatus,
  });

  return { error: eventError?.message || null };
}

export async function discardInquiry(inquiry, adminId) {
  return updateInquiryStatus(inquiry, "cancelled", adminId);
}

export async function archiveInquiry(inquiryId) {
  if (!hasSupabaseConfig) return { error: "Supabase is not configured yet." };

  const { error } = await supabase
    .from("inquiries")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", inquiryId);

  return { error: error?.message || null };
}

export async function restoreInquiry(inquiryId) {
  if (!hasSupabaseConfig) return { error: "Supabase is not configured yet." };

  const { error } = await supabase
    .from("inquiries")
    .update({ archived_at: null })
    .eq("id", inquiryId);

  return { error: error?.message || null };
}

export async function deleteInquiry(inquiryId) {
  if (!hasSupabaseConfig) return { error: "Supabase is not configured yet." };

  const { error } = await supabase.from("inquiries").delete().eq("id", inquiryId);
  return { error: error?.message || null };
}

export async function addInquiryNote(inquiryId, adminId, note) {
  if (!hasSupabaseConfig) return { note: null, error: "Supabase is not configured yet." };

  const cleanNote = note.trim();
  if (!cleanNote) return { note: null, error: "Write a note first." };

  const { data, error } = await supabase
    .from("inquiry_notes")
    .insert({ inquiry_id: inquiryId, admin_id: adminId, note: cleanNote })
    .select("id, note, created_at")
    .single();

  return { note: data || null, error: error?.message || null };
}

export async function listDashboardMetrics() {
  if (!hasSupabaseConfig) {
    return { metrics: null, error: "Supabase is not configured yet." };
  }

  const { data, error } = await supabase
    .from("inquiries")
    .select(
      "status, styles, general_zone, specific_zone, timing, contact_times, color_mode, body_reference, has_tattoos, created_at",
    )
    .is("archived_at", null);

  if (error) return { metrics: null, error: error.message };

  const total = data.length;
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const byStatus = data.reduce((acc, inquiry) => {
    acc[inquiry.status] = (acc[inquiry.status] || 0) + 1;
    return acc;
  }, {});

  const styles = data.flatMap((inquiry) => inquiry.styles || []);
  const timings = data.map((inquiry) => inquiry.timing).filter(Boolean);
  const contactTimes = data.flatMap((inquiry) => inquiry.contact_times || []);
  const colors = data.map((inquiry) => inquiry.color_mode).filter(Boolean);
  const bodies = data.map((inquiry) => inquiry.body_reference).filter(Boolean);
  const tattooHistory = data.map((inquiry) => inquiry.has_tattoos).filter(Boolean);
  const recentInquiries = data.filter(
    (inquiry) => new Date(inquiry.created_at).getTime() >= sevenDaysAgo,
  );
  const last30Days = data.filter(
    (inquiry) => new Date(inquiry.created_at).getTime() >= thirtyDaysAgo,
  );
  const topStyle = getMostCommon(styles);
  const topZone = getMostCommon(data.map((inquiry) => inquiry.general_zone).filter(Boolean));
  const topTiming = getMostCommon(timings);
  const topContactTime = getMostCommon(contactTimes);
  const completed = byStatus.completed || 0;
  const quoted = byStatus.quoted || 0;
  const booked = byStatus.booked || 0;
  const requested = byStatus.requested || 0;
  const noResponse = byStatus.no_response || 0;
  const cancelled = byStatus.cancelled || 0;
  const activePipeline = requested + noResponse + quoted + booked;
  const quoteRate = total ? Math.round(((quoted + booked + completed) / total) * 100) : 0;
  const bookingRate = total ? Math.round(((booked + completed) / total) * 100) : 0;
  const responseRisk = total ? Math.round((noResponse / total) * 100) : 0;

  return {
    metrics: {
      total,
      requested,
      noResponse,
      quoted,
      booked,
      completed,
      cancelled,
      activePipeline,
      recentCount: recentInquiries.length,
      last30Count: last30Days.length,
      averageWeeklyDemand: Math.round((last30Days.length / 30) * 7),
      conversionRate: total ? Math.round((completed / total) * 100) : 0,
      quoteRate,
      bookingRate,
      responseRisk,
      topStyle,
      topZone,
      topTiming,
      topContactTime,
      statusBreakdown: toBreakdown(byStatus),
      dailyTrend: getDailyTrend(data, 14),
      topStyles: getTopCounts(styles, 5),
      topZones: getTopCounts(data.map((inquiry) => inquiry.general_zone).filter(Boolean), 5),
      topSpecificZones: getTopCounts(
        data.map((inquiry) => inquiry.specific_zone).filter(Boolean),
        5,
      ),
      timingBreakdown: getTopCounts(timings, 4),
      contactBreakdown: getTopCounts(contactTimes, 3),
      colorBreakdown: getTopCounts(colors, 2),
      bodyBreakdown: getTopCounts(bodies, 2),
      tattooHistoryBreakdown: getTopCounts(tattooHistory, 2),
    },
    error: null,
  };
}

async function withSignedPlacementImageUrl(inquiry) {
  if (!inquiry.placement_marked_image_path) return inquiry;

  const { data } = await supabase.storage
    .from("inquiry-references")
    .createSignedUrl(inquiry.placement_marked_image_path, 60 * 60);

  return {
    ...inquiry,
    placementMarkedImageUrl: data?.signedUrl || "",
  };
}
async function withSignedImageUrls(images) {
  return Promise.all(
    images.map(async (image) => {
      if (image.public_url) return { ...image, previewUrl: image.public_url };
      if (!image.storage_path) return { ...image, previewUrl: "" };

      const { data } = await supabase.storage
        .from("inquiry-references")
        .createSignedUrl(image.storage_path, 60 * 60);

      return { ...image, previewUrl: data?.signedUrl || "" };
    }),
  );
}

function getMostCommon(values) {
  if (values.length === 0) return "-";

  const counts = values.reduce((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function getTopCounts(values, limit = 5) {
  if (values.length === 0) return [];

  const counts = values.reduce((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    .slice(0, limit);
}

function toBreakdown(byStatus) {
  return inquiryStatuses.map((status) => ({
    value: status,
    count: byStatus[status] || 0,
  }));
}

function getDailyTrend(inquiries, days) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - 1 - index));
    const start = date.getTime();
    const end = start + 24 * 60 * 60 * 1000;

    return {
      label: formatter.format(date),
      count: inquiries.filter((inquiry) => {
        const createdAt = new Date(inquiry.created_at).getTime();
        return createdAt >= start && createdAt < end;
      }).length,
    };
  });
}


