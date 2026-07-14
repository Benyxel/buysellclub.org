import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FaImage,
  FaChevronLeft,
  FaStar,
  FaHeart,
  FaRegHeart,
  FaInfoCircle,
  FaMoneyBillWave,
  FaUpload,
  FaCheckCircle,
  FaTimes,
} from "react-icons/fa";
import { toast } from "../utils/toast";
import {
  getQuickOrderProduct,
  placeWholesaleProductOrder,
  getWholesaleProductReviews,
  createWholesaleProductReview,
  getWholesaleProductComments,
  createWholesaleProductComment,
  toggleWholesaleProductLike,
} from "../api";

const WHOLESALE_RETURN_PATH = "/Wholesale";

const BANK_DETAILS = {
  accountName: "BUY SELL CLUB LTD",
  bank: "ECOBANK(ACHIMOTA)",
  accountNumber: "1441004957068",
};

const MOMO_DETAILS = {
  momoName: "BuySellClub",
  registeredName: "DANIEL TWUMASI",
  number: "054 437 0928",
  merchantId: "060140",
};

const mapProduct = (product) => ({
  id: product.id,
  title: product.title,
  description: product.description || "",
  images: Array.isArray(product.images) ? product.images : [],
  minQuantity: product.min_quantity || 1,
  availabilityStatus: product.availability_status || "available",
  arrivingDate: product.arriving_date || "",
  totalQuantity: product.total_quantity ?? 0,
  unitCost: Number(product.unit_cost ?? 0),
  expectedSellingPrice: Number(product.expected_selling_price ?? 0),
  saleEnabled: Boolean(product.sale_enabled),
  salePrice: product.sale_price,
  effectiveUnitPrice: Number(
    product.effective_unit_price ?? product.unit_cost ?? 0
  ),
  minOrderTotal: Number(product.min_order_total ?? 0),
  averageRating: Number(product.average_rating ?? 0),
  reviewCount: Number(product.review_count ?? 0),
  likeCount: Number(product.like_count ?? 0),
  commentCount: Number(product.comment_count ?? 0),
  userHasLiked: Boolean(product.user_has_liked),
});

const WholesaleProduct = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [image, setImage] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("description");
  const [reviews, setReviews] = useState([]);
  const [comments, setComments] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: "",
    comment: "",
  });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [liking, setLiking] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("bank");
  const [proofOfPayment, setProofOfPayment] = useState("");
  const [proofPreview, setProofPreview] = useState("");

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token") || localStorage.getItem("adminToken")
      : null;

  const fetchReviews = useCallback(async (id) => {
    setLoadingReviews(true);
    try {
      const response = await getWholesaleProductReviews({ product_id: id });
      const list = response.data?.results || response.data || [];
      setReviews(Array.isArray(list) ? list : []);
    } catch {
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  }, []);

  const fetchComments = useCallback(async (id) => {
    setLoadingComments(true);
    try {
      const response = await getWholesaleProductComments({ product_id: id });
      const list = response.data?.results || response.data || [];
      setComments(Array.isArray(list) ? list : []);
    } catch {
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }, []);

  useEffect(() => {
    if (!showPaymentModal) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e) => {
      if (e.key === "Escape" && !submitting) {
        setShowPaymentModal(false);
        setPaymentMethod("bank");
        setProofOfPayment("");
        setProofPreview("");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [showPaymentModal, submitting]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const response = await getQuickOrderProduct(productId);
        if (cancelled) return;
        const mapped = mapProduct(response.data);
        setProduct(mapped);
        setImage(mapped.images[0] || "");
        setQuantity(Number(mapped.minQuantity) || 1);
        fetchReviews(mapped.id);
        fetchComments(mapped.id);
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error.response?.data?.detail ||
              error.response?.data?.error ||
              "Product not found"
          );
          setProduct(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [productId, fetchReviews, fetchComments]);

  const renderStars = (rating, size = "text-lg") => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <FaStar
          key={star}
          className={`${size} ${
            star <= rating ? "text-[#ff5e00]" : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );

  const requireLogin = (action) => {
    if (!token) {
      toast.info(`Please log in to ${action}.`);
      navigate("/Login", {
        state: { redirectTo: `${WHOLESALE_RETURN_PATH}/${productId}` },
      });
      return false;
    }
    return true;
  };

  const handleToggleLike = async () => {
    if (!requireLogin("like this product") || !product) return;
    setLiking(true);
    try {
      const response = await toggleWholesaleProductLike(product.id);
      setProduct((prev) =>
        prev
          ? {
              ...prev,
              userHasLiked: Boolean(response.data?.liked),
              likeCount: Number(
                response.data?.like_count ?? prev.likeCount
              ),
            }
          : prev
      );
    } catch (error) {
      toast.error(
        error.response?.data?.error ||
          error.response?.data?.detail ||
          "Failed to update like"
      );
    } finally {
      setLiking(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!requireLogin("write a review") || !product) return;
    if (!reviewForm.comment.trim()) {
      toast.error("Please enter a review comment");
      return;
    }
    setSubmittingReview(true);
    try {
      await createWholesaleProductReview({
        product: product.id,
        rating: reviewForm.rating,
        title: reviewForm.title,
        comment: reviewForm.comment,
      });
      toast.success("Review submitted");
      setShowReviewForm(false);
      setReviewForm({ rating: 5, title: "", comment: "" });
      fetchReviews(product.id);
      const refreshed = await getQuickOrderProduct(product.id);
      setProduct(mapProduct(refreshed.data));
    } catch (error) {
      toast.error(
        error.response?.data?.error ||
          error.response?.data?.detail ||
          "Failed to submit review"
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!requireLogin("comment") || !product) return;
    if (!commentText.trim()) {
      toast.error("Please enter a comment");
      return;
    }
    setSubmittingComment(true);
    try {
      const response = await createWholesaleProductComment({
        product: product.id,
        comment: commentText.trim(),
      });
      toast.success("Comment posted");
      setCommentText("");
      setComments((prev) => [response.data, ...prev]);
      setProduct((prev) =>
        prev
          ? { ...prev, commentCount: (prev.commentCount || 0) + 1 }
          : prev
      );
    } catch (error) {
      toast.error(
        error.response?.data?.error ||
          error.response?.data?.detail ||
          "Failed to post comment"
      );
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-16 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container py-16 text-center">
        <p className="text-gray-500 mb-4">Wholesale product not found.</p>
        <Link to="/Wholesale" className="text-primary underline">
          Back to Wholesale
        </Link>
      </div>
    );
  }

  const isArriving = product.availabilityStatus === "arriving";
  const minQty = Number(product.minQuantity) || 1;
  const available = Number(product.totalQuantity) || 0;
  const maxQty = Math.max(available, 0);
  const canOrder =
    available > 0 &&
    available >= minQty &&
    quantity >= minQty &&
    quantity <= available;
  const paymentPercent = isArriving ? 50 : 100;
  const orderTotalNum =
    Number(product.effectiveUnitPrice) * Math.max(0, Math.floor(quantity) || 0);
  const lineTotal = orderTotalNum.toFixed(2);
  const amountDue = ((orderTotalNum * paymentPercent) / 100).toFixed(2);

  const clampQty = (val) => {
    const n = Math.floor(Number(val)) || minQty;
    if (maxQty <= 0) return minQty;
    return Math.min(Math.max(minQty, n), maxQty);
  };

  const resetPaymentForm = () => {
    setShowPaymentModal(false);
    setPaymentMethod("bank");
    setProofOfPayment("");
    setProofPreview("");
  };

  const handleProofChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG or JPG).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      setProofOfPayment(result);
      setProofPreview(result);
    };
    reader.onerror = () => toast.error("Failed to read image file.");
    reader.readAsDataURL(file);
  };

  const handleContinueToPayment = () => {
    if (!token) {
      toast.info("Please log in to place a wholesale order.");
      navigate("/Login", {
        state: { redirectTo: `${WHOLESALE_RETURN_PATH}/${product.id}` },
      });
      return;
    }
    const qty = clampQty(quantity);
    if (qty < minQty) {
      toast.error(`Minimum order quantity (MOQ) is ${minQty}.`);
      return;
    }
    if (available <= 0 || qty > available) {
      toast.error(
        available <= 0
          ? "This product is out of stock."
          : `Only ${available} left in stock.`
      );
      return;
    }
    setQuantity(qty);
    setShowPaymentModal(true);
  };

  const handleOrder = async () => {
    if (!token) {
      toast.info("Please log in to place a wholesale order.");
      navigate("/Login", {
        state: { redirectTo: `${WHOLESALE_RETURN_PATH}/${product.id}` },
      });
      return;
    }
    if (!proofOfPayment) {
      toast.error("Please upload proof of payment to validate your order.");
      return;
    }
    const qty = clampQty(quantity);
    if (qty < minQty) {
      toast.error(`Minimum order quantity (MOQ) is ${minQty}.`);
      return;
    }
    if (qty > available) {
      toast.error(`Only ${available} left in stock.`);
      return;
    }

    setSubmitting(true);
    try {
      const response = await placeWholesaleProductOrder(product.id, {
        quantity: qty,
        proof_of_payment: proofOfPayment,
        payment_method: paymentMethod,
      });
      const due = response?.data?.amount_due;
      const percent = response?.data?.payment_percent;
      toast.success(
        due != null
          ? `Order submitted — GHS ${Number(due).toFixed(2)} (${percent || paymentPercent}%) paid with proof. Admin will validate your order.`
          : "Wholesale order submitted. Payment proof received — admin will validate your order."
      );
      const leftAfter =
        response?.data?.total_quantity ?? response?.data?.quantity_left;
      if (leftAfter != null) {
        setProduct((prev) =>
          prev ? { ...prev, totalQuantity: leftAfter } : prev
        );
        setQuantity((q) => Math.min(clampQty(q), leftAfter));
      }
      resetPaymentForm();
    } catch (error) {
      toast.error(
        error.response?.data?.error ||
          error.response?.data?.detail ||
          "Failed to submit order."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container pb-10 border-t-2 pt-10 transition-opacity ease-in duration-500 opacity-100">
      <button
        type="button"
        onClick={() => navigate("/Wholesale")}
        className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary dark:text-gray-400"
      >
        <FaChevronLeft className="w-3 h-3" />
        Back to Wholesale
      </button>

      <div className="flex gap-12 sm:gap-12 flex-col sm:flex-row">
        <div className="flex-1 flex flex-col-reverse gap-3 sm:flex-row p-5 rounded-md bg-brandWhite">
          <div className="flex sm:flex-col overflow-x-auto sm:overflow-y-scroll justify-between sm:justify-normal sm:w-[18.7%] w-full">
            {product.images.length > 0 ? (
              product.images.map((item, index) => (
                <img
                  key={index}
                  src={item}
                  alt={`${product.title} - ${index + 1}`}
                  onClick={() => setImage(item)}
                  className="w-[24%] sm:w-full sm:mb-3 flex-shrink-0 cursor-pointer rounded-md"
                />
              ))
            ) : (
              <div className="w-[24%] sm:w-full aspect-square bg-gray-200 rounded-md flex items-center justify-center">
                <FaImage className="text-gray-400 w-6 h-6" />
              </div>
            )}
          </div>
          <div className="w-full sm:w-[80%]">
            {image ? (
              <img
                className="w-full h-auto rounded-2xl"
                src={image}
                alt={product.title}
              />
            ) : (
              <div className="w-full aspect-square bg-gray-100 rounded-2xl flex items-center justify-center">
                <FaImage className="text-gray-400 w-12 h-12" />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1">
          <h1 className="font-medium text-2xl mt-2 text-gray-900 dark:text-white">
            {product.title}
          </h1>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {renderStars(Math.round(product.averageRating || 0))}
            <span className="text-sm text-gray-600">
              {product.averageRating > 0
                ? product.averageRating.toFixed(1)
                : "No ratings yet"}
            </span>
            <span className="text-sm text-gray-500">
              ({product.reviewCount}{" "}
              {product.reviewCount === 1 ? "review" : "reviews"})
            </span>
          </div>

          <div className="mt-2 text-sm">
            {isArriving ? (
              <span className="text-amber-700 dark:text-amber-300">
                Arriving
                {product.arrivingDate ? ` · ${product.arrivingDate}` : ""}
              </span>
            ) : (
              <span className="text-emerald-700 dark:text-emerald-300">
                Available
              </span>
            )}
            <span className="text-gray-500 ml-2">· {available} available</span>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            Unit price
          </p>
          <div className="mt-1 flex items-baseline gap-3 flex-wrap">
            {product.saleEnabled ? (
              <>
                <span className="text-lg text-gray-400 line-through">
                  GHS {product.unitCost.toFixed(2)}
                </span>
                <span className="text-3xl font-medium text-primary">
                  GHS {product.effectiveUnitPrice.toFixed(2)}
                </span>
                <span className="text-sm text-amber-600 font-medium">Sale</span>
              </>
            ) : (
              <span className="text-3xl font-medium">
                GHS {product.effectiveUnitPrice.toFixed(2)}
              </span>
            )}
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
            MOQ {minQty} · from GHS{" "}
            {Number(
              product.minOrderTotal || product.effectiveUnitPrice * minQty
            ).toFixed(2)}
          </p>

          <div className="my-8">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Quantity (min {minQty}
              {maxQty > 0 ? `, max ${maxQty}` : ""})
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity((q) => clampQty(q - 1))}
                disabled={quantity <= minQty || maxQty <= 0}
                className="w-10 h-10 border rounded bg-brandBlue text-white hover:bg-brandYellow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                −
              </button>
              <input
                type="number"
                min={minQty}
                max={maxQty || minQty}
                value={quantity}
                onChange={(e) => setQuantity(clampQty(e.target.value))}
                className="w-20 text-center border border-gray-300 dark:border-gray-600 py-2 rounded bg-white dark:bg-gray-200 text-gray-900"
              />
              <button
                type="button"
                onClick={() => setQuantity((q) => clampQty(q + 1))}
                disabled={maxQty <= 0 || quantity >= maxQty}
                className="w-10 h-10 border rounded bg-brandBlue text-white hover:bg-brandYellow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>
            <p className="text-sm text-gray-800 dark:text-gray-200 mt-3">
              Order total: <strong>GHS {lineTotal}</strong>
            </p>
            {isArriving && (
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">
                Product not available yet — pay{" "}
                <strong>50% (GHS {amountDue})</strong> now to reserve your
                order
                {product.arrivingDate ? ` (arrives ${product.arrivingDate})` : ""}.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleContinueToPayment}
              disabled={!!token && !canOrder}
              className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!token
                ? "Log in to order"
                : maxQty < minQty
                  ? "Out of stock"
                  : "Continue to payment"}
            </button>
            <button
              type="button"
              onClick={handleToggleLike}
              disabled={liking}
              className={`inline-flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                product.userHasLiked
                  ? "border-red-300 text-red-600 bg-red-50"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
              title={product.userHasLiked ? "Unlike" : "Like"}
            >
              {product.userHasLiked ? <FaHeart /> : <FaRegHeart />}
              <span>{product.likeCount || 0}</span>
            </button>
          </div>
        </div>
      </div>

      {showPaymentModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
          onClick={() => {
            if (!submitting) resetPaymentForm();
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="wholesale-payment-title"
        >
          <div
            className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <h2
                id="wholesale-payment-title"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                Complete payment
              </h2>
              <button
                type="button"
                onClick={resetPaymentForm}
                disabled={submitting}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                aria-label="Close payment"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-5">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 rounded-xl">
                <h3 className="text-base font-bold mb-1 flex items-center gap-2">
                  <FaInfoCircle className="w-5 h-5 shrink-0" />
                  Payment validates your order
                </h3>
                <p className="text-sm text-white/90">
                  Pay the amount below using bank transfer or MoMo, then upload
                  your proof. Your wholesale order is only validated after
                  payment proof is received and reviewed.
                </p>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-300">
                <p className="font-medium text-gray-900 dark:text-white line-clamp-2">
                  {product.title}
                </p>
                <p className="mt-1">
                  Qty {quantity}
                  {isArriving ? " · Arriving (50% due)" : " · Full payment"}
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">
                    Order total
                  </span>
                  <span className="font-medium">GHS {lineTotal}</span>
                </div>
                <div className="flex justify-between text-sm items-center gap-2">
                  <span className="text-gray-600 dark:text-gray-300">
                    Due now ({paymentPercent}
                    {isArriving ? "% — arriving" : "%"})
                  </span>
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    GHS {amountDue}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("bank")}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${
                    paymentMethod === "bank"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                >
                  Bank transfer
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("momo")}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${
                    paymentMethod === "momo"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                >
                  MoMo
                </button>
              </div>

              {paymentMethod === "bank" ? (
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-2">
                  <h4 className="font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                    <FaMoneyBillWave className="text-green-600" />
                    Bank Transfer Details
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-500">Account Name</span>
                      <span className="font-semibold text-right">
                        {BANK_DETAILS.accountName}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-500">Bank</span>
                      <span className="font-semibold text-right">
                        {BANK_DETAILS.bank}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-500">Account Number</span>
                      <span className="font-mono font-bold text-blue-600">
                        {BANK_DETAILS.accountNumber}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-2">
                  <h4 className="font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                    <FaMoneyBillWave className="text-purple-600" />
                    Mobile Money (MoMo) Details
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-500">MoMo name</span>
                      <span className="font-semibold">
                        {MOMO_DETAILS.momoName}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-500">Registered name</span>
                      <span className="font-semibold text-right">
                        {MOMO_DETAILS.registeredName}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-500">Number</span>
                      <span className="font-mono font-bold text-blue-600">
                        {MOMO_DETAILS.number}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-500">Merchant ID</span>
                      <span className="font-mono font-semibold">
                        {MOMO_DETAILS.merchantId}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 space-y-3">
                <h4 className="font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                  <FaUpload className="text-blue-600" />
                  Upload proof of payment{" "}
                  <span className="text-red-500">*</span>
                </h4>
                <p className="text-sm text-gray-500">
                  Screenshot or photo of your transfer / MoMo confirmation.
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProofChange}
                  className="hidden"
                  id="wholesaleProofUpload"
                />
                <label
                  htmlFor="wholesaleProofUpload"
                  className="flex flex-col items-center justify-center w-full p-5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-primary transition"
                >
                  {proofPreview ? (
                    <div className="space-y-2 w-full">
                      <img
                        src={proofPreview}
                        alt="Proof of payment"
                        className="max-h-48 mx-auto rounded-lg"
                      />
                      <p className="text-center text-sm text-green-600 font-medium">
                        Proof uploaded — click to change
                      </p>
                    </div>
                  ) : (
                    <>
                      <FaUpload className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Click to upload proof
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        PNG, JPG up to 5MB
                      </p>
                    </>
                  )}
                </label>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 sticky bottom-0 pb-1 bg-white dark:bg-gray-900 pt-1">
                <button
                  type="button"
                  onClick={resetPaymentForm}
                  disabled={submitting}
                  className="px-5 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleOrder}
                  disabled={submitting || !proofOfPayment}
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    "Submitting…"
                  ) : (
                    <>
                      <FaCheckCircle />
                      Submit order with proof
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-16">
        <div className="flex border-b flex-wrap">
          {[
            { key: "description", label: "Description" },
            { key: "reviews", label: `Reviews (${product.reviewCount || 0})` },
            {
              key: "comments",
              label: `Comments (${product.commentCount || comments.length || 0})`,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "description" && (
          <div className="border px-6 py-6 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {product.description || (
              <p className="text-gray-500 italic">No description provided.</p>
            )}
          </div>
        )}

        {activeTab === "reviews" && (
          <div className="border px-6 py-6">
            {token && (
              <div className="mb-6">
                {!showReviewForm ? (
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(true)}
                    className="bg-primary text-white px-6 py-2 rounded hover:bg-primary/90"
                  >
                    Write a Review
                  </button>
                ) : (
                  <form
                    onSubmit={handleSubmitReview}
                    className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg"
                  >
                    <h3 className="text-lg font-semibold mb-4">
                      Write Your Review
                    </h3>
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2">
                        Rating
                      </label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() =>
                              setReviewForm({ ...reviewForm, rating: star })
                            }
                          >
                            <FaStar
                              className={`text-2xl ${
                                star <= reviewForm.rating
                                  ? "text-[#ff5e00]"
                                  : "text-gray-300"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2">
                        Title (Optional)
                      </label>
                      <input
                        type="text"
                        value={reviewForm.title}
                        onChange={(e) =>
                          setReviewForm({
                            ...reviewForm,
                            title: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border rounded bg-white text-gray-900"
                        placeholder="Give your review a title"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2">
                        Your Review *
                      </label>
                      <textarea
                        value={reviewForm.comment}
                        onChange={(e) =>
                          setReviewForm({
                            ...reviewForm,
                            comment: e.target.value,
                          })
                        }
                        rows={4}
                        required
                        className="w-full px-4 py-2 border rounded bg-white text-gray-900"
                        placeholder="Share your experience..."
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={submittingReview}
                        className="bg-primary text-white px-6 py-2 rounded disabled:opacity-50"
                      >
                        {submittingReview ? "Submitting..." : "Submit Review"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowReviewForm(false);
                          setReviewForm({ rating: 5, title: "", comment: "" });
                        }}
                        className="bg-gray-200 text-gray-700 px-6 py-2 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {loadingReviews ? (
              <p className="text-gray-500 text-center py-8">Loading reviews...</p>
            ) : reviews.length > 0 ? (
              <div className="space-y-6">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b pb-6 last:border-b-0">
                    <h4 className="font-semibold">
                      {review.user_name || "Anonymous"}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      {renderStars(review.rating, "text-sm")}
                      <span className="text-xs text-gray-500">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {review.title && (
                      <h5 className="font-medium mt-2">{review.title}</h5>
                    )}
                    <p className="text-gray-700 dark:text-gray-300 mt-2">
                      {review.comment}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                {token
                  ? "No reviews yet. Be the first to review this product!"
                  : "No reviews yet. Log in to write the first review!"}
              </p>
            )}
          </div>
        )}

        {activeTab === "comments" && (
          <div className="border px-6 py-6">
            {token ? (
              <form onSubmit={handleSubmitComment} className="mb-6">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border rounded bg-white text-gray-900 mb-3"
                  placeholder="Leave a comment..."
                  required
                />
                <button
                  type="submit"
                  disabled={submittingComment}
                  className="bg-primary text-white px-6 py-2 rounded disabled:opacity-50"
                >
                  {submittingComment ? "Posting..." : "Post comment"}
                </button>
              </form>
            ) : (
              <p className="mb-6 text-sm text-gray-500">
                <Link
                  to="/Login"
                  state={{ redirectTo: `${WHOLESALE_RETURN_PATH}/${product.id}` }}
                  className="text-primary underline"
                >
                  Log in
                </Link>{" "}
                to leave a comment.
              </p>
            )}

            {loadingComments ? (
              <p className="text-gray-500 text-center py-8">
                Loading comments...
              </p>
            ) : comments.length > 0 ? (
              <div className="space-y-4">
                {comments.map((c) => (
                  <div
                    key={c.id}
                    className="border-b pb-4 last:border-b-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-semibold text-sm">
                        {c.user_name || "Anonymous"}
                      </h4>
                      <span className="text-xs text-gray-500">
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 mt-1 text-sm">
                      {c.comment}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No comments yet.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WholesaleProduct;
