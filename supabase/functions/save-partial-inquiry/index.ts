import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  submissionKey: 120,
};

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

  return {
    full_name: cleanText(rawPayload.full_name, MAX_TEXT.fullName),
    email: cleanText(rawPayload.email, MAX_TEXT.email).toLowerCase(),
    phone: cleanText(rawPayload.phone, MAX_TEXT.phone),
    source_language: sourceLanguage,
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

  return "";
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

  let rawPayload: Record<string, unknown>;

  try {
    rawPayload = await request.json();
  } catch {
    return jsonResponse(request, { error: "Invalid request." }, 400);
  }

  const payload = buildPayload(rawPayload);
  const payloadError = validatePayload(payload);
  if (payloadError) return jsonResponse(request, { error: payloadError }, 400);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const clientIp = getClientIp(request);
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
    .select("id")
    .single();

  if (error || !partial) {
    console.error("Could not save partial inquiry:", error);
    return jsonResponse(request, { error: "Could not save partial inquiry." }, 500);
  }

  return jsonResponse(request, { partial });
});
