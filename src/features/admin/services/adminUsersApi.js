import { hasSupabaseConfig, supabase } from "../../../lib/supabaseClient";

const FUNCTION_NAME = "admin-users";

async function invokeAdminUsers(action, payload = {}) {
  if (!hasSupabaseConfig) {
    return { data: null, error: "Supabase is not configured yet." };
  }

  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: { action, ...payload },
  });

  const functionError = error ? await readFunctionError(error) : "";

  return {
    data: data || null,
    error: functionError || data?.error || error?.message || null,
  };
}

async function readFunctionError(error) {
  if (!error?.context) return "";

  try {
    const body = await error.context.json();
    return body?.error || "";
  } catch {
    return "";
  }
}

export async function listAdminUsers() {
  const result = await invokeAdminUsers("list");
  return {
    users: result.data?.users || [],
    currentAdmin: result.data?.currentAdmin || null,
    error: result.error,
  };
}

export async function inviteAdminUser({ email, displayName, role }) {
  const result = await invokeAdminUsers("invite", {
    email,
    displayName,
    role,
  });

  return { user: result.data?.user || null, error: result.error };
}

export async function updateAdminUser(profileId, patch) {
  const result = await invokeAdminUsers("update", {
    profileId,
    patch,
  });

  return { user: result.data?.user || null, error: result.error };
}

export async function deleteAdminUser(profileId) {
  const result = await invokeAdminUsers("delete", { profileId });
  return { error: result.error };
}

export async function sendPasswordReset(email) {
  const result = await invokeAdminUsers("reset-password", { email });
  return { error: result.error };
}
