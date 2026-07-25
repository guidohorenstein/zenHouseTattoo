export const generalZones = [
  {
    id: "torso",
    specific: ["torsoFront", "torsoBack", "torsoRibs"],
  },
  {
    id: "arm",
    specific: ["armInner", "armOuter"],
  },
  {
    id: "leg",
    specific: ["legsFront", "legBack", "legSide"],
  },
  {
    id: "hand",
    specific: ["handInner", "handOuter"],
  },
  {
    id: "face",
    specific: ["faceFront", "faceBack", "faceSide"],
  },
];

export function getSpecificZones(generalZoneId) {
  return generalZones.find((zone) => zone.id === generalZoneId)?.specific || [];
}

const imageByZone = {
  male: {
    torsoFront: "torsoFrontFace-male.png",
    torsoBack: "torsoBackFace-male.png",
    torsoRibs: "torsoRibs-male.png",
    armInner: "armInnerFace-male.png",
    armOuter: "armOuterFace-male.png",
    legsFront: "legsFrontFace-male.png",
    legBack: "legBackFace-male.png",
    legSide: "legOuterFace-male.png",
    handInner: "handInnerFace-male.png",
    handOuter: "handOuterFace-male.png",
    faceFront: "faceFront-male.png",
    faceBack: "faceBack-male.png",
    faceSide: "faceSide-male.png",
  },
  female: {
    torsoFront: "torsoFrontFace-female.png",
    torsoBack: "torsoBackFace-female.png",
    torsoRibs: "torsoRibs-female.png",
    armInner: "armInnerFace-female.png",
    armOuter: "armOuterFace-female.png",
    legsFront: "legsFrontFace-female.png",
    legBack: "legBackFace-female.png",
    legSide: "legSideFace-female.png",
    handInner: "handInnerFace-female.png",
    handOuter: "handOuterFace-female.png",
    faceFront: "faceFront-female.png",
    faceBack: "faceBack-female.png",
    faceSide: "faceSide-female.png",
  },
};

const imageByGeneralZone = {
  male: {
    torso: "torsoFrontFace-male.png",
    arm: "armOuterFace-male.png",
    leg: "legsFrontFace-male.png",
    hand: "handOuterFace-male.png",
    face: "faceFront-male.png",
  },
  female: {
    torso: "torsoFrontFace-female.png",
    arm: "armOuterFace-female.png",
    leg: "legsFrontFace-female.png",
    hand: "handOuterFace-female.png",
    face: "faceFront-female.png",
  },
};

function normalizeReference(reference) {
  return reference === "female" ? "female" : "male";
}

function imagePath(reference, fileName, useThumbnail = false) {
  const baseFolder = useThumbnail ? "body-references-thumbs" : "body-references";
  const extension = useThumbnail ? ".jpg" : "";
  const normalizedFileName = useThumbnail
    ? fileName.replace(/\.[^.]+$/, extension)
    : fileName;

  return `/images/${baseFolder}/${reference}/${normalizedFileName}`;
}

export function getBodyReferenceImageUrl(reference) {
  const normalizedReference = normalizeReference(reference);
  return imagePath(normalizedReference, `general-${normalizedReference}.png`, true);
}

export function getGeneralZoneImageUrl(generalZoneId, reference) {
  const normalizedReference = normalizeReference(reference);
  const fileName = imageByGeneralZone[normalizedReference]?.[generalZoneId];

  return fileName
    ? imagePath(normalizedReference, fileName, true)
    : getBodyReferenceImageUrl(normalizedReference);
}

export function getSpecificZoneImageUrl(specificZoneId, reference) {
  const normalizedReference = normalizeReference(reference);
  const fileName = imageByZone[normalizedReference]?.[specificZoneId];

  return fileName
    ? imagePath(normalizedReference, fileName, true)
    : getBodyReferenceImageUrl(normalizedReference);
}

export function getZoneImageUrl(formData) {
  const normalizedReference = normalizeReference(formData.bodyReference);
  const fileName = imageByZone[normalizedReference]?.[formData.specificZone];

  return fileName
    ? imagePath(normalizedReference, fileName)
    : imagePath(normalizedReference, `general-${normalizedReference}.png`);
}
