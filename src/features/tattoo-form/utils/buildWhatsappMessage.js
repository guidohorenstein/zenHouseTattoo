// wa.me expects the international phone number without "+" or spaces.
export const WHATSAPP_PHONE = "972547505670";
const WHATSAPP_BASE_URL = "https://wa.me";

function optionLabel(t, value) {
  return t.options[value] || value || "-";
}

function listLabels(t, values) {
  if (!values || values.length === 0) return "-";
  return values.map((value) => optionLabel(t, value)).join(", ");
}

export function buildWhatsappMessage(formData, t) {
  const labels = t.whatsapp;

  return `${labels.hello}

👤 ${labels.name}: ${formData.fullName}
📞 ${labels.phone}: ${formData.phone}
✉️ ${labels.email}: ${formData.email}

💭 ${labels.idea}: ${formData.ideaDescription || "-"}
🎨 ${labels.style}: ${optionLabel(t, formData.styles)}
⚫ ${labels.color}: ${optionLabel(t, formData.colorMode)}
📍 ${labels.generalZone}: ${optionLabel(t, formData.generalZone)}
🔎 ${labels.specificZone}: ${optionLabel(t, formData.specificZone)}
🗓️ ${labels.timing}: ${optionLabel(t, formData.timing)}
🕒 ${labels.contactTime}: ${listLabels(t, formData.contactTimes)}`;
}

export function buildWhatsappUrl(formData, t) {
  const phone = WHATSAPP_PHONE.replace(/[^\d]/g, "");

  return `${WHATSAPP_BASE_URL}/${phone}?text=${encodeURIComponent(
    buildWhatsappMessage(formData, t),
  )}`;
}
