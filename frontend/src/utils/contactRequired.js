/**
 * True when the user must provide a real phone contact.
 * Covers empty values and Google signup placeholders (google-temp-*).
 */
export function contactNeedsUpdate(contact) {
  const value = String(contact || "").trim();
  if (!value) return true;
  if (value.startsWith("google-temp-")) return true;
  if (value === "-" || value.toLowerCase() === "n/a") return true;
  return false;
}
