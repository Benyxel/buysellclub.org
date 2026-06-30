export const FIFA_2026_INTRO = {
  sessionKey: "fifa2026_intro_seen",
  activeFrom: "2026-06-01",
  activeUntil: "2026-07-19",
  kicker: "Black Stars",
  title: "GHANA",
  subtitle: "WORLD CUP 2026",
  tagline: "Go Black Stars!",
  brandLine: "Fofoofo Imports · Proudly Ghanaian",
  durationMs: 4800,
  skipDelayMs: 300,
};

function toLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isFifa2026IntroActive(date = new Date()) {
  const key = toLocalDateKey(date);
  return key >= FIFA_2026_INTRO.activeFrom && key <= FIFA_2026_INTRO.activeUntil;
}

export function hasSeenFifa2026Intro() {
  if (typeof window === "undefined") return true;
  try {
    return sessionStorage.getItem(FIFA_2026_INTRO.sessionKey) === "1";
  } catch {
    return true;
  }
}

export function markFifa2026IntroSeen() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(FIFA_2026_INTRO.sessionKey, "1");
  } catch {
    // ignore quota / private mode errors
  }
}

export function shouldShowFifa2026Intro(date = new Date()) {
  return isFifa2026IntroActive(date) && !hasSeenFifa2026Intro();
}

export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
