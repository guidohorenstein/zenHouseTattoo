import { hasSupabaseConfig, supabase } from "../../../lib/supabaseClient";

function toInquiryPayload(formData, language) {
  return {
    full_name: formData.fullName,
    email: formData.email,
    phone: formData.phone,
    source_language: language,
    idea_description: formData.ideaDescription,
    body_reference: formData.bodyReference,
    has_tattoos: formData.hasTattoos,
    general_zone: formData.generalZone,
    specific_zone: formData.specificZone,
    placement_boxes: formData.placementBoxes,
    styles: formData.styles,
    color_mode: formData.colorMode,
    timing: formData.timing,
    contact_times: formData.contactTimes,
  };
}

export async function submitInquiry(formData, language) {
  if (!hasSupabaseConfig) {
    return { inquiry: null, error: null, skipped: true };
  }

  const { data: inquiry, error } = await supabase
    .from("inquiries")
    .insert(toInquiryPayload(formData, language))
    .select("id")
    .single();

  if (error) return { inquiry: null, error: error.message, skipped: false };

  // Reference image upload will be handled by a secure backend function later.
  return { inquiry, error: null, skipped: false };
}
