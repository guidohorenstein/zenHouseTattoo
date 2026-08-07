import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAX_REFERENCE_IMAGES = 4;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_INQUIRIES_PER_CONTACT_PER_HOUR = 3;
const MAX_INQUIRIES_PER_IP_PER_HOUR = 20;
const MAX_TEXT = {
  fullName: 120,
  email: 254,
  phone: 32,
  ideaDescription: 350,
  submissionKey: 120,
};
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://zenhousetattoo.com",
  "https://www.zenhousetattoo.com",
];
const ALLOWED_BODY_REFERENCES = new Set(["male", "female"]);
const ALLOWED_HAS_TATTOOS = new Set(["yes", "no"]);
const ALLOWED_COLOR_MODES = new Set(["blackGrey", "color"]);
const ALLOWED_TIMINGS = new Set(["asap", "nextWeeks", "nextMonth", "dontCare"]);
const ALLOWED_CONTACT_TIMES = new Set(["morning", "afternoon", "evening"]);

function getAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin") || "";
  if (!origin) return ALLOWED_ORIGINS[0];
  return ALLOWED_ORIGINS.includes(origin) ? origin : "";
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

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string) {
  return /^[+\d()\s.-]{8,32}$/.test(phone);
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
      },
    ];
  });
}

function buildInquiryPayload(rawPayload: Record<string, unknown>) {
  const fullName = cleanText(rawPayload.full_name, MAX_TEXT.fullName);
  const email = cleanText(rawPayload.email, MAX_TEXT.email).toLowerCase();
  const phone = cleanText(rawPayload.phone, MAX_TEXT.phone);
  const ideaDescription = cleanText(
    rawPayload.idea_description,
    MAX_TEXT.ideaDescription,
  );
  const bodyReference = cleanText(rawPayload.body_reference, 20);
  const hasTattoos = cleanText(rawPayload.has_tattoos, 20);
  const generalZone = cleanText(rawPayload.general_zone, 80);
  const specificZone = cleanText(rawPayload.specific_zone, 80);
  const colorMode = cleanText(rawPayload.color_mode, 20);
  const timing = cleanText(rawPayload.timing, 30);
  const sourceLanguage = cleanText(rawPayload.source_language, 2) === "he" ? "he" : "en";
  const styles = cleanArray(rawPayload.styles, 10);
  const contactTimes = cleanArray(rawPayload.contact_times, 3);
  const placementBoxes = cleanPlacementBoxes(rawPayload.placement_boxes);
  const submissionKey = cleanText(rawPayload.submission_key, MAX_TEXT.submissionKey);

  return {
    full_name: fullName,
    email,
    phone,
    source_language: sourceLanguage,
    idea_description: ideaDescription,
    body_reference: bodyReference,
    has_tattoos: hasTattoos,
    general_zone: generalZone,
    specific_zone: specificZone,
    placement_boxes: placementBoxes,
    styles,
    color_mode: colorMode,
    timing,
    contact_times: contactTimes,
    submission_key: submissionKey,
  };
}

function validatePayload(payload: ReturnType<typeof buildInquiryPayload>) {
  if (payload.full_name.length < 3) return "Name is required.";
  if (!isValidEmail(payload.email)) return "A valid email is required.";
  if (!isValidPhone(payload.phone)) return "A valid phone is required.";
  if (payload.idea_description.length < 20) {
    return "Idea description must be at least 20 characters.";
  }
  if (!ALLOWED_COLOR_MODES.has(payload.color_mode)) return "Color mode is required.";
  if (payload.styles.length === 0) return "Choose at least one style.";
  if (!payload.styles.every(isValidSlugLike)) return "Selected styles are invalid.";
  if (!ALLOWED_BODY_REFERENCES.has(payload.body_reference)) {
    return "Body reference is required.";
  }
  if (!ALLOWED_HAS_TATTOOS.has(payload.has_tattoos)) {
    return "Tattoo history is required.";
  }
  if (!isValidSlugLike(payload.general_zone)) return "General area is required.";
  if (!isValidSlugLike(payload.specific_zone)) return "Specific area is required.";
  if (payload.placement_boxes.length === 0) return "Placement mark is required.";
  if (!ALLOWED_TIMINGS.has(payload.timing)) return "Timing is required.";
  if (
    payload.contact_times.length === 0 ||
    !payload.contact_times.every((time) => ALLOWED_CONTACT_TIMES.has(time))
  ) {
    return "Contact time is required.";
  }
  if (!/^[a-zA-Z0-9_-]{12,120}$/.test(payload.submission_key)) {
    return "Submission key is required.";
  }

  return "";
}

function getClientIp(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

async function hasTooManyRecentInquiries(
  supabase: ReturnType<typeof createClient>,
  payload: ReturnType<typeof buildInquiryPayload>,
  clientIp: string,
) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const checks = [
    supabase
      .from("inquiries")
      .select("id", { count: "exact", head: true })
      .eq("email", payload.email)
      .gte("created_at", oneHourAgo),
    supabase
      .from("inquiries")
      .select("id", { count: "exact", head: true })
      .eq("phone", payload.phone)
      .gte("created_at", oneHourAgo),
  ];

  if (clientIp !== "unknown") {
    checks.push(
      supabase
        .from("inquiries")
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
      (emailResult.count || 0) >= MAX_INQUIRIES_PER_CONTACT_PER_HOUR ||
      (phoneResult.count || 0) >= MAX_INQUIRIES_PER_CONTACT_PER_HOUR ||
      (ipResult?.count || 0) >= MAX_INQUIRIES_PER_IP_PER_HOUR,
    error: "",
  };
}

async function rollbackInquiry(
  supabase: ReturnType<typeof createClient>,
  inquiryId: string,
  uploadedPaths: string[],
) {
  if (uploadedPaths.length > 0) {
    await supabase.storage.from("inquiry-references").remove(uploadedPaths);
  }

  await supabase.from("inquiries").delete().eq("id", inquiryId);
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

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return jsonResponse(request, { error: "Invalid request." }, 415);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase function configuration.");
    return jsonResponse(request, { error: "Server is not configured." }, 500);
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch (error) {
    console.warn("Invalid multipart payload:", error);
    return jsonResponse(request, { error: "Invalid request." }, 400);
  }

  const rawPayload = formData.get("payload");

  if (typeof rawPayload !== "string" || rawPayload.length > 10_000) {
    return jsonResponse(request, { error: "Payload is required." }, 400);
  }

  let parsedPayload: Record<string, unknown>;

  try {
    parsedPayload = JSON.parse(rawPayload);
  } catch {
    return jsonResponse(request, { error: "Payload is invalid." }, 400);
  }

  const payload = buildInquiryPayload(parsedPayload);
  const payloadError = validatePayload(payload);
  if (payloadError) return jsonResponse(request, { error: payloadError }, 400);

  const placementImage = formData.get("placementImage");
  const validPlacementImage = placementImage instanceof File ? placementImage : null;

  const referenceImages = formData
    .getAll("referenceImages")
    .filter((item): item is File => item instanceof File)
    .slice(0, MAX_REFERENCE_IMAGES);

  if (validPlacementImage) {
    const imageError = validateImage(validPlacementImage, "Marked placement image");
    if (imageError) return jsonResponse(request, { error: imageError }, 400);
  }

  for (const file of referenceImages) {
    const imageError = validateImage(file, "Each image");
    if (imageError) return jsonResponse(request, { error: imageError }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: alreadySubmittedInquiry, error: alreadySubmittedError } = await supabase
    .from("inquiries")
    .select("id")
    .eq("submission_key", payload.submission_key)
    .maybeSingle();

  if (!alreadySubmittedError && alreadySubmittedInquiry) {
    return jsonResponse(request, { inquiry: alreadySubmittedInquiry, duplicate: true });
  }

  const rateLimit = await hasTooManyRecentInquiries(supabase, payload, getClientIp(request));
  if (rateLimit.error) {
    console.warn("Rate limit check failed:", rateLimit.error);
  }

  if (rateLimit.blocked) {
    return jsonResponse(
      request,
      { error: "Too many requests from this contact. Please try again later." },
      429,
    );
  }

  const insertPayload = {
    ...payload,
    client_ip: getClientIp(request),
    user_agent: cleanText(request.headers.get("user-agent"), 500),
  };

  const { data: inquiry, error: inquiryError } = await supabase
    .from("inquiries")
    .insert(insertPayload)
    .select("id")
    .single();

  if (inquiryError?.code === "23505") {
    const { data: existingInquiry, error: existingInquiryError } = await supabase
      .from("inquiries")
      .select("id")
      .eq("submission_key", payload.submission_key)
      .single();

    if (!existingInquiryError && existingInquiry) {
      return jsonResponse(request, { inquiry: existingInquiry, duplicate: true });
    }
  }

  if (inquiryError || !inquiry) {
    console.error("Could not create inquiry:", inquiryError);
    return jsonResponse(request, { error: "Could not create inquiry." }, 500);
  }

  const imageRows: Array<{ inquiry_id: string; storage_path: string; original_name: string }> = [];
  const uploadedPaths: string[] = [];

  if (validPlacementImage) {
    const placementPath = `${inquiry.id}/placement-marked-${crypto.randomUUID()}.${getFileExtension(validPlacementImage)}`;
    const { error: placementUploadError } = await supabase.storage
      .from("inquiry-references")
      .upload(placementPath, validPlacementImage, {
        contentType: validPlacementImage.type,
        upsert: false,
      });

    if (placementUploadError) {
      console.error("Placement image upload failed:", placementUploadError);
      await rollbackInquiry(supabase, inquiry.id, uploadedPaths);
      return jsonResponse(request, { error: "Could not upload placement image." }, 500);
    }

    uploadedPaths.push(placementPath);

    const { error: placementUpdateError } = await supabase
      .from("inquiries")
      .update({ placement_marked_image_path: placementPath })
      .eq("id", inquiry.id);

    if (placementUpdateError) {
      console.error("Placement image metadata update failed:", placementUpdateError);
      await rollbackInquiry(supabase, inquiry.id, uploadedPaths);
      return jsonResponse(request, { error: "Could not save placement image." }, 500);
    }
  }

  for (const [index, file] of referenceImages.entries()) {
    const extension = getFileExtension(file);
    const storagePath = `${inquiry.id}/reference-${index + 1}-${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("inquiry-references")
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Reference image upload failed:", uploadError);
      await rollbackInquiry(supabase, inquiry.id, uploadedPaths);
      return jsonResponse(request, { error: "Could not upload reference images." }, 500);
    }

    uploadedPaths.push(storagePath);

    imageRows.push({
      inquiry_id: inquiry.id,
      storage_path: storagePath,
      original_name: cleanText(file.name, 180),
    });
  }

  if (imageRows.length > 0) {
    const { error: imageRowsError } = await supabase
      .from("inquiry_reference_images")
      .insert(imageRows);

    if (imageRowsError) {
      console.error("Reference image metadata insert failed:", imageRowsError);
      await rollbackInquiry(supabase, inquiry.id, uploadedPaths);
      return jsonResponse(request, { error: "Could not save reference images." }, 500);
    }
  }

  return jsonResponse(request, { inquiry });
});
