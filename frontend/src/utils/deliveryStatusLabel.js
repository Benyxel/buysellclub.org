/**
 * Human-readable labels for DeliveryRequest.status (API snake_case).
 */
export function formatDeliveryRequestStatusLabel(status) {
  const s = String(status || "").trim();
  if (s === "in_progress") return "On his way";
  if (!s) return "";
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
