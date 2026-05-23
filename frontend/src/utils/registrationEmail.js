/**
 * Allowed registration / community guest domains (matches backend `registration_email.py`).
 */

const ALLOWED = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.de",
  "yahoo.fr",
  "yahoo.es",
  "yahoo.it",
  "yahoo.nl",
  "yahoo.be",
  "yahoo.at",
  "yahoo.ch",
  "yahoo.ie",
  "yahoo.pl",
  "yahoo.ro",
  "yahoo.gr",
  "yahoo.pt",
  "yahoo.dk",
  "yahoo.fi",
  "yahoo.no",
  "yahoo.se",
  "yahoo.ca",
  "yahoo.com.au",
  "yahoo.com.br",
  "yahoo.com.mx",
  "yahoo.com.ar",
  "yahoo.co.jp",
  "yahoo.co.in",
  "yahoo.in",
  "yahoo.co.id",
  "yahoo.co.kr",
  "yahoo.co.nz",
  "yahoo.co.za",
  "yahoo.co.th",
  "yahoo.com.sg",
  "yahoo.com.hk",
  "yahoo.com.tw",
  "yahoo.com.ph",
  "yahoo.com.my",
  "yahoo.com.vn",
  "yahoo.com.kh",
  "yahoo.com.bn",
  "yahoo.com.pe",
  "yahoo.com.co",
  "yahoo.com.ec",
  "yahoo.com.uy",
  "yahoo.com.py",
  "yahoo.com.bo",
  "yahoo.com.ve",
  "yahoo.cl",
  "yahoo.cat",
  "ymail.com",
  "rocketmail.com",
  "icloud.com",
  "me.com",
  "mac.com",
]);

/** @type {Record<string, string>} */
const DOMAIN_TYPOS = {
  "gmail.con": "gmail.com",
  "gmail.cmo": "gmail.com",
  "gmail.comm": "gmail.com",
  "gmail.comn": "gmail.com",
  "gmail.coom": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmail.co": "gmail.com",
  "gmial.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gnail.com": "gmail.com",
  "googlemail.con": "googlemail.com",
  "googlemail.cmo": "googlemail.com",
  "yahoo.con": "yahoo.com",
  "yahoo.cmo": "yahoo.com",
  "yahoo.comm": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yaho.com": "yahoo.com",
  "ymail.con": "ymail.com",
  "rocketmail.con": "rocketmail.com",
  "icloud.con": "icloud.com",
  "icloud.cmo": "icloud.com",
  "icloud.comm": "icloud.com",
  "me.con": "me.com",
  "mac.con": "mac.com",
};

const TLD_TYPO_REPLACEMENTS = [
  [".con", ".com"],
  [".cmo", ".com"],
  [".comm", ".com"],
  [".comn", ".com"],
  [".coom", ".com"],
  [".cm", ".com"],
];

export function normalizeRegistrationEmail(email) {
  return (email || "").trim().toLowerCase().replace(/\.+$/, "");
}

export function isConsumerGmailEmail(email) {
  const e = normalizeRegistrationEmail(email);
  const at = e.lastIndexOf("@");
  if (at < 1) return false;
  const domain = e.slice(at + 1);
  return ALLOWED.has(domain);
}

/** Same check; clearer name for new code. */
export const isAllowedRegistrationEmail = isConsumerGmailEmail;

/**
 * @param {string} email
 * @returns {string|null} Corrected full email if domain looks like a typo
 */
export function suggestRegistrationEmailCorrection(email) {
  const e = normalizeRegistrationEmail(email);
  const at = e.lastIndexOf("@");
  if (at < 1) return null;
  const local = e.slice(0, at);
  const domain = e.slice(at + 1);
  if (ALLOWED.has(domain)) return null;

  const mapped = DOMAIN_TYPOS[domain];
  if (mapped && ALLOWED.has(mapped)) {
    return `${local}@${mapped}`;
  }

  for (const [wrong, right] of TLD_TYPO_REPLACEMENTS) {
    if (domain.endsWith(wrong)) {
      const candidate = domain.slice(0, -wrong.length) + right;
      if (ALLOWED.has(candidate)) {
        return `${local}@${candidate}`;
      }
    }
  }
  return null;
}

/**
 * @param {string} email
 * @returns {string|null} Error message, or null if email is allowed
 */
export function registrationEmailError(email) {
  const normalized = normalizeRegistrationEmail(email);
  if (!normalized) return "Email address is required.";
  if (!normalized.includes("@")) return "Please enter a valid email address.";
  if (isConsumerGmailEmail(normalized)) return null;

  const suggestion = suggestRegistrationEmailCorrection(normalized);
  if (suggestion) {
    return `Did you mean ${suggestion}? Check the domain spelling (for example .com, not .con).`;
  }
  return "Use Gmail, Yahoo, or Apple mail (e.g. @gmail.com, @yahoo.com, @icloud.com).";
}
