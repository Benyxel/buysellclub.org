export function formatMarkIdForDisplay(markId) {
  const raw = String(markId || "").trim();
  if (!raw) return "";
  if (raw.includes("-")) return raw;
  const m = raw.match(/^([A-Za-z]+)(\d+)$/);
  if (!m) return raw;
  return `${m[1]}-${m[2]}`;
}

/** Accept both `FIM000` and `FIM-000` forms for API calls. */
export function normalizeMarkIdInput(markId) {
  const raw = String(markId || "").trim().toUpperCase();
  if (!raw) return "";
  const m = raw.match(/^([A-Z]+)-(\d+)$/);
  if (m) return `${m[1]}${m[2]}`;
  return raw;
}

/** Replace any inline mark ids like FIM000 → FIM-000 inside free-form text. */
export function formatMarkIdInText(text) {
  const raw = String(text ?? "");
  if (!raw) return "";
  return raw.replace(/\b([A-Za-z]+)(\d{1,})\b/g, (full, pfx, digits) => {
    // keep already-hyphenated tokens untouched
    if (full.includes("-")) return full;
    // only format known prefix styles (avoid changing random words+numbers)
    if (!/^[A-Za-z]{2,6}$/.test(pfx)) return full;
    return `${pfx}-${digits}`;
  });
}

