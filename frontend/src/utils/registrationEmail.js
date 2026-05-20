/**
 * Allowed registration / community guest domains (matches backend `registration_email.py`).
 * @param {string} email
 * @returns {boolean}
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

export function isConsumerGmailEmail(email) {
  const e = (email || "").trim().toLowerCase();
  const at = e.lastIndexOf("@");
  if (at < 1) return false;
  const domain = e.slice(at + 1);
  return ALLOWED.has(domain);
}

/** Same check; clearer name for new code. */
export const isAllowedRegistrationEmail = isConsumerGmailEmail;
