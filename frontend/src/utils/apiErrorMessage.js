/**
 * Build a single user-visible message from DRF / custom API error bodies.
 */
export function apiErrorMessage(data, fallback = "Request failed") {
  if (!data || typeof data !== "object") return fallback;

  const err = data.error;
  if (typeof err === "string" && err.trim()) return err;
  if (Array.isArray(err) && err.length) {
    return err.map((x) => (typeof x === "string" ? x : String(x))).join(" • ");
  }
  if (err && typeof err === "object") {
    const parts = [];
    for (const [k, v] of Object.entries(err)) {
      if (Array.isArray(v)) {
        parts.push(`${k}: ${v.map(String).join(", ")}`);
      } else if (v != null && v !== "") {
        parts.push(`${k}: ${String(v)}`);
      }
    }
    if (parts.length) return parts.join(" • ");
  }

  const detail = data.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length) {
    return detail.map((x) => (typeof x === "string" ? x : String(x))).join(" • ");
  }
  if (detail && typeof detail === "object" && !Array.isArray(detail)) {
    const detailParts = [];
    for (const [k, v] of Object.entries(detail)) {
      if (Array.isArray(v)) {
        detailParts.push(`${k}: ${v.map(String).join(", ")}`);
      } else if (v != null && v !== "") {
        detailParts.push(`${k}: ${String(v)}`);
      }
    }
    if (detailParts.length) return detailParts.join(" • ");
  }

  if (typeof data.message === "string" && data.message.trim()) {
    return data.message;
  }

  return fallback;
}
