import {
  hasSupabaseConfig,
  supabaseAnonKey,
  supabaseUrl,
} from "../../../lib/supabaseClient";

function toPartialInquiryPayload(formData, language, submissionKey) {
  return {
    full_name: formData.fullName,
    email: formData.email,
    phone: formData.phone,
    source_language: language,
    idea_description: formData.ideaDescription,
    body_reference: formData.bodyReference,
    general_zone: formData.generalZone,
    specific_zone: formData.specificZone,
    placement_boxes: formData.placementBoxes,
    styles: formData.styles ? [formData.styles] : [],
    color_mode: formData.colorMode,
    submission_key: submissionKey,
  };
}

export async function savePartialInquiry(
  formData,
  language,
  submissionKey,
  placementImage = null,
) {
  if (!hasSupabaseConfig) {
    return { partial: null, error: null, skipped: true };
  }

  try {
    const requestBody = new FormData();
    requestBody.append(
      "payload",
      JSON.stringify(toPartialInquiryPayload(formData, language, submissionKey)),
    );

    if (placementImage) {
      requestBody.append("placementImage", placementImage, placementImage.name);
    }

    formData.referenceImages.forEach((image) => {
      if (image.file) {
        requestBody.append("referenceImages", image.file, image.name);
      }
    });

    const response = await fetch(`${supabaseUrl}/functions/v1/save-partial-inquiry`, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: requestBody,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        partial: null,
        error: data.error || "We could not save the partial inquiry.",
        skipped: false,
      };
    }

    return {
      partial: data.partial,
      error: null,
      skipped: false,
    };
  } catch {
    return {
      partial: null,
      error: "Partial inquiry service is unavailable.",
      skipped: false,
    };
  }
}
