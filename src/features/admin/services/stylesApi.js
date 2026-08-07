import { hasSupabaseConfig, supabase } from "../../../lib/supabaseClient";

const STYLE_IMAGE_BUCKET = "admin-media";

export async function listTattooStylesAdmin() {
  if (!hasSupabaseConfig) {
    return { styles: [], error: "Supabase is not configured yet." };
  }

  const { data, error } = await supabase
    .from("tattoo_styles")
    .select("*")
    .order("placement_group", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("title_en", { ascending: true });

  return {
    styles: (data || []).map(withPreviewUrls),
    error: error?.message || null,
  };
}

export async function saveTattooStyle(style) {
  if (!hasSupabaseConfig) {
    return { style: null, error: "Supabase is not configured yet." };
  }

  const payload = {
    slug: style.id ? style.slug.trim() : normalizeSlug(style.slug),
    title_en: style.title_en.trim(),
    title_he: style.title_he.trim() || style.title_en.trim(),
    placement_group: style.placement_group,
    sort_order: Number(style.sort_order) || 0,
    color_image_path: style.color_image_path || null,
    black_grey_image_path: style.black_grey_image_path || null,
    is_active: Boolean(style.is_active),
  };

  const query = style.id
    ? supabase.from("tattoo_styles").update(payload).eq("id", style.id)
    : supabase.from("tattoo_styles").insert(payload);

  const { data, error } = await query.select("*").single();

  return {
    style: data ? withPreviewUrls(data) : null,
    error: error?.message || null,
  };
}

export async function deleteTattooStyle(styleId) {
  if (!hasSupabaseConfig) {
    return { error: "Supabase is not configured yet." };
  }

  const { error } = await supabase.from("tattoo_styles").delete().eq("id", styleId);
  return { error: error?.message || null };
}

export async function uploadTattooStyleImage(file, styleSlug, colorMode) {
  if (!hasSupabaseConfig) {
    return { path: "", previewUrl: "", error: "Supabase is not configured yet." };
  }

  if (!file) return { path: "", previewUrl: "", error: null };

  const extension = getFileExtension(file);
  const safeSlug = normalizeSlug(styleSlug || "style");
  const path = `tattoo-styles/${colorMode}/${safeSlug}-${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from(STYLE_IMAGE_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: true,
    });

  if (error) return { path: "", previewUrl: "", error: error.message };

  return {
    path,
    previewUrl: getAdminMediaUrl(path),
    error: null,
  };
}

export function normalizeSlug(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getAdminMediaUrl(path) {
  if (!path) return "";
  if (!isManagedMediaPath(path)) return "";

  const { data } = supabase.storage.from(STYLE_IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export function isManagedMediaPath(path) {
  return Boolean(path && !path.startsWith("/") && !path.startsWith("http"));
}

function withPreviewUrls(style) {
  return {
    ...style,
    colorPreviewUrl: getAdminMediaUrl(style.color_image_path),
    blackGreyPreviewUrl: getAdminMediaUrl(style.black_grey_image_path),
    hasColor: isManagedMediaPath(style.color_image_path),
    hasBlackGrey: isManagedMediaPath(style.black_grey_image_path),
  };
}

function getFileExtension(file) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ["jpg", "jpeg", "png", "webp"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }

  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}
