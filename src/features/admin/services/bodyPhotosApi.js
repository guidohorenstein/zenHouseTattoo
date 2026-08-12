import { hasSupabaseConfig, supabase } from "../../../lib/supabaseClient";
import { getAdminMediaUrl } from "./stylesApi";
import { prepareImageForUpload } from "./imageCompression";

const MEDIA_BUCKET = "admin-media";

export async function listBodyPhotoContent() {
  if (!hasSupabaseConfig) {
    return { categories: [], areas: [], images: [], error: "Supabase is not configured yet." };
  }

  const [categoriesResult, areasResult, imagesResult, referenceImagesResult] = await Promise.all([
    supabase.from("body_categories").select("*").order("sort_order", { ascending: true }),
    supabase.from("body_areas").select("*").order("sort_order", { ascending: true }),
    supabase.from("body_area_images").select("*"),
    supabase.from("body_reference_images").select("*"),
  ]);

  return {
    categories: categoriesResult.data || [],
    areas: areasResult.data || [],
    images: (imagesResult.data || []).map(withPreviewUrl),
    referenceImages: (referenceImagesResult.data || []).map(withPreviewUrl),
    error:
      categoriesResult.error?.message ||
      areasResult.error?.message ||
      imagesResult.error?.message ||
      referenceImagesResult.error?.message ||
      null,
  };
}

export async function saveBodyCategory(category) {
  if (!hasSupabaseConfig) return { item: null, error: "Supabase is not configured yet." };

  const payload = {
    slug: category.id ? category.slug.trim() : normalizeSlug(category.slug),
    title_en: category.title_en.trim(),
    title_he: category.title_he.trim() || category.title_en.trim(),
    sort_order: Number(category.sort_order) || 0,
    is_active: Boolean(category.is_active),
  };
  const query = category.id
    ? supabase.from("body_categories").update(payload).eq("id", category.id)
    : supabase.from("body_categories").insert(payload);
  const { data, error } = await query.select("*").single();

  return { item: data || null, error: error?.message || null };
}

export async function saveBodyArea(area) {
  if (!hasSupabaseConfig) return { item: null, error: "Supabase is not configured yet." };

  const payload = {
    category_id: area.category_id,
    slug: area.id ? area.slug.trim() : normalizeSlug(area.slug),
    title_en: area.title_en.trim(),
    title_he: area.title_he.trim() || area.title_en.trim(),
    sort_order: Number(area.sort_order) || 0,
    is_active: Boolean(area.is_active),
  };
  const query = area.id
    ? supabase.from("body_areas").update(payload).eq("id", area.id)
    : supabase.from("body_areas").insert(payload);
  const { data, error } = await query.select("*").single();

  return { item: data || null, error: error?.message || null };
}

export async function deleteBodyCategory(categoryId) {
  if (!hasSupabaseConfig) return { error: "Supabase is not configured yet." };

  const { error } = await supabase.from("body_categories").delete().eq("id", categoryId);
  return { error: error?.message || null };
}

export async function deleteBodyArea(areaId) {
  if (!hasSupabaseConfig) return { error: "Supabase is not configured yet." };

  const { error } = await supabase.from("body_areas").delete().eq("id", areaId);
  return { error: error?.message || null };
}

export async function saveBodyImage(image) {
  if (!hasSupabaseConfig) return { image: null, error: "Supabase is not configured yet." };

  const payload = {
    category_id: image.category_id || null,
    body_area_id: image.body_area_id || null,
    body_reference: image.body_reference,
    image_role: image.image_role,
    storage_path: image.storage_path,
    crop_data: image.crop_data || {},
    sort_order: Number(image.sort_order) || 0,
    is_active: Boolean(image.is_active),
  };
  const query = image.id
    ? supabase.from("body_area_images").update(payload).eq("id", image.id)
    : supabase.from("body_area_images").insert(payload);
  const { data, error } = await query.select("*").single();

  return { image: data ? withPreviewUrl(data) : null, error: error?.message || null };
}

export async function saveBodyReferenceImage(image) {
  if (!hasSupabaseConfig) return { image: null, error: "Supabase is not configured yet." };

  const payload = {
    body_reference: image.body_reference,
    storage_path: image.storage_path,
    crop_data: image.crop_data || {},
    is_active: Boolean(image.is_active),
  };
  const query = image.id
    ? supabase.from("body_reference_images").update(payload).eq("id", image.id)
    : supabase.from("body_reference_images").insert(payload);
  const { data, error } = await query.select("*").single();

  return { image: data ? withPreviewUrl(data) : null, error: error?.message || null };
}

export async function uploadBodyPhoto(file, slug) {
  if (!hasSupabaseConfig) {
    return { path: "", previewUrl: "", error: "Supabase is not configured yet." };
  }
  if (!file) return { path: "", previewUrl: "", error: null };

  const prepared = await prepareImageForUpload(file);
  const path = `body-photos/${normalizeSlug(slug || "body-photo")}-${Date.now()}.${prepared.extension}`;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, prepared.file, {
    contentType: prepared.contentType,
    upsert: true,
  });

  if (error) return { path: "", previewUrl: "", error: error.message };
  return { path, previewUrl: getAdminMediaUrl(path), error: null };
}

export function normalizeSlug(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function withPreviewUrl(image) {
  return {
    ...image,
    previewUrl: getAdminMediaUrl(image.storage_path),
  };
}
