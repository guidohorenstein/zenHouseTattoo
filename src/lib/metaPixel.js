const metaPixelId = import.meta.env.VITE_META_PIXEL_ID?.trim();
let isMetaPixelReady = false;

function installMetaPixelScript() {
  if (typeof window === "undefined") return;
  if (window.fbq) return;

  /* Meta's base Pixel loader. The Pixel ID stays in env config, not in source. */
  window.fbq = function fbq() {
    if (window.fbq.callMethod) {
      window.fbq.callMethod.apply(window.fbq, arguments);
    } else {
      window.fbq.queue.push(arguments);
    }
  };

  if (!window._fbq) window._fbq = window.fbq;
  window.fbq.push = window.fbq;
  window.fbq.loaded = true;
  window.fbq.version = "2.0";
  window.fbq.queue = [];

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";

  const firstScript = document.getElementsByTagName("script")[0];
  firstScript.parentNode.insertBefore(script, firstScript);
}

export function hasMetaPixelConfig() {
  return Boolean(metaPixelId);
}

export function initMetaPixel() {
  if (!hasMetaPixelConfig() || isMetaPixelReady) return;

  installMetaPixelScript();
  window.fbq("init", metaPixelId);
  isMetaPixelReady = true;
}

export function trackMetaEvent(eventName, params = {}) {
  if (!hasMetaPixelConfig()) return;

  if (!isMetaPixelReady) {
    initMetaPixel();
  }

  window.fbq("track", eventName, params);
}
