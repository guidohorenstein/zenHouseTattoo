import { hasSupabaseConfig, supabase } from "../../../lib/supabaseClient";

export const defaultFormSettings = {
  whatsappPhone: "972547505670",
  defaultLanguage: "he",
  formEnabled: true,
  maxReferenceImages: 4,
  maxPlacementBoxes: 3,
};

export const defaultLeadNotificationSettings = {
  enabled: true,
  recipients: [],
  delayMinutes: 10,
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

export async function getLeadNotificationSettings() {
  if (!hasSupabaseConfig) {
    return {
      settings: defaultLeadNotificationSettings,
      error: "Supabase is not configured yet.",
    };
  }

  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "lead_notifications")
    .maybeSingle();

  return {
    settings: normalizeLeadNotificationSettings(data?.value),
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

export async function saveLeadNotificationSettings(settings) {
  if (!hasSupabaseConfig) {
    return { settings: null, error: "Supabase is not configured yet." };
  }

  const nextSettings = normalizeLeadNotificationSettings(settings);
  const { data, error } = await supabase
    .from("app_settings")
    .upsert({ key: "lead_notifications", value: nextSettings }, { onConflict: "key" })
    .select("value")
    .single();

  return {
    settings: data ? normalizeLeadNotificationSettings(data.value) : null,
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

export function normalizeLeadNotificationSettings(settings = {}) {
  return {
    enabled: settings.enabled !== false,
    recipients: normalizeEmails(settings.recipients),
    delayMinutes: clampNumber(settings.delayMinutes, 1, 120, 10),
  };
}

function cleanPhone(value) {
  return String(value || "").replace(/[^\d]/g, "").slice(0, 20);
}

function normalizeEmails(value) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((email) => String(email || "").trim().toLowerCase())
        .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
    ),
  ).slice(0, 10);
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;

  return Math.min(max, Math.max(min, Math.round(number)));
}
