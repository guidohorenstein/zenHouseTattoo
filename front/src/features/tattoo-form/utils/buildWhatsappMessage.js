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

  return boxes
    .map(
      (box, index) =>
        `${labels.mark} ${index + 1}: x: ${box.x}%, y: ${box.y}%, width: ${box.width}%, height: ${box.height}%`
    )
    .join("\n");
}

function referenceImagesText(images) {
  if (!images || images.length === 0) return "-";
  return images.map((image) => image.name).join(", ");
}

export function buildWhatsappMessage(formData, t) {
  const labels = t.whatsapp;

  return `${labels.hello}

${labels.name}: ${formData.fullName}
${labels.phone}: ${formData.phone}
${labels.bodyReference}: ${optionLabel(t, formData.bodyReference)}
${labels.hasTattoos}: ${optionLabel(t, formData.hasTattoos)}
${labels.generalZone}: ${optionLabel(t, formData.generalZone)}
${labels.specificZone}: ${optionLabel(t, formData.specificZone)}
${labels.placement}:
${placementText(t, formData.placementBoxes)}
${labels.style}: ${listLabels(t, formData.styles)}
${labels.color}: ${optionLabel(t, formData.colorMode)}
${labels.idea}: ${formData.ideaDescription}
${labels.referenceImages}: ${referenceImagesText(formData.referenceImages)}
${labels.timing}: ${optionLabel(t, formData.timing)}
${labels.contactTime}: ${listLabels(t, formData.contactTimes)}`;
}

export function buildWhatsappUrl(formData, t) {
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
    buildWhatsappMessage(formData, t)
  )}`;
}
