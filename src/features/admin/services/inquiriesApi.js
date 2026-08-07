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
].join(", ");

export async function listInquiries() {
  if (!hasSupabaseConfig) return { inquiries: [], error: "Supabase is not configured yet." };

  const { data, error } = await supabase
    .from("inquiries")
    .select(inquiryListSelect)
    .order("created_at", { ascending: false })
    .limit(100);

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
    .select("status, styles, general_zone, timing, contact_times, created_at");

  if (error) return { metrics: null, error: error.message };

  const total = data.length;
  const byStatus = data.reduce((acc, inquiry) => {
    acc[inquiry.status] = (acc[inquiry.status] || 0) + 1;
    return acc;
  }, {});

  const styles = data.flatMap((inquiry) => inquiry.styles || []);
  const timings = data.map((inquiry) => inquiry.timing).filter(Boolean);
  const contactTimes = data.flatMap((inquiry) => inquiry.contact_times || []);
  const topStyle = getMostCommon(styles);
  const topZone = getMostCommon(data.map((inquiry) => inquiry.general_zone).filter(Boolean));
  const topTiming = getMostCommon(timings);
  const topContactTime = getMostCommon(contactTimes);
  const completed = byStatus.completed || 0;

  return {
    metrics: {
      total,
      requested: byStatus.requested || 0,
      quoted: byStatus.quoted || 0,
      booked: byStatus.booked || 0,
      completed,
      cancelled: byStatus.cancelled || 0,
      conversionRate: total ? Math.round((completed / total) * 100) : 0,
      topStyle,
      topZone,
      topTiming,
      topContactTime,
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


