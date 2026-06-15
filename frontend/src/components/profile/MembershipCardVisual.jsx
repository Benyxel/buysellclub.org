import React, { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { FaStar, FaUsers } from "react-icons/fa";
import buysellLogoSrc from "../../assets/buysellt.png";
import {
  BRAND_GOLD,
  BRAND_GOLD_LIGHT,
  BRAND_SILVER,
  BRAND_SILVER_LIGHT,
  LOGO_PINK,
  LOGO_PINK_DARK,
  LOGO_PINK_DEEP,
  LOGO_PINK_LIGHT,
  LOGO_PINK_RGB,
} from "../../constants/brandColors";
import {
  formatMembershipCardDate,
  formatMembershipCardExpiry,
  membershipTierLabel,
  MEMBERSHIP_TIER,
} from "../../utils/membershipCardStorage";

const LOGO_SRC = buysellLogoSrc;
const LOGO_PATTERN_SIZE = 16;
const LOGO_PATTERN_OPACITY = 0.035;
const LOGO_WATERMARK_OFFSET_X = 70;
const LOGO_HERO_WATERMARK_OPACITY = 0.14;
const LOGO_HERO_WATERMARK_HEIGHT = "68%";

const SHARP_TEXT =
  "subpixel-antialiased [text-rendering:geometricPrecision] [-webkit-font-smoothing:auto]";

function useMobileCardLayout() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return isMobile;
}

function getTierTheme(isExecutive) {
  const pinkBase = {
    accent: LOGO_PINK,
    accentLight: LOGO_PINK_LIGHT,
    accentDark: LOGO_PINK_DARK,
    nameColor: LOGO_PINK,
    waveStop0: LOGO_PINK_LIGHT,
    waveStop55: LOGO_PINK,
    waveStop100: LOGO_PINK_DARK,
    fieldBorder: `rgba(${LOGO_PINK_RGB}, 0.35)`,
    fieldBg: "#120810",
    headerBorder: `rgba(${LOGO_PINK_RGB}, 0.28)`,
    headerBg: "#0a080a",
    logoBoxBorder: `rgba(${LOGO_PINK_RGB}, 0.45)`,
    logoBoxBg: `rgba(${LOGO_PINK_RGB}, 0.14)`,
    baseFrom: "#0a080a",
    baseVia: "#060606",
    baseTo: "#0c060a",
    glowLeft: `rgba(${LOGO_PINK_RGB}, 0.28)`,
    glowRight: `rgba(${LOGO_PINK_RGB}, 0.18)`,
    cardShadow: `0 30px 60px -18px rgba(0,0,0,0.85), 0 20px 40px -10px rgba(${LOGO_PINK_RGB}, 0.45), inset 0 1px 0 rgba(255,255,255,0.35), inset 0 0 0 1px rgba(${LOGO_PINK_RGB}, 0.2)`,
    waveFilter: `drop-shadow(0 -10px 24px rgba(${LOGO_PINK_RGB}, 0.5))`,
    photoShadow: `0 0 16px rgba(${LOGO_PINK_RGB}, 0.55), 0 10px 24px rgba(0,0,0,0.5)`,
    photoRing: `linear-gradient(145deg, ${LOGO_PINK_LIGHT}, ${LOGO_PINK})`,
    photoOuterBorder: LOGO_PINK,
    cardBorder: "border-[#FF008A]/25",
    backGlowFrom: `rgba(${LOGO_PINK_RGB}, 0.2)`,
    backGlowTo: `rgba(${LOGO_PINK_RGB}, 0.12)`,
    backInnerBorder: `rgba(${LOGO_PINK_RGB}, 0.22)`,
    backWatermark: `rgba(${LOGO_PINK_RGB}, 0.1)`,
    siteTextColor: LOGO_PINK_LIGHT,
    bannerFrom: LOGO_PINK_DEEP,
    bannerVia: LOGO_PINK,
    bannerTo: LOGO_PINK_DEEP,
    sceneGlow1: `rgba(${LOGO_PINK_RGB}, 0.35)`,
    sceneGlow2: `rgba(${LOGO_PINK_RGB}, 0.22)`,
    sceneGlow3: `rgba(${LOGO_PINK_RGB}, 0.14)`,
    sceneBg: "from-[#0c080a] via-[#060606] to-[#0a0608]",
    focusRing: "focus-visible:ring-zinc-300",
    focusOffset: "focus-visible:ring-offset-[#0a080a]",
  };

  if (isExecutive) {
    return {
      ...pinkBase,
      waveStop0: LOGO_PINK_DEEP,
      waveStop55: LOGO_PINK_DARK,
      waveStop100: LOGO_PINK,
      stripe: BRAND_GOLD,
      stripeLight: BRAND_GOLD_LIGHT,
      dividerGlow: "rgba(253,198,46,0.85)",
      backBorder: "border-brandYellow/28",
      iconClass: "text-brandYellow",
      focusRing: "focus-visible:ring-brandYellow",
      focusOffset: "focus-visible:ring-offset-[#0a080a]",
    };
  }

  return {
    ...pinkBase,
    stripe: BRAND_SILVER,
    stripeLight: BRAND_SILVER_LIGHT,
    dividerGlow: "rgba(197,202,211,0.9)",
    backBorder: "border-white/20",
    iconClass: "text-zinc-300",
  };
}

function CardField({ label, value, theme }) {
  return (
    <div
      className="flex min-h-[3.25rem] flex-col rounded-lg px-2 py-1.5 sm:min-h-[3.5rem] sm:px-2.5"
      style={{
        border: `1px solid ${theme.fieldBorder}`,
        backgroundColor: theme.fieldBg,
      }}
    >
      <p className={`text-[9px] font-semibold uppercase tracking-wide text-zinc-300 ${SHARP_TEXT}`}>
        {label}
      </p>
      <p
        className={`mt-auto truncate text-[10px] font-bold uppercase leading-snug text-white sm:text-[11px] ${SHARP_TEXT}`}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

function CardLogoPattern() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0"
      aria-hidden
      style={{
        backgroundImage: `url(${LOGO_SRC})`,
        backgroundRepeat: "repeat",
        backgroundSize: `${LOGO_PATTERN_SIZE}px ${LOGO_PATTERN_SIZE}px`,
        backgroundPosition: `${LOGO_WATERMARK_OFFSET_X}px 0`,
        opacity: LOGO_PATTERN_OPACITY,
      }}
    />
  );
}

function CardHeroWatermark() {
  return (
    <img
      src={LOGO_SRC}
      alt=""
      aria-hidden
      className="pointer-events-none absolute top-1/2 z-0 w-auto max-w-none select-none object-contain"
      style={{
        height: LOGO_HERO_WATERMARK_HEIGHT,
        left: `calc(50% + ${LOGO_WATERMARK_OFFSET_X}px)`,
        transform: "translate(-50%, -50%)",
        opacity: LOGO_HERO_WATERMARK_OPACITY,
      }}
    />
  );
}

function CardFront({
  card,
  compact,
  isExecutive,
  tierTitle,
  memberName,
  qrValue,
  waveGradientId,
  logoSrc,
  theme,
}) {
  return (
    <div
      className={`relative h-full overflow-hidden rounded-2xl border ${theme.cardBorder}`}
      style={{ boxShadow: theme.cardShadow }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom right, ${theme.baseFrom}, ${theme.baseVia}, ${theme.baseTo})`,
        }}
      />
      <div
        className="pointer-events-none absolute -left-8 bottom-[28%] h-40 w-40 rounded-full blur-3xl"
        style={{ backgroundColor: theme.glowLeft }}
      />
      <div
        className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full blur-2xl"
        style={{ backgroundColor: theme.glowRight }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.12] via-transparent to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
      <CardLogoPattern />
      <CardHeroWatermark />

      <div className={`relative z-10 flex h-full flex-col px-4 pb-[4.5rem] pt-3.5 sm:px-5 sm:pb-20 sm:pt-4 ${SHARP_TEXT}`}>
        <div
          className="flex items-start justify-between gap-2 rounded-xl border px-2.5 py-2 sm:px-3"
          style={{
            borderColor: theme.headerBorder,
            backgroundColor: theme.headerBg,
          }}
        >
          <div className="flex min-w-0 items-start gap-2 sm:gap-2.5">
            <div
              className="mt-0.5 rounded-lg border p-1"
              style={{
                borderColor: theme.logoBoxBorder,
                backgroundColor: theme.logoBoxBg,
              }}
            >
              <img
                src={logoSrc}
                alt=""
                className="h-6 w-6 shrink-0 object-contain sm:h-7 sm:w-7"
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-extrabold tracking-wide">
                <span className="text-white">BUYSELL</span>
                <span style={{ color: theme.nameColor }}>CLUB</span>
              </p>
              <p className="mt-0.5 text-[9px] font-medium uppercase leading-snug tracking-wide text-zinc-300">
                Buy smart. Sell more. Ship anywhere.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden h-8 w-px bg-white/35 sm:block" aria-hidden />
            <p className="text-[10px] font-bold uppercase tracking-wide text-white">
              Membership
              <br />
              Card
            </p>
          </div>
        </div>

        <div className="mt-3 flex min-h-0 flex-1 items-start justify-between gap-3 sm:mt-4">
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-lg font-extrabold uppercase tracking-wide sm:text-xl"
              style={{ color: theme.nameColor }}
            >
              {memberName}
            </p>

            <div className="mt-3 grid grid-cols-3 gap-1.5 sm:mt-4 sm:gap-2">
              <CardField label="Member ID" value={card.cardId} theme={theme} />
              <CardField
                label="Member since"
                value={formatMembershipCardDate(card.joinedAt)}
                theme={theme}
              />
              <CardField
                label="Valid thru"
                value={formatMembershipCardExpiry(card.expiresAt)}
                theme={theme}
              />
            </div>
          </div>

          <div className="shrink-0">
            <div
              className="h-[4.5rem] w-[4.5rem] overflow-hidden rounded-xl p-0.5 sm:h-24 sm:w-24"
              style={{
                border: `2px solid ${theme.photoOuterBorder}`,
                background: theme.photoRing,
                boxShadow: theme.photoShadow,
              }}
            >
              <div className="h-full w-full overflow-hidden rounded-[0.6rem] bg-black">
                {card.photoDataUrl ? (
                  <img
                    src={card.photoDataUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-[10px] font-medium uppercase tracking-wide text-white/50">
                    Photo
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[34%] sm:h-[32%]">
        <svg
          className="absolute inset-0 h-full w-full"
          style={{ filter: theme.waveFilter }}
          viewBox="0 0 400 120"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <linearGradient id={waveGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={theme.waveStop0} />
              <stop offset="55%" stopColor={theme.waveStop55} />
              <stop offset="100%" stopColor={theme.waveStop100} />
            </linearGradient>
          </defs>
          <path
            d="M0,52 C90,18 170,78 260,44 C320,20 360,36 400,28 L400,120 L0,120 Z"
            fill={`url(#${waveGradientId})`}
          />
          <path
            d="M0,52 C90,18 170,78 260,44 C320,20 360,36 400,28"
            fill="none"
            stroke={theme.stripeLight}
            strokeWidth="1.5"
            opacity="0.55"
          />
          <path
            d="M0,52 C90,18 170,78 260,44 C320,20 360,36 400,28"
            fill="none"
            stroke={theme.stripe}
            strokeWidth="2.75"
            style={{ filter: `drop-shadow(0 0 4px ${theme.dividerGlow})` }}
          />
        </svg>

        <div className={`absolute bottom-3 left-4 z-10 flex items-center gap-2 sm:bottom-4 sm:left-5 ${SHARP_TEXT}`}>
          {isExecutive ? (
            <FaStar className={`h-4 w-4 sm:h-5 sm:w-5 ${theme.iconClass}`} />
          ) : (
            <FaUsers className={`h-4 w-4 sm:h-5 sm:w-5 ${theme.iconClass}`} />
          )}
          <div>
            <p className="text-base font-extrabold uppercase leading-none tracking-wide text-white">
              {tierTitle}
            </p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              — Member —
            </p>
          </div>
        </div>

        <div className="absolute bottom-2.5 right-3 rounded-lg border-2 border-white bg-white p-1 shadow-[0_8px_20px_rgba(0,0,0,0.45)] sm:bottom-3 sm:right-4 sm:p-1.5">
          <QRCodeSVG
            value={qrValue}
            size={compact ? 44 : 52}
            level="M"
            bgColor="#ffffff"
            fgColor="#000000"
            className="block h-auto w-auto"
          />
        </div>
      </div>
    </div>
  );
}

function CardBack({ card, compact, memberName, qrValue, tierLabel, logoSrc, theme }) {
  const isMobile = useMobileCardLayout();
  const qrSize = isMobile ? 52 : compact ? 84 : 100;

  return (
    <div
      className={`relative h-full min-h-0 overflow-hidden rounded-2xl border ${theme.backBorder}`}
      style={{
        boxShadow: `0 24px 48px -16px rgba(0,0,0,0.85), inset 0 0 0 1px ${theme.backInnerBorder}`,
      }}
    >
      <div className="absolute inset-0 bg-[#080808]" />
      <CardLogoPattern />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, ${theme.backGlowFrom}, transparent, ${theme.backGlowTo})`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-2 rounded-lg sm:inset-4 sm:rounded-xl"
        style={{ border: `1px solid ${theme.backInnerBorder}` }}
      />

      <div className={`relative z-10 flex h-full min-h-0 flex-col ${SHARP_TEXT}`}>
        <div className="flex shrink-0 flex-col items-center pt-2 sm:pt-4">
          <img src={logoSrc} alt="" className="h-4 w-4 object-contain sm:h-6 sm:w-6" />
          <p
            className="mt-0.5 text-[9px] font-semibold sm:mt-1 sm:text-[11px]"
            style={{ color: theme.siteTextColor }}
          >
            BuySellClub.org
          </p>
        </div>

        <div
          className="mt-1 shrink-0 px-3 py-1.5 text-center sm:mt-2 sm:px-4 sm:py-3"
          style={{
            background: `linear-gradient(to right, ${theme.bannerFrom}, ${theme.bannerVia}, ${theme.bannerTo})`,
            borderTop: `2.5px solid ${theme.stripe}`,
            boxShadow: `inset 0 1px 0 ${theme.dividerGlow}`,
          }}
        >
          <p className="text-[11px] font-extrabold uppercase tracking-wide sm:text-base">
            <span className="text-white">BUYSELL</span>
            <span style={{ color: theme.nameColor }}>CLUB</span>
          </p>
          <p className="mt-0.5 text-[7px] font-semibold uppercase tracking-wide text-white sm:text-[10px]">
            Official digital membership
          </p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-3 pb-2 pt-1 text-center sm:px-8 sm:pb-6 sm:pt-3">
          <div className="shrink-0 rounded-xl bg-white p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.45)] sm:rounded-2xl sm:p-3">
            <QRCodeSVG
              value={qrValue}
              size={qrSize}
              level="M"
              bgColor="#ffffff"
              fgColor="#000000"
              className="block h-auto w-auto"
            />
          </div>

          <p className="mt-1.5 w-full truncate font-mono text-[11px] font-bold tracking-wider text-white sm:mt-4 sm:text-base">
            {card.cardId}
          </p>
          <p
            className="mt-0.5 w-full truncate text-[11px] font-extrabold uppercase tracking-wide sm:mt-1.5 sm:text-base"
            style={{ color: theme.nameColor }}
            title={memberName}
          >
            {memberName}
          </p>
          <p className="mt-1 w-full px-1 text-[8px] leading-snug text-zinc-300 sm:mt-3 sm:text-[11px]">
            {tierLabel}
            <span className="mx-1" aria-hidden>
              ·
            </span>
            Valid thru {formatMembershipCardExpiry(card.expiresAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function MembershipCardVisual({ card, compact = false }) {
  const [isFlipped, setIsFlipped] = useState(false);

  const toggleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleFlip();
      }
    },
    [toggleFlip],
  );

  if (!card) return null;

  const isExecutive = card.tier === MEMBERSHIP_TIER.EXECUTIVE;
  const tierTitle = isExecutive ? "EXECUTIVE" : "COMMUNITY";
  const tierLabel = membershipTierLabel(card.tier);
  const memberName = (card.fullName || "Member").trim().toUpperCase();
  const qrValue = card.cardId || "BSC";
  const waveGradientId = `wave-${card.cardId || "bsc"}`;
  const theme = getTierTheme(isExecutive);

  return (
    <div className={`mx-auto ${compact ? "max-w-sm" : "max-w-lg"}`}>
      <div
        className={`relative overflow-hidden rounded-[1.35rem] p-2 sm:p-4 bg-gradient-to-br ${theme.sceneBg}`}
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div
            className="absolute -left-6 top-0 h-36 w-36 rounded-full blur-3xl"
            style={{ backgroundColor: theme.sceneGlow1 }}
          />
          <div
            className="absolute bottom-0 right-0 h-40 w-40 rounded-full blur-3xl"
            style={{ backgroundColor: theme.sceneGlow2 }}
          />
          <div
            className="absolute bottom-[18%] left-[40%] h-24 w-24 rounded-full blur-2xl"
            style={{ backgroundColor: theme.sceneGlow3 }}
          />
        </div>

        <div
          className="pointer-events-none absolute inset-x-8 bottom-4 h-[65%] rounded-2xl bg-black/70 blur-2xl"
          aria-hidden
        />

        <div className="relative w-full" style={{ perspective: "1000px" }}>
          <button
            type="button"
            onClick={toggleFlip}
            onKeyDown={handleKeyDown}
            aria-label={isFlipped ? "Show front of membership card" : "Show back of membership card"}
            aria-pressed={isFlipped}
            className={`relative block w-full cursor-pointer border-0 bg-transparent p-0 text-left outline-none focus-visible:rounded-2xl focus-visible:ring-2 ${theme.focusRing} focus-visible:ring-offset-2 ${theme.focusOffset}`}
            style={{ aspectRatio: "1.586 / 1" }}
          >
            <div
              className="relative h-full w-full transition-transform duration-700 ease-in-out"
              style={{
                transformStyle: "preserve-3d",
                transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                WebkitFontSmoothing: "subpixel-antialiased",
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "translateZ(1px)",
                }}
              >
                <CardFront
                  card={card}
                  compact={compact}
                  isExecutive={isExecutive}
                  tierTitle={tierTitle}
                  memberName={memberName}
                  qrValue={qrValue}
                  waveGradientId={waveGradientId}
                  logoSrc={LOGO_SRC}
                  theme={theme}
                />
              </div>

              <div
                className="absolute inset-0"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg) translateZ(1px)",
                }}
              >
                <CardBack
                  card={card}
                  compact={compact}
                  memberName={memberName}
                  qrValue={qrValue}
                  tierLabel={tierLabel}
                  logoSrc={LOGO_SRC}
                  theme={theme}
                />
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
