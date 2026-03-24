// Phone helpers.
// Ghana convenience: 10-digit local starting with 0, or 233 / +233.
// Foreign numbers: require international format +<digits> (or 00 prefix).

export function normalizePhone(raw) {
  if (raw == null) return { ok: false, error: "Contact number is required." };
  let s = String(raw).trim();
  if (!s) return { ok: false, error: "Contact number is required." };

  // Remove separators; keep leading '+'
  s = s.replace(/[^\d+]/g, "");

  // Convert leading 00 to +
  if (s.startsWith("00")) s = `+${s.slice(2)}`;

  if (s.startsWith("+")) {
    const digits = s.slice(1);
    if (!/^\d+$/.test(digits)) return { ok: false, error: "Please enter a valid contact number." };
    if (digits.length < 8 || digits.length > 15) {
      return { ok: false, error: "Please enter a valid international number (e.g. +233551234567)." };
    }
    // Ghana-specific strictness when using +233
    if (digits.startsWith("233") && digits.length !== 12) {
      return { ok: false, error: "Ghana number must be 10 digits locally or +233 followed by 9 digits." };
    }
    return { ok: true, normalized: `+${digits}` };
  }

  if (!/^\d+$/.test(s)) return { ok: false, error: "Please enter a valid contact number." };

  if (s.startsWith("233")) {
    if (s.length !== 12) {
      return { ok: false, error: "Ghana number must be 10 digits locally or 233 followed by 9 digits." };
    }
    return { ok: true, normalized: `+${s}` };
  }

  if (s.length === 10 && s.startsWith("0")) {
    return { ok: true, normalized: `+233${s.slice(1)}` };
  }

  return { ok: false, error: "Please enter your number in international format (e.g. +1..., +44..., +233...)."};
}

