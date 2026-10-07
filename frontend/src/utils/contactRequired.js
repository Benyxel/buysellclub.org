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

/** Pull a readable message out of a contact-save error payload. */
export function contactSaveError(
  data,
  fallback = "Failed to save contact. Please try again."
) {
  const contact = data?.contact;
  if (Array.isArray(contact) && contact.length) return String(contact[0]);
  if (typeof contact === "string" && contact.trim()) return contact;
  const detail = data?.detail;
  if (Array.isArray(detail) && detail.length) return String(detail[0]);
  if (typeof detail === "string" && detail.trim()) return detail;
  if (typeof data?.error === "string" && data.error.trim()) return data.error;
  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  return fallback;
}
