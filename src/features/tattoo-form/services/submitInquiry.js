import {
  hasSupabaseConfig,
  supabaseAnonKey,
  supabaseUrl,
} from "../../../lib/supabaseClient";

function toInquiryPayload(formData, language, submissionKey) {
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
    submission_key: submissionKey,
  };
}

export async function submitInquiry(formData, language, submissionKey, placementImage) {
  if (!hasSupabaseConfig) {
    return { inquiry: null, error: null, skipped: true };
  }

  try {
    const requestBody = new FormData();
    requestBody.append(
      "payload",
      JSON.stringify(toInquiryPayload(formData, language, submissionKey)),
    );

    if (placementImage) {
      requestBody.append("placementImage", placementImage, placementImage.name);
    }

    formData.referenceImages.forEach((image) => {
      if (image.file) {
        requestBody.append("referenceImages", image.file, image.name);
      }
    });

    const response = await fetch(`${supabaseUrl}/functions/v1/submit-inquiry`, {
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
        inquiry: null,
        error: data.error || "We could not submit the inquiry.",
        skipped: false,
      };
    }

    return {
      inquiry: data.inquiry,
      error: null,
      skipped: false,
      duplicate: Boolean(data.duplicate),
    };
  } catch {
    return {
      inquiry: null,
      error: "Submit service is unavailable. Please try again in a moment.",
      skipped: false,
    };
  }
}

