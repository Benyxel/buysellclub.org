const STORAGE_PREFIX = "bsc_membership_card_";

export const MEMBERSHIP_TIER = {
  COMMUNITY: "community",
  EXECUTIVE: "executive",
};

export function membershipTierLabel(tier) {
  if (tier === MEMBERSHIP_TIER.EXECUTIVE) return "Executive Member";
  return "Community Member";
}

export function formatMembershipDate(isoDate) {
  if (!isoDate) return "—";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Uppercase card style e.g. "19 MAY 2024" */
export function formatMembershipCardDate(isoDate) {
  if (!isoDate) return "—";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "—";
  const parts = date
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace(",", "")
    .split(" ");
  if (parts.length !== 3) return formatMembershipDate(isoDate).toUpperCase();
  return `${parts[0]} ${parts[1].toUpperCase()} ${parts[2]}`;
}

/** Valid thru on card; permanent members (e.g. admin) have no expiry date. */
export function formatMembershipCardExpiry(isoDate) {
  if (!isoDate) return "NO EXPIRY";
  return formatMembershipCardDate(isoDate);
}

/** Map API membership card payload to frontend card shape. */
export function mapMembershipCardFromApi(data) {
  if (!data?.card_id) return null;
  return {
    cardId: data.card_id,
    fullName: data.full_name || "Member",
    tier:
      data.tier === MEMBERSHIP_TIER.EXECUTIVE
        ? MEMBERSHIP_TIER.EXECUTIVE
        : MEMBERSHIP_TIER.COMMUNITY,
    photoDataUrl: data.photo_data_url || "",
    joinedAt: data.joined_at || null,
    expiresAt: data.expires_at || null,
    createdAt: data.created_at || null,
    updatedAt: data.updated_at || null,
  };
}

/** Generate BSC-######## (8 digits). Used client-side only before backend existed. */
export function generateMembershipCardId() {
  const n = Math.floor(10000000 + Math.random() * 90000000);
  return `BSC-${n}`;
}

function storageKey(userId) {
  return `${STORAGE_PREFIX}${userId || "guest"}`;
}

export function loadMembershipCard(userId) {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.cardId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveMembershipCard(userId, card) {
  if (typeof window === "undefined" || !userId || !card?.cardId) return null;
  const payload = {
    ...card,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(storageKey(userId), JSON.stringify(payload));
  return payload;
}

export function createMembershipCard({ userId, fullName, tier, photoDataUrl = "" }) {
  const card = {
    cardId: generateMembershipCardId(),
    fullName: (fullName || "").trim() || "Member",
    tier: tier === MEMBERSHIP_TIER.EXECUTIVE ? MEMBERSHIP_TIER.EXECUTIVE : MEMBERSHIP_TIER.COMMUNITY,
    photoDataUrl: photoDataUrl || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return saveMembershipCard(userId, card);
}
