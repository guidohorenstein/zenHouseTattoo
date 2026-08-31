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
    .select("id, status, converted_inquiry_id")
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
        client_ip: clientIp,
        user_agent: cleanText(request.headers.get("user-agent"), 500),
      },
      { onConflict: "submission_key" },
    )
    .select("id, placement_marked_image_path")
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

  return jsonResponse(request, { partial });
});
