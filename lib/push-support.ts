export type PushSetupState =
  | "not_configured"
  | "unsupported"
  | "ios_install"
  | "prompt"
  | "denied"
  | "subscribed";

export type PushSetupInput = {
  configured: boolean;
  notificationSupported: boolean;
  pushManagerSupported: boolean;
  serviceWorkerSupported: boolean;
  isIos: boolean;
  isStandalone: boolean;
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
};

export function isIosUserAgent(userAgent: string, maxTouchPoints = 0): boolean {
  if (/iPad|iPhone|iPod/i.test(userAgent)) return true;
  // iPadOS can report as Macintosh.
  return /Macintosh/i.test(userAgent) && maxTouchPoints > 1;
}

export function isStandaloneDisplay(input: {
  displayModeStandalone: boolean;
  iosNavigatorStandalone: boolean;
}): boolean {
  return input.displayModeStandalone || input.iosNavigatorStandalone;
}

/**
 * Which UI to show for lock-screen / home-screen alerts.
 * iPhone/iPad only receive Web Push after the PWA is opened from Home Screen.
 */
export function getPushSetupState(input: PushSetupInput): PushSetupState {
  if (!input.configured) return "not_configured";
  if (!input.notificationSupported || !input.serviceWorkerSupported) {
    return "unsupported";
  }
  if (input.isIos && !input.isStandalone) return "ios_install";
  if (!input.pushManagerSupported) return "unsupported";
  if (input.permission === "denied") return "denied";
  if (input.subscribed && input.permission === "granted") return "subscribed";
  return "prompt";
}

export function readPushEnvFromBrowser(): Omit<
  PushSetupInput,
  "configured" | "subscribed" | "permission"
> & { permission: NotificationPermission | "unsupported" } {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      notificationSupported: false,
      pushManagerSupported: false,
      serviceWorkerSupported: false,
      isIos: false,
      isStandalone: false,
      permission: "unsupported",
    };
  }

  const standaloneMatch =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches;
  const iosStandalone =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  return {
    notificationSupported: "Notification" in window,
    pushManagerSupported: "PushManager" in window,
    serviceWorkerSupported: "serviceWorker" in navigator,
    isIos: isIosUserAgent(navigator.userAgent, navigator.maxTouchPoints ?? 0),
    isStandalone: isStandaloneDisplay({
      displayModeStandalone: standaloneMatch,
      iosNavigatorStandalone: iosStandalone,
    }),
    permission:
      "Notification" in window ? Notification.permission : "unsupported",
  };
}
