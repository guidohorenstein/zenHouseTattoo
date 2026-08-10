import { hasSupabaseConfig, supabase } from "../../../lib/supabaseClient";
import { getAdminMediaUrl, isManagedMediaPath } from "../../admin/services/stylesApi";

export async function listPublicTattooStyles() {
  if (!hasSupabaseConfig) return { styles: [], error: null };

  const { data, error } = await supabase
    .from("tattoo_styles")
    .select(
      "slug, title_en, title_he, placement_group, sort_order, color_image_path, black_grey_image_path, color_crop_data, black_grey_crop_data",
    )
    .eq("is_active", true)
    .order("placement_group", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) return { styles: [], error: error.message };

  return {
    styles: (data || []).map((style) => ({
      ...style,
      colorPreviewUrl: getAdminMediaUrl(style.color_image_path),
      blackGreyPreviewUrl: getAdminMediaUrl(style.black_grey_image_path),
      hasColor: isManagedMediaPath(style.color_image_path),
      hasBlackGrey: isManagedMediaPath(style.black_grey_image_path),
    })),
    error: null,
  };
}

export async function listPublicFormTexts() {
  if (!hasSupabaseConfig) return { he: {}, en: {}, error: null };

  const { data, error } = await supabase.from("form_texts").select("key, he_text, en_text");

  if (error) return { he: {}, en: {}, error: error.message };

  const he = {};
  const en = {};
  for (const row of data || []) {
    he[row.key] = row.he_text;
    en[row.key] = row.en_text;
  }

  return { he, en, error: null };
}

export async function listPublicBodyPhotos() {
  if (!hasSupabaseConfig)
    return { categories: [], areas: [], images: [], referenceImages: [], error: null };

  const [categoriesResult, areasResult, imagesResult, referenceImagesResult] = await Promise.all([
    supabase
      .from("body_categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("body_areas")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase.from("body_area_images").select("*").eq("is_active", true),
    supabase.from("body_reference_images").select("*").eq("is_active", true),
  ]);

  return {
    categories: categoriesResult.data || [],
    areas: areasResult.data || [],
    images: (imagesResult.data || []).map((image) => ({
      ...image,
      previewUrl: getAdminMediaUrl(image.storage_path),
    })),
    referenceImages: (referenceImagesResult.data || []).map((image) => ({
      ...image,
      previewUrl: getAdminMediaUrl(image.storage_path),
    })),
    error:
      categoriesResult.error?.message ||
      areasResult.error?.message ||
      imagesResult.error?.message ||
      referenceImagesResult.error?.message ||
      null,
  };
}
