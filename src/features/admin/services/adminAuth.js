import { hasSupabaseConfig, supabase } from "../../../lib/supabaseClient";

export async function getCurrentAdminSession() {
  if (!hasSupabaseConfig) return { session: null, error: null };

  const { data, error } = await supabase.auth.getSession();
  const session = data?.session || null;
  let profile = null;

  if (session) {
    profile = await getAdminProfile(session.user.id);
  }

  if (session && !profile) {
    await supabase.auth.signOut();
    return { session: null, error: "This email is not allowed to access admin." };
  }

  return { session, profile, error: error?.message || null };
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

  const profile = await getAdminProfile(data.session.user.id);
  if (!profile) {
    await supabase.auth.signOut();
    return { session: null, error: "This email is not allowed to access admin." };
  }

  return { session: data.session, profile, error: null };
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

async function getAdminProfile(userId) {
  const { data, error } = await supabase
    .from("admin_profiles")
    .select("id, email, display_name, role, is_super_admin, is_active")
    .eq("id", userId)
    .eq("is_active", true)
    .maybeSingle();

  return !error ? data : null;
}
