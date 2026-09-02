import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAX_REFERENCE_IMAGES = 4;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_PARTIALS_PER_CONTACT_PER_HOUR = 8;
const MAX_PARTIALS_PER_IP_PER_HOUR = 40;
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://zenhousetattoo.com",
  "https://www.zenhousetattoo.com",
];
const MAX_TEXT = {
  fullName: 120,
  email: 254,
  phone: 32,
  ideaDescription: 350,
  submissionKey: 120,
};
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_BODY_REFERENCES = new Set(["male", "female", ""]);
const ALLOWED_COLOR_MODES = new Set(["blackGrey", "color", ""]);
const DEFAULT_NOTIFICATION_FROM = "Zen House Tattoo <notifications@zenhousetattoo.com>";

function getAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin") || "";
  if (!origin) return ALLOWED_ORIGINS[0];
  if (ALLOWED_ORIGINS.includes(origin)) return origin;

  return "";
}

function corsHeaders(request: Request) {
  const allowedOrigin = getAllowedOrigin(request);

  return {
    ...(allowedOrigin ? { "Access-Control-Allow-Origin": allowedOrigin } : {}),
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function securityHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Cache-Control": "no-store",
  };
}

function jsonResponse(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      ...securityHeaders(),
      "Content-Type": "application/json",
    },
  });
}

function cleanText(value: unknown, maxLength = 500) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanArray(value: unknown, maxItems = 20) {
  return Array.isArray(value)
    ? value
        .filter((item) => typeof item === "string" && item.trim())
        .map((item) => item.trim().slice(0, 80))
        .slice(0, maxItems)
    : [];
}

function isValidSlugLike(value: string) {
  return /^[a-zA-Z0-9_-]{1,80}$/.test(value);
}

function cleanPlacementBoxes(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 3).flatMap((box, index) => {
    if (!box || typeof box !== "object") return [];
    const source = box as Record<string, unknown>;
    const x = Number(source.x);
    const y = Number(source.y);
    const width = Number(source.width);
    const height = Number(source.height);
    const rotation = Number(source.rotation || 0);

    if (![x, y, width, height].every(Number.isFinite)) return [];
    if (x < 0 || y < 0 || width <= 0 || height <= 0) return [];
    if (x > 100 || y > 100 || x + width > 100 || y + height > 100) return [];

    return [
      {
        id: cleanText(source.id, 80) || `box-${index + 1}`,
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
        width: Number(width.toFixed(2)),
        height: Number(height.toFixed(2)),
        rotation: Number.isFinite(rotation) ? Number(rotation.toFixed(2)) : 0,
      },
    ];
  });
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string) {
  return /^[+\d()\s.-]{8,32}$/.test(phone);
}

function getClientIp(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function buildPayload(rawPayload: Record<string, unknown>) {
  const sourceLanguage = cleanText(rawPayload.source_language, 2) === "en" ? "en" : "he";
  const bodyReference = cleanText(rawPayload.body_reference, 20);
  const colorMode = cleanText(rawPayload.color_mode, 20);

  return {
    full_name: cleanText(rawPayload.full_name, MAX_TEXT.fullName),
    email: cleanText(rawPayload.email, MAX_TEXT.email).toLowerCase(),
    phone: cleanText(rawPayload.phone, MAX_TEXT.phone),
    source_language: sourceLanguage,
    idea_description: cleanText(rawPayload.idea_description, MAX_TEXT.ideaDescription),
    body_reference: bodyReference,
    general_zone: cleanText(rawPayload.general_zone, 80),
    specific_zone: cleanText(rawPayload.specific_zone, 80),
    placement_boxes: cleanPlacementBoxes(rawPayload.placement_boxes),
    styles: cleanArray(rawPayload.styles, 10),
    color_mode: colorMode,
    submission_key: cleanText(rawPayload.submission_key, MAX_TEXT.submissionKey),
  };
}

function validatePayload(payload: ReturnType<typeof buildPayload>) {
  if (payload.full_name.length < 3) return "Name is required.";
  if (!isValidEmail(payload.email)) return "A valid email is required.";
  if (!isValidPhone(payload.phone)) return "A valid phone is required.";
  if (!/^[a-zA-Z0-9_-]{12,120}$/.test(payload.submission_key)) {
    return "Submission key is required.";
  }
  if (!ALLOWED_BODY_REFERENCES.has(payload.body_reference)) {
    return "Body reference is invalid.";
  }
  if (payload.general_zone && !isValidSlugLike(payload.general_zone)) {
    return "General area is invalid.";
  }
  if (payload.specific_zone && !isValidSlugLike(payload.specific_zone)) {
    return "Specific area is invalid.";
  }
  if (payload.styles.some((style) => !isValidSlugLike(style))) {
    return "Selected styles are invalid.";
  }
  if (!ALLOWED_COLOR_MODES.has(payload.color_mode)) {
    return "Color mode is invalid.";
  }

  return "";
}

function getFileExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ["jpg", "jpeg", "png", "webp"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }

  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

function validateImage(file: File, label: string) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return `${label} must be JPG, PNG or WEBP.`;
  }

  if (file.size > MAX_FILE_SIZE) {
    return `${label} must be under 10 MB.`;
  }

  return "";
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

function formatList(values: string[]) {
  return values.length > 0 ? values.join(", ") : "-";
}

async function getLeadNotificationSettings(
  supabase: ReturnType<typeof createClient>,
) {
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

function buildPartialLeadEmail(
  payload: ReturnType<typeof buildPayload>,
  partial: { id: string; created_at?: string; updated_at?: string },
) {
  const siteUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://zenhousetattoo.com";
  const adminUrl = `${siteUrl.replace(/\/$/, "")}/admin`;
  const createdAt = partial.created_at || new Date().toISOString();
  const updatedAt = partial.updated_at || createdAt;
  const safeLeadId = partial.id.slice(0, 8);
  const subject = `Zen House Tattoo - New partial lead from ${payload.full_name}`;
  const rows = [
    ["Lead type", "Partial lead"],
    ["Lead ID", safeLeadId],
    ["Name", payload.full_name],
    ["Email", payload.email],
    ["Phone", payload.phone],
    ["Language", payload.source_language.toUpperCase()],
    ["Color mode", payload.color_mode || "-"],
    ["Styles", formatList(payload.styles)],
    ["Body reference", payload.body_reference || "-"],
    ["General area", payload.general_zone || "-"],
    ["Specific area", payload.specific_zone || "-"],
    ["Idea", payload.idea_description || "-"],
    ["Created", formatDate(createdAt)],
    ["Last updated", formatDate(updatedAt)],
  ]
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:9px 10px;border-bottom:1px solid #e8edf3;color:#667085;font-weight:700;vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:9px 10px;border-bottom:1px solid #e8edf3;color:#101828;vertical-align:top;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f6f7f9;color:#101828;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;">
      New partial lead received in Zen House Tattoo admin.
    </div>
    <main style="max-width:680px;margin:0 auto;padding:28px 16px;">
      <section style="background:#ffffff;border:1px solid #e4e8ef;border-radius:14px;overflow:hidden;">
        <header style="padding:22px 24px;background:#111827;color:#ffffff;">
          <p style="margin:0 0 8px;color:#d6a56f;font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">Zen House Tattoo</p>
          <h1 style="margin:0;font-size:24px;line-height:1.25;">New partial lead received</h1>
        </header>
        <div style="padding:22px 24px;">
          <p style="margin:0 0 18px;color:#475467;line-height:1.55;">
            Someone submitted contact details and reached the partial lead checkpoint. Open the admin panel to review the full request.
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
    "Zen House Tattoo - New partial lead received",
    "",
    `Lead ID: ${safeLeadId}`,
    `Name: ${payload.full_name}`,
    `Email: ${payload.email}`,
    `Phone: ${payload.phone}`,
    `Language: ${payload.source_language.toUpperCase()}`,
    `Color mode: ${payload.color_mode || "-"}`,
    `Styles: ${formatList(payload.styles)}`,
    `Body reference: ${payload.body_reference || "-"}`,
    `General area: ${payload.general_zone || "-"}`,
    `Specific area: ${payload.specific_zone || "-"}`,
    `Idea: ${payload.idea_description || "-"}`,
    `Created: ${formatDate(createdAt)}`,
    `Last updated: ${formatDate(updatedAt)}`,
    "",
    `Open admin panel: ${adminUrl}`,
  ].join("\n");

  return { html, subject, text };
}

async function sendPartialLeadNotification(
  supabase: ReturnType<typeof createClient>,
  payload: ReturnType<typeof buildPayload>,
  partial: { id: string; created_at?: string; updated_at?: string },
) {
  const settings = await getLeadNotificationSettings(supabase);

  // No hay nada que enviar todavia. Se marca como omitido, no como enviado:
  // darlo por enviado dejaria el lead notificado para siempre y no volveria a
  // intentarse ni siquiera cuando se carguen destinatarios en el panel.
  if (!settings.enabled) return "skipped:Lead notifications are disabled.";
  if (settings.recipients.length === 0) {
    return "skipped:No notification recipients configured in the admin panel.";
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) return "Missing RESEND_API_KEY.";

  const from = Deno.env.get("LEAD_NOTIFICATION_FROM") || DEFAULT_NOTIFICATION_FROM;
  const { html, subject, text } = buildPartialLeadEmail(payload, partial);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: settings.recipients,
      subject,
      html,
      text,
      tags: [
        { name: "source", value: "zen_house_tattoo" },
        { name: "lead_type", value: "partial" },
      ],
    }),
  });

  if (response.ok) return "";

  const data = await response.json().catch(() => ({}));
  return data.message || data.error || `Resend returned ${response.status}.`;
}

async function markPartialNotificationResult(
  supabase: ReturnType<typeof createClient>,
  partialId: string,
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

  await supabase.from("partial_inquiries").update(payload).eq("id", partialId);
}

async function removeExistingPartialImages(
  supabase: ReturnType<typeof createClient>,
  partialId: string,
  placementPath: string | null,
) {
  const { data: existingImages } = await supabase
    .from("partial_inquiry_reference_images")
    .select("storage_path")
    .eq("partial_inquiry_id", partialId);
  const storagePaths = [
    ...(existingImages || []).map((image) => image.storage_path).filter(Boolean),
    placementPath,
  ].filter((path): path is string => Boolean(path));

  if (storagePaths.length > 0) {
    await supabase.storage.from("inquiry-references").remove(storagePaths);
  }

  await supabase
    .from("partial_inquiry_reference_images")
    .delete()
    .eq("partial_inquiry_id", partialId);
}

async function hasTooManyRecentPartials(
  supabase: ReturnType<typeof createClient>,
  payload: ReturnType<typeof buildPayload>,
  clientIp: string,
) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const checks = [
    supabase
      .from("partial_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("email", payload.email)
      .gte("created_at", oneHourAgo),
    supabase
      .from("partial_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("phone", payload.phone)
      .gte("created_at", oneHourAgo),
  ];

  if (clientIp !== "unknown") {
    checks.push(
      supabase
        .from("partial_inquiries")
        .select("id", { count: "exact", head: true })
        .eq("client_ip", clientIp)
        .gte("created_at", oneHourAgo),
    );
  }

  const [emailResult, phoneResult, ipResult] = await Promise.all(checks);
  const error = emailResult.error?.message || phoneResult.error?.message || ipResult?.error?.message || "";
  if (error) return { blocked: false, error };

  return {
    blocked:
      (emailResult.count || 0) >= MAX_PARTIALS_PER_CONTACT_PER_HOUR ||
      (phoneResult.count || 0) >= MAX_PARTIALS_PER_CONTACT_PER_HOUR ||
      (ipResult?.count || 0) >= MAX_PARTIALS_PER_IP_PER_HOUR,
    error: "",
  };
}

Deno.serve(async (request) => {
  const allowedOrigin = getAllowedOrigin(request);

  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        ...corsHeaders(request),
        ...securityHeaders(),
      },
    });
  }

  if (!allowedOrigin) {
    return jsonResponse(request, { error: "Forbidden origin." }, 403);
  }

  if (request.method !== "POST") {
    return jsonResponse(request, { error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey =
    Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase function configuration.");
    return jsonResponse(request, { error: "Server is not configured." }, 500);
  }

  const contentType = request.headers.get("content-type") || "";
  let rawPayload: Record<string, unknown>;
  let placementImage: File | null = null;
  let referenceImages: File[] = [];

  try {
    if (contentType.toLowerCase().includes("multipart/form-data")) {
      const formData = await request.formData();
      const rawFormPayload = formData.get("payload");

      if (typeof rawFormPayload !== "string" || rawFormPayload.length > 10_000) {
        return jsonResponse(request, { error: "Payload is required." }, 400);
      }

      rawPayload = JSON.parse(rawFormPayload);
      const rawPlacementImage = formData.get("placementImage");
      placementImage = rawPlacementImage instanceof File ? rawPlacementImage : null;
      referenceImages = formData
        .getAll("referenceImages")
        .filter((item): item is File => item instanceof File)
        .slice(0, MAX_REFERENCE_IMAGES);
    } else {
      rawPayload = await request.json();
    }
  } catch (error) {
    console.warn("Invalid partial payload:", error);
    return jsonResponse(request, { error: "Invalid request." }, 400);
  }

  const payload = buildPayload(rawPayload);
  const payloadError = validatePayload(payload);
  if (payloadError) return jsonResponse(request, { error: payloadError }, 400);

  if (placementImage) {
    const imageError = validateImage(placementImage, "Marked placement image");
    if (imageError) return jsonResponse(request, { error: imageError }, 400);
  }

  for (const file of referenceImages) {
    const imageError = validateImage(file, "Each image");
    if (imageError) return jsonResponse(request, { error: imageError }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const clientIp = getClientIp(request);
  const { data: submittedInquiry, error: submittedInquiryError } = await supabase
    .from("inquiries")
    .select("id")
    .eq("submission_key", payload.submission_key)
    .maybeSingle();

  if (submittedInquiryError) {
    console.warn("Partial inquiry submitted check failed:", submittedInquiryError);
  }

  if (submittedInquiry) {
    return jsonResponse(request, {
      partial: {
        converted_inquiry_id: submittedInquiry.id,
        status: "converted",
      },
      converted: true,
    });
  }

  const { data: existingPartial, error: existingPartialError } = await supabase
    .from("partial_inquiries")
    .select("id, status, converted_inquiry_id, notification_sent_at")
    .eq("submission_key", payload.submission_key)
    .maybeSingle();

  if (existingPartialError) {
    console.warn("Partial inquiry existing status check failed:", existingPartialError);
  }

  if (existingPartial?.status === "converted") {
    return jsonResponse(request, { partial: existingPartial, converted: true });
  }

  const rateLimit = await hasTooManyRecentPartials(supabase, payload, clientIp);

  if (rateLimit.error) {
    console.warn("Partial inquiry rate limit check failed:", rateLimit.error);
  }

  if (rateLimit.blocked) {
    return jsonResponse(
      request,
      { error: "Too many requests from this contact. Please try again later." },
      429,
    );
  }

  const { data: partial, error } = await supabase
    .from("partial_inquiries")
    .upsert(
      {
        ...payload,
        status: "partial",
        archived_at: null,
        notification_due_at: new Date().toISOString(),
        ...(existingPartial?.notification_sent_at
          ? {}
          : { notification_sent_at: null, notification_error: null }),
        client_ip: clientIp,
        user_agent: cleanText(request.headers.get("user-agent"), 500),
      },
      { onConflict: "submission_key" },
    )
    .select("id, created_at, updated_at, placement_marked_image_path")
    .single();

  if (error || !partial) {
    console.error("Could not save partial inquiry:", error);
    return jsonResponse(request, { error: "Could not save partial inquiry." }, 500);
  }

  await removeExistingPartialImages(
    supabase,
    partial.id,
    (partial as { placement_marked_image_path?: string | null }).placement_marked_image_path || null,
  );

  const uploadedPaths: string[] = [];

  if (placementImage) {
    const placementPath = `${partial.id}/partial-placement-marked-${crypto.randomUUID()}.${getFileExtension(placementImage)}`;
    const { error: placementUploadError } = await supabase.storage
      .from("inquiry-references")
      .upload(placementPath, placementImage, {
        contentType: placementImage.type,
        upsert: false,
      });

    if (placementUploadError) {
      console.error("Partial placement image upload failed:", placementUploadError);
      return jsonResponse(request, { error: "Could not upload placement image." }, 500);
    }

    uploadedPaths.push(placementPath);

    const { error: placementUpdateError } = await supabase
      .from("partial_inquiries")
      .update({ placement_marked_image_path: placementPath })
      .eq("id", partial.id);

    if (placementUpdateError) {
      console.error("Partial placement image metadata update failed:", placementUpdateError);
      await supabase.storage.from("inquiry-references").remove(uploadedPaths);
      return jsonResponse(request, { error: "Could not save placement image." }, 500);
    }
  } else {
    await supabase
      .from("partial_inquiries")
      .update({ placement_marked_image_path: null })
      .eq("id", partial.id);
  }

  const imageRows: Array<{
    partial_inquiry_id: string;
    storage_path: string;
    original_name: string;
  }> = [];

  for (const [index, file] of referenceImages.entries()) {
    const storagePath = `${partial.id}/partial-reference-${index + 1}-${crypto.randomUUID()}.${getFileExtension(file)}`;
    const { error: uploadError } = await supabase.storage
      .from("inquiry-references")
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Partial reference image upload failed:", uploadError);
      await supabase.storage.from("inquiry-references").remove(uploadedPaths);
      return jsonResponse(request, { error: "Could not upload reference images." }, 500);
    }

    uploadedPaths.push(storagePath);
    imageRows.push({
      partial_inquiry_id: partial.id,
      storage_path: storagePath,
      original_name: cleanText(file.name, 180),
    });
  }

  if (imageRows.length > 0) {
    const { error: imageRowsError } = await supabase
      .from("partial_inquiry_reference_images")
      .insert(imageRows);

    if (imageRowsError) {
      console.error("Partial reference image metadata insert failed:", imageRowsError);
      await supabase.storage.from("inquiry-references").remove(uploadedPaths);
      return jsonResponse(request, { error: "Could not save reference images." }, 500);
    }
  }

  if (!existingPartial?.notification_sent_at) {
    const emailError = await sendPartialLeadNotification(supabase, payload, partial);
    await markPartialNotificationResult(supabase, partial.id, emailError);

    if (emailError.startsWith("skipped:")) {
      console.warn(`Partial lead notification skipped for ${partial.id}:`, emailError.slice(8));
    } else if (emailError) {
      console.error(`Partial lead notification failed for ${partial.id}:`, emailError);
    }
  }

  return jsonResponse(request, { partial });
});
