import { hasSupabaseConfig, supabase } from "../../../lib/supabaseClient";

export const defaultFormSettings = {
  whatsappPhone: "972547505670",
  defaultLanguage: "he",
  formEnabled: true,
  maxReferenceImages: 4,
  maxPlacementBoxes: 3,
};

export async function getFormSettings() {
  if (!hasSupabaseConfig) {
    return { settings: defaultFormSettings, error: "Supabase is not configured yet." };
  }

  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "form")
    .maybeSingle();

  return {
    settings: normalizeFormSettings(data?.value),
    error: error?.message || null,
  };
}

export async function saveFormSettings(settings) {
  if (!hasSupabaseConfig) {
    return { settings: null, error: "Supabase is not configured yet." };
  }

  const nextSettings = normalizeFormSettings(settings);
  const { data, error } = await supabase
    .from("app_settings")
    .upsert({ key: "form", value: nextSettings }, { onConflict: "key" })
    .select("value")
    .single();

  return {
    settings: data ? normalizeFormSettings(data.value) : null,
    error: error?.message || null,
  };
}

export function normalizeFormSettings(settings = {}) {
  return {
    whatsappPhone: cleanPhone(settings.whatsappPhone) || defaultFormSettings.whatsappPhone,
    defaultLanguage: settings.defaultLanguage === "en" ? "en" : "he",
    formEnabled: settings.formEnabled !== false,
    maxReferenceImages: clampNumber(settings.maxReferenceImages, 1, 4, 4),
    maxPlacementBoxes: clampNumber(settings.maxPlacementBoxes, 1, 3, 3),
  };
}

function cleanPhone(value) {
  return String(value || "").replace(/[^\d]/g, "").slice(0, 20);
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;

  return Math.min(max, Math.max(min, Math.round(number)));
}
