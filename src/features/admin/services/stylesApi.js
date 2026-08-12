import { hasSupabaseConfig, supabase } from "../../../lib/supabaseClient";
import { prepareImageForUpload } from "./imageCompression";

const STYLE_IMAGE_BUCKET = "admin-media";

export async function listTattooStylesAdmin() {
  if (!hasSupabaseConfig) {
    return { styles: [], error: "Supabase is not configured yet." };
  }

  const { data, error } = await supabase
    .from("tattoo_styles")
    .select("*")
    .order("color_placement_group", { ascending: true })
    .order("color_sort_order", { ascending: true })
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
    color_placement_group: style.color_placement_group || style.placement_group,
    color_sort_order: Number(style.color_sort_order ?? style.sort_order) || 0,
    black_grey_placement_group:
      style.black_grey_placement_group || style.placement_group,
    black_grey_sort_order:
      Number(style.black_grey_sort_order ?? style.sort_order) || 0,
    color_image_path: style.color_image_path || null,
    black_grey_image_path: style.black_grey_image_path || null,
    color_crop_data: style.color_crop_data || {},
    black_grey_crop_data: style.black_grey_crop_data || {},
    is_more_styles_preview: Boolean(style.is_more_styles_preview),
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

  const prepared = await prepareImageForUpload(file);
  const safeSlug = normalizeSlug(styleSlug || "style");
  const path = `tattoo-styles/${colorMode}/${safeSlug}-${Date.now()}.${prepared.extension}`;

  const { error } = await supabase.storage
    .from(STYLE_IMAGE_BUCKET)
    .upload(path, prepared.file, {
      contentType: prepared.contentType,
      upsert: true,
    });

  if (error) return { path: "", previewUrl: "", error: error.message };

  return {
    path,
    previewUrl: getAdminMediaUrl(path),
    error: null,
  };
}

export async function listMoreStylePreviews() {
  if (!hasSupabaseConfig) {
    return { previews: [], error: "Supabase is not configured yet." };
  }

  const { data, error } = await supabase
    .from("more_styles_previews")
    .select("*")
    .order("color_mode", { ascending: true });

  return {
    previews: (data || []).map(withMoreStylePreviewUrl),
    error: error?.message || null,
  };
}

export async function saveMoreStylePreview(preview) {
  if (!hasSupabaseConfig) {
    return { preview: null, error: "Supabase is not configured yet." };
  }

  const payload = {
    color_mode: preview.color_mode,
    image_path: preview.image_path || null,
    crop_data: preview.crop_data || {},
  };

  const { data, error } = await supabase
    .from("more_styles_previews")
    .upsert(payload, { onConflict: "color_mode" })
    .select("*")
    .single();

  return {
    preview: data ? withMoreStylePreviewUrl(data) : null,
    error: error?.message || null,
  };
}

export async function uploadMoreStylePreviewImage(file, colorMode) {
  if (!hasSupabaseConfig) {
    return { path: "", previewUrl: "", error: "Supabase is not configured yet." };
  }

  if (!file) return { path: "", previewUrl: "", error: null };

  const prepared = await prepareImageForUpload(file);
  const safeMode = colorMode === "blackGrey" ? "black-grey" : "color";
  const path = `more-styles/${safeMode}-${Date.now()}.${prepared.extension}`;

  const { error } = await supabase.storage
    .from(STYLE_IMAGE_BUCKET)
    .upload(path, prepared.file, {
      contentType: prepared.contentType,
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
  const colorPlacementGroup = style.color_placement_group || style.placement_group;
  const blackGreyPlacementGroup =
    style.black_grey_placement_group || style.placement_group;
  const colorSortOrder = Number(style.color_sort_order ?? style.sort_order) || 0;
  const blackGreySortOrder =
    Number(style.black_grey_sort_order ?? style.sort_order) || 0;

  return {
    ...style,
    color_placement_group: colorPlacementGroup,
    color_sort_order: colorSortOrder,
    black_grey_placement_group: blackGreyPlacementGroup,
    black_grey_sort_order: blackGreySortOrder,
    placement_group: style.placement_group || colorPlacementGroup,
    sort_order: Number(style.sort_order ?? colorSortOrder) || 0,
    colorPreviewUrl: getAdminMediaUrl(style.color_image_path),
    blackGreyPreviewUrl: getAdminMediaUrl(style.black_grey_image_path),
    hasColor: isManagedMediaPath(style.color_image_path),
    hasBlackGrey: isManagedMediaPath(style.black_grey_image_path),
  };
}

function withMoreStylePreviewUrl(preview) {
  return {
    ...preview,
    previewUrl: getAdminMediaUrl(preview.image_path),
  };
}
