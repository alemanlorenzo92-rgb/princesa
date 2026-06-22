export interface DeferredInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

declare global {
  interface Window {
    __PRINCESA_INSTALL_PROMPT__?: DeferredInstallPromptEvent;
  }

  interface Navigator {
    standalone?: boolean;
  }
}

export function isStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

export function isIosDevice() {
  if (typeof window === "undefined") {
    return false;
  }

  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function isMobileDevice() {
  if (typeof window === "undefined") {
    return false;
  }

  return /android|iphone|ipad|ipod|mobile/i.test(window.navigator.userAgent);
}
