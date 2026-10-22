import recoveryMedia from "./recoveryMedia.json";

const storagePrefix = "/storage/v1/object/public/admin-media/";

export function getMediaRecoveryUrl(imageUrl) {
  if (!imageUrl) return "";

  try {
    const url = new URL(imageUrl);
    if (!url.hostname.endsWith(".supabase.co") || !url.pathname.startsWith(storagePrefix)) {
      return "";
    }

    const path = decodeURIComponent(url.pathname.slice(storagePrefix.length));
    return recoveryMedia[path] || "";
  } catch {
    return "";
  }
}

export function recoverMediaOnError(event) {
  const image = event.currentTarget;
  const recoveryUrl = getMediaRecoveryUrl(image.src);

  if (recoveryUrl) image.src = recoveryUrl;
}
