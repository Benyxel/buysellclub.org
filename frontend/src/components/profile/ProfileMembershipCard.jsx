import React, { useCallback, useEffect, useRef, useState } from "react";
import { FaCamera, FaChevronDown, FaChevronUp, FaIdCard, FaPlus, FaSyncAlt } from "react-icons/fa";
import { Api } from "../../api";
import { toast } from "../../utils/toast";
import {
  MEMBERSHIP_TIER,
  mapMembershipCardFromApi,
  membershipTierLabel,
} from "../../utils/membershipCardStorage";
import MembershipCardVisual from "./MembershipCardVisual";

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

export default function ProfileMembershipCard({
  userId,
  memberFullName,
  isCommunityMember,
  isExecutiveMember = false,
  membershipJoinedAt = null,
  membershipExpiresAt = null,
  executiveJoinedAt = null,
  executiveExpiresAt = null,
}) {
  const fileInputRef = useRef(null);
  const [card, setCard] = useState(null);
  const [creating, setCreating] = useState(false);
  const [loadingCard, setLoadingCard] = useState(false);
  const [showCardView, setShowCardView] = useState(false);

  const isMember = isCommunityMember || isExecutiveMember;
  const activeTier = isExecutiveMember
    ? MEMBERSHIP_TIER.EXECUTIVE
    : MEMBERSHIP_TIER.COMMUNITY;

  const refreshCard = useCallback(async () => {
    if (!userId) {
      setCard(null);
      return;
    }
    setLoadingCard(true);
    try {
      const response = await Api.membershipCard.me();
      setCard(mapMembershipCardFromApi(response.data?.card));
    } catch {
      setCard(null);
    } finally {
      setLoadingCard(false);
    }
  }, [userId]);

  useEffect(() => {
    refreshCard();
  }, [refreshCard, isExecutiveMember]);

  useEffect(() => {
    if (!card?.cardId || !memberFullName) return;
    const trimmed = memberFullName.trim();
    if (!trimmed || trimmed === card.fullName) return;

    Api.membershipCard
      .update({ full_name: trimmed })
      .then((response) => {
        setCard(mapMembershipCardFromApi(response.data?.card));
      })
      .catch(() => {});
  }, [memberFullName, card?.cardId, card?.fullName]);

  const handleCreateCard = async () => {
    if (!userId) {
      toast.error("Sign in to create your membership card.");
      return;
    }
    if (!isMember) {
      toast.info("Join Community or upgrade to Executive to get a membership card.");
      return;
    }
    setCreating(true);
    try {
      const response = await Api.membershipCard.create({
        full_name: (memberFullName || "").trim() || undefined,
      });
      const created = mapMembershipCardFromApi(response.data?.card);
      if (!created) {
        throw new Error("Invalid card response");
      }
      setCard(created);
      setShowCardView(true);
      toast.success("Membership card created!");
    } catch (error) {
      const message =
        error?.response?.data?.error || "Could not create membership card. Please try again.";
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const readPhotoFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file (JPG, PNG, etc.).");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error("Photo must be 2 MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const photoDataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!photoDataUrl || !card?.cardId) return;
      try {
        const response = await Api.membershipCard.update({ photo_data_url: photoDataUrl });
        setCard(mapMembershipCardFromApi(response.data?.card));
        toast.success("Card photo updated.");
      } catch (error) {
        const message =
          error?.response?.data?.photo_data_url?.[0] ||
          error?.response?.data?.error ||
          "Could not update card photo.";
        toast.error(message);
      }
    };
    reader.onerror = () => toast.error("Could not read that image.");
    reader.readAsDataURL(file);
  };

  const openPhotoPicker = () => {
    fileInputRef.current?.click();
  };

  const toggleCardView = useCallback(() => {
    setShowCardView((prev) => !prev);
  }, []);

  const cardTier = isExecutiveMember
    ? MEMBERSHIP_TIER.EXECUTIVE
    : card?.tier || activeTier;
  const cardVisualProps = card
    ? {
        card: {
          ...card,
          tier: isExecutiveMember ? MEMBERSHIP_TIER.EXECUTIVE : cardTier,
          fullName: memberFullName || card.fullName,
          joinedAt: isExecutiveMember
            ? card.joinedAt ?? executiveJoinedAt ?? membershipJoinedAt
            : card.joinedAt ?? membershipJoinedAt,
          expiresAt: isExecutiveMember
            ? card.expiresAt ?? executiveExpiresAt ?? membershipExpiresAt
            : card.expiresAt ?? membershipExpiresAt,
        },
      }
    : null;

  if (!isMember) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-gray-600 dark:bg-gray-900/40">
        <FaIdCard className="mx-auto h-10 w-10 text-gray-400" />
        <h3 className="mt-3 text-base font-semibold text-gray-900 dark:text-white">
          Membership card
        </h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Join Community or become an Executive Member to create your digital
          membership card with a unique BSC ID.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          readPhotoFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
            Your membership card
          </h3>
        </div>
        {card ? (
          <button
            type="button"
            onClick={openPhotoPicker}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          >
            <FaCamera className="h-4 w-4" />
            Update photo
          </button>
        ) : null}
      </div>

      {loadingCard ? (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-900/40 dark:text-gray-400">
          Loading membership card…
        </div>
      ) : !card ? (
        <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-6 dark:border-gray-600 dark:from-gray-900 dark:to-gray-800">
          <div className="mx-auto max-w-sm text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FaIdCard className="h-7 w-7" />
            </div>
            <h4 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
              Create your card
            </h4>
            <button
              type="button"
              onClick={handleCreateCard}
              disabled={creating || !userId}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
            >
              {creating ? (
                <>
                  <FaSyncAlt className="h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <FaPlus className="h-4 w-4" />
                  Create membership card
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 dark:border-gray-600 dark:from-gray-900 dark:to-gray-800 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FaIdCard className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {showCardView ? "Membership card" : "Digital membership card ready"}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    Card ID{" "}
                    <span className="font-mono font-medium">{card.cardId}</span> ·{" "}
                    {membershipTierLabel(cardTier)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleCardView}
                aria-expanded={showCardView}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 sm:w-auto"
              >
                {showCardView ? (
                  <>
                    <FaChevronUp className="h-4 w-4" />
                    Collapse card
                  </>
                ) : (
                  <>
                    <FaChevronDown className="h-4 w-4" />
                    View card
                  </>
                )}
              </button>
            </div>
          </div>

          {showCardView ? (
            <div className="space-y-3">
              <MembershipCardVisual {...cardVisualProps} />
              <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                Click card to flip · Card ID{" "}
                <span className="font-mono font-medium">{card.cardId}</span> ·{" "}
                {membershipTierLabel(cardTier)}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
