import { hasSupabaseConfig, supabase } from "../../../lib/supabaseClient";

export async function listFormTexts() {
  if (!hasSupabaseConfig) {
    return { texts: [], error: "Supabase is not configured yet." };
  }

  const { data, error } = await supabase
    .from("form_texts")
    .select("*")
    .order("key", { ascending: true });

  return {
    texts: data || [],
    error: error?.message || null,
  };
}

export async function updateFormText(key, heText, enText) {
  if (!hasSupabaseConfig) {
    return { text: null, error: "Supabase is not configured yet." };
  }

  const { data, error } = await supabase
    .from("form_texts")
    .update({ he_text: heText, en_text: enText })
    .eq("key", key)
    .select("*")
    .single();

  return {
    text: data || null,
    error: error?.message || null,
  };
}
