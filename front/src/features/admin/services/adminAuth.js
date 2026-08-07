import { isAllowedAdminEmail } from "../../../lib/adminAccess";
import { hasSupabaseConfig, supabase } from "../../../lib/supabaseClient";

export async function getCurrentAdminSession() {
  if (!hasSupabaseConfig) return { session: null, error: null };

  const { data, error } = await supabase.auth.getSession();
  const session = data?.session || null;

  if (session && !isAllowedAdminEmail(session.user.email)) {
    await supabase.auth.signOut();
    return { session: null, error: "This email is not allowed to access admin." };
  }

  return { session, error: error?.message || null };
}

export async function signInAdmin(email, password) {
  if (!hasSupabaseConfig) {
    return { session: null, error: "Supabase is not configured yet." };
  }

  if (!isAllowedAdminEmail(email)) {
    return { session: null, error: "This email is not allowed to access admin." };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  return { session: data?.session || null, error: error?.message || null };
}

export async function signOutAdmin() {
  if (!hasSupabaseConfig) return;
  await supabase.auth.signOut();
}
