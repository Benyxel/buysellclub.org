/**
 * Compact social-style counts (YouTube / TikTok): 1k, 1.5k, 11.1k, 1M, 1.2B
 * @param {number|string} value
 * @returns {string}
 */
export function formatCompactCount(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return "0";
  if (num < 1000) return String(Math.floor(num));

  const trim = (n) => {
    const rounded = Math.round(n * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  };

  if (num < 1_000_000) return `${trim(num / 1000)}k`;
  if (num < 1_000_000_000) return `${trim(num / 1_000_000)}M`;
  return `${trim(num / 1_000_000_000)}B`;
}
