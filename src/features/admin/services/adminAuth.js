import { hasSupabaseConfig, supabase } from "../../../lib/supabaseClient";

export async function getCurrentAdminSession() {
  if (!hasSupabaseConfig) return { session: null, error: null };

  const { data, error } = await supabase.auth.getSession();
  const session = data?.session || null;

  if (session && !(await isActiveAdmin(session.user.id))) {
    await supabase.auth.signOut();
    return { session: null, error: "This email is not allowed to access admin." };
  }

  return { session, error: error?.message || null };
}

export async function signInAdmin(email, password) {
  if (!hasSupabaseConfig) {
    return { session: null, error: "Supabase is not configured yet." };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error || !data?.session) {
    return { session: null, error: error?.message || "Could not login." };
  }

  const hasAccess = await isActiveAdmin(data.session.user.id);
  if (!hasAccess) {
    await supabase.auth.signOut();
    return { session: null, error: "This email is not allowed to access admin." };
  }

  await supabase
    .from("admin_profiles")
    .update({ last_sign_in_at: new Date().toISOString() })
    .eq("id", data.session.user.id);

  return { session: data.session, error: null };
}

export async function signOutAdmin() {
  if (!hasSupabaseConfig) return;
  await supabase.auth.signOut();
}

export async function sendAdminPasswordReset(email) {
  if (!hasSupabaseConfig) {
    return { error: "Supabase is not configured yet." };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${window.location.origin}/admin`,
  });

  return { error: error?.message || null };
}

export async function updateCurrentAdminPassword(password) {
  if (!hasSupabaseConfig) {
    return { error: "Supabase is not configured yet." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  return { error: error?.message || null };
}

async function isActiveAdmin(userId) {
  const { data, error } = await supabase
    .from("admin_profiles")
    .select("id")
    .eq("id", userId)
    .eq("is_active", true)
    .maybeSingle();

  return Boolean(data && !error);
}
