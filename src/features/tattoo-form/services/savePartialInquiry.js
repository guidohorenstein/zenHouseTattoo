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
    submission_key: submissionKey,
  };
}

export async function savePartialInquiry(formData, language, submissionKey) {
  if (!hasSupabaseConfig) {
    return { partial: null, error: null, skipped: true };
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/save-partial-inquiry`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(toPartialInquiryPayload(formData, language, submissionKey)),
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
