import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://zenhousetattoo.com",
  "https://www.zenhousetattoo.com",
];
const VALID_ROLES = new Set(["owner", "admin", "viewer"]);
const ADMIN_REDIRECT_URL = "https://zenhousetattoo.com/admin";

function getAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin") || "";
  if (!origin) return ALLOWED_ORIGINS[0];
  if (ALLOWED_ORIGINS.includes(origin)) return origin;

  try {
    const hostname = new URL(origin).hostname;
    if (hostname.endsWith(".workers.dev") || hostname.endsWith(".pages.dev")) {
      return origin;
    }
  } catch {
    return "";
  }

  return "";
}

function corsHeaders(request: Request) {
  const allowedOrigin = getAllowedOrigin(request);

  return {
    ...(allowedOrigin ? { "Access-Control-Allow-Origin": allowedOrigin } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function securityHeaders() {
  return {
    "Cache-Control": "no-store",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
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

function cleanText(value: unknown, maxLength = 180) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function getCurrentAdmin(
  request: Request,
  supabaseUrl: string,
  anonKey: string,
  serviceRoleKey: string,
) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return null;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return null;

  const { data: profile } = await serviceClient
    .from("admin_profiles")
    .select("id, email, display_name, role, is_super_admin, is_active")
    .eq("id", userData.user.id)
    .eq("is_active", true)
    .maybeSingle();

  return profile || null;
}

function isOwner(currentAdmin: { role?: string; is_super_admin?: boolean } | null) {
  return Boolean(currentAdmin?.is_super_admin || currentAdmin?.role === "owner");
}

async function findAuthUserByEmail(
  serviceClient: ReturnType<typeof createClient>,
  email: string,
) {
  let page = 1;
  const perPage = 100;

  while (page <= 10) {
    const { data, error } = await serviceClient.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) return { user: null, error };

    const user = data.users.find((item) => item.email?.toLowerCase() === email);
    if (user) return { user, error: null };
    if (data.users.length < perPage) break;

    page += 1;
  }

  return { user: null, error: null };
}

Deno.serve(async (request) => {
  const allowedOrigin = getAllowedOrigin(request);

  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: { ...corsHeaders(request), ...securityHeaders() },
    });
  }

  if (!allowedOrigin) return jsonResponse(request, { error: "Forbidden origin." }, 403);
  if (request.method !== "POST") return jsonResponse(request, { error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse(request, { error: "Server is not configured." }, 500);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(request, { error: "Invalid request." }, 400);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const currentAdmin = await getCurrentAdmin(request, supabaseUrl, anonKey, serviceRoleKey);
  if (!currentAdmin) return jsonResponse(request, { error: "Unauthorized." }, 401);

  const action = cleanText(body.action, 40);

  if (action === "list") {
    const { data, error } = await serviceClient
      .from("admin_profiles")
      .select("id, email, display_name, role, is_super_admin, is_active, created_at, last_sign_in_at")
      .order("created_at", { ascending: true });

    return jsonResponse(
      request,
      { users: data || [], currentAdmin, error: error?.message || null },
      error ? 500 : 200,
    );
  }

  if (!isOwner(currentAdmin)) {
    return jsonResponse(request, { error: "Only owners can manage admin users." }, 403);
  }

  if (action === "invite") {
    const email = cleanText(body.email, 254).toLowerCase();
    const displayName = cleanText(body.displayName, 120) || email;
    const requestedRole = cleanText(body.role, 20);
    const role = VALID_ROLES.has(requestedRole) ? requestedRole : "admin";

    if (!isValidEmail(email)) return jsonResponse(request, { error: "Valid email is required." }, 400);

    const existingUserResult = await findAuthUserByEmail(serviceClient, email);
    if (existingUserResult.error) {
      return jsonResponse(request, { error: existingUserResult.error.message }, 500);
    }

    let userId = existingUserResult.user?.id || "";
    let emailMode = "password-reset";

    if (!existingUserResult.user) {
      const { data: createdUser, error: createError } =
        await serviceClient.auth.admin.inviteUserByEmail(email, {
          redirectTo: ADMIN_REDIRECT_URL,
        });

      if (createError) {
        return jsonResponse(request, { error: createError.message }, 400);
      }

      userId = createdUser.user?.id || "";
      emailMode = "invite";
    }

    if (!userId) return jsonResponse(request, { error: "Could not find invited user." }, 500);

    const { data: profile, error: profileError } = await serviceClient
      .from("admin_profiles")
      .upsert(
        {
          id: userId,
          email,
          display_name: displayName,
          role,
          is_super_admin: role === "owner",
          is_active: true,
        },
        { onConflict: "id" },
      )
      .select("id, email, display_name, role, is_super_admin, is_active, created_at, last_sign_in_at")
      .single();

    if (profileError) {
      return jsonResponse(request, { user: null, error: profileError.message }, 500);
    }

    if (existingUserResult.user) {
      const { error: resetError } = await serviceClient.auth.resetPasswordForEmail(email, {
        redirectTo: ADMIN_REDIRECT_URL,
      });

      if (resetError) {
        return jsonResponse(request, { user: profile, error: resetError.message }, 400);
      }
    }

    return jsonResponse(request, { user: profile, emailMode, error: null });
  }

  if (action === "update") {
    const profileId = cleanText(body.profileId, 80);
    const patch = (body.patch || {}) as Record<string, unknown>;
    const nextPatch: Record<string, unknown> = {};

    if (typeof patch.display_name === "string") {
      nextPatch.display_name = cleanText(patch.display_name, 120);
    }
    if (typeof patch.role === "string" && VALID_ROLES.has(patch.role)) {
      nextPatch.role = patch.role;
      nextPatch.is_super_admin = patch.role === "owner";
    }
    if (typeof patch.is_active === "boolean") {
      nextPatch.is_active = patch.is_active;
    }

    if (!profileId || Object.keys(nextPatch).length === 0) {
      return jsonResponse(request, { error: "Nothing to update." }, 400);
    }

    const { data, error } = await serviceClient
      .from("admin_profiles")
      .update(nextPatch)
      .eq("id", profileId)
      .select("id, email, display_name, role, is_super_admin, is_active, created_at, last_sign_in_at")
      .single();

    return jsonResponse(request, { user: data, error: error?.message || null }, error ? 500 : 200);
  }

  if (action === "delete") {
    const profileId = cleanText(body.profileId, 80);
    if (!profileId || profileId === currentAdmin.id) {
      return jsonResponse(request, { error: "You cannot delete your own admin access." }, 400);
    }

    const { error } = await serviceClient.from("admin_profiles").delete().eq("id", profileId);
    return jsonResponse(request, { error: error?.message || null }, error ? 500 : 200);
  }

  if (action === "reset-password") {
    const email = cleanText(body.email, 254).toLowerCase();
    if (!isValidEmail(email)) return jsonResponse(request, { error: "Valid email is required." }, 400);

    const { error } = await serviceClient.auth.resetPasswordForEmail(email, {
      redirectTo: ADMIN_REDIRECT_URL,
    });

    return jsonResponse(request, { error: error?.message || null }, error ? 500 : 200);
  }

  return jsonResponse(request, { error: "Unknown action." }, 400);
});
