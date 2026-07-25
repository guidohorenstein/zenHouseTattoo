// Replace this placeholder with the real studio WhatsApp number.
export const WHATSAPP_PHONE = "549XXXXXXXXXX";

function optionLabel(t, value) {
  return t.options[value] || value || "-";
}

function listLabels(t, values) {
  return values.map((value) => optionLabel(t, value)).join(", ");
}

function placementText(labels, boxes) {
  if (boxes.length === 0) return "-";

  // Later this should be replaced by the storage URL of the marked body image.
  return `${boxes.length} ${labels.mark}`;
}

function referenceImagesText(images) {
  if (!images || images.length === 0) return "-";
  return images.map((image) => image.name).join(", ");
}

function referenceLinksText(links) {
  const cleanLinks = (links || []).map((link) => link.trim()).filter(Boolean);
  if (cleanLinks.length === 0) return "-";
  return cleanLinks.join("\n");
}

export function buildWhatsappMessage(formData, t) {
  const labels = t.whatsapp;

  return `${labels.hello}

${labels.name}: ${formData.fullName}
${labels.email}: ${formData.email}
${labels.phone}: ${formData.phone}
${labels.idea}: ${formData.ideaDescription || "-"}
${labels.referenceLinks}:
${referenceLinksText(formData.referenceLinks)}
${labels.referenceImages}: ${referenceImagesText(formData.referenceImages)}
${labels.style}: ${listLabels(t, formData.styles)}
${labels.color}: ${optionLabel(t, formData.colorMode)}
${labels.bodyReference}: ${optionLabel(t, formData.bodyReference)}
${labels.generalZone}: ${optionLabel(t, formData.generalZone)}
${labels.specificZone}: ${optionLabel(t, formData.specificZone)}
${labels.placement}:
${placementText(t, formData.placementBoxes)}
${labels.timing}: ${optionLabel(t, formData.timing)}
${labels.contactTime}: ${listLabels(t, formData.contactTimes)}
${labels.hasTattoos}: ${optionLabel(t, formData.hasTattoos)}`;
}

export function buildWhatsappUrl(formData, t) {
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
    buildWhatsappMessage(formData, t)
  )}`;
}
