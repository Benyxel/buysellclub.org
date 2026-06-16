import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaDownload, FaEye, FaFileAlt, FaFilePdf, FaShoppingCart, FaSpinner, FaTag, FaTimes } from "react-icons/fa";
import { toast } from "../utils/toast";
import { Api } from "../api";

/** Customer JWT from signup/login — required for digital purchases (not admin dashboard token). */
const readHasCustomerToken = () =>
  typeof window !== "undefined" && !!localStorage.getItem("token");

const resolveAssetUrl = (rawUrl) => {
  const url = String(rawUrl || "").trim();
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = String(import.meta.env?.VITE_API_BASE_URL || "").replace(/\/+$/, "");
  if (base && url.startsWith("/")) return `${base}${url}`;
  return url;
};

/** Effective list price for digital product cards / modal (GHS). */
const getDigitalProductPricing = (p) => {
  if (!p) return { displayPrice: null, computedSale: null, basePrice: null };
  const basePrice = p?.price != null ? Number(p.price) : null;
  const saleEnabled = !!p?.sale_enabled;
  const salePrice = p?.sale_price != null ? Number(p.sale_price) : null;
  const discountPercent = p?.discount_percent != null ? Number(p.discount_percent) : null;
  const computedSale =
    saleEnabled && salePrice
      ? salePrice
      : saleEnabled && discountPercent && basePrice
        ? Math.max(0, basePrice * (1 - discountPercent / 100))
        : null;
  const displayPrice =
    computedSale != null ? computedSale : basePrice != null ? basePrice : null;
  return { displayPrice, computedSale, basePrice };
};

const DigitalStore = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [productOffset, setProductOffset] = useState(0);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [library, setLibrary] = useState([]);
  const [buyingId, setBuyingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [receiptingId, setReceiptingId] = useState(null);
  const [showDownloads, setShowDownloads] = useState(false);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [thumbnailLightbox, setThumbnailLightbox] = useState(null);
  const [checkoutProduct, setCheckoutProduct] = useState(null);
  const [manualProofUploading, setManualProofUploading] = useState(false);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualForm, setManualForm] = useState({
    note: "",
    proof_url: "",
  });
  const loadMoreRef = useRef(null);
  const payReturnHandledRef = useRef(false);
  const deepLinkHandledRef = useRef(false);

  const PRODUCTS_PAGE_SIZE = 12;

  const hasCustomerToken = readHasCustomerToken();
  const hasAdminTokenOnly =
    typeof window !== "undefined" &&
    !!localStorage.getItem("adminToken") &&
    !localStorage.getItem("token");

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await Api.digitalStore.products({
        limit: PRODUCTS_PAGE_SIZE,
        offset: 0,
      });
      const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
      setProducts(list);
      setProductOffset(list.length);
      const next = res.data?.next;
      setHasMoreProducts(Boolean(next));
    } catch (e) {
      toast.error(
        e?.response?.data?.detail ||
          e?.response?.data?.error ||
          "Could not load digital products."
      );
      setProducts([]);
      setProductOffset(0);
      setHasMoreProducts(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchMoreProducts = async () => {
    if (loadingMore || loading || !hasMoreProducts) return;
    try {
      setLoadingMore(true);
      const res = await Api.digitalStore.products({
        limit: PRODUCTS_PAGE_SIZE,
        offset: productOffset,
      });
      const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
      if (list.length === 0) {
        setHasMoreProducts(false);
        return;
      }
      setProducts((prev) => {
        const seen = new Set(prev.map((x) => x?.id ?? x?._id ?? x?.slug));
        const merged = [...prev];
        for (const item of list) {
          const key = item?.id ?? item?._id ?? item?.slug;
          if (!seen.has(key)) merged.push(item);
        }
        return merged;
      });
      setProductOffset((o) => o + list.length);
      const next = res.data?.next;
      setHasMoreProducts(Boolean(next));
    } catch {
      // Don't toast on infinite scroll; keep UI calm
      setHasMoreProducts(false);
    } finally {
      setLoadingMore(false);
    }
  };

  const fetchLibrary = async () => {
    if (!readHasCustomerToken()) return;
    try {
      setLibraryLoading(true);
      const res = await Api.digitalStore.library();
      const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
      setLibrary(list);
    } catch {
      setLibrary([]);
    } finally {
      setLibraryLoading(false);
    }
  };

  const paidLibrary = useMemo(() => {
    return (library || []).filter((x) => x?.status === "paid" || x?.is_paid);
  }, [library]);

  const purchaseByProductId = useMemo(() => {
    const map = new Map();
    for (const p of library || []) {
      if (p?.is_paid && p?.product_id) {
        map.set(Number(p.product_id), p);
      }
    }
    return map;
  }, [library]);

  const viewingPurchase = useMemo(() => {
    if (!viewingProduct) return null;
    const pid = viewingProduct?.id ?? viewingProduct?._id;
    return pid != null ? purchaseByProductId.get(Number(pid)) ?? null : null;
  }, [viewingProduct, purchaseByProductId]);

  const viewingPricing = useMemo(
    () => getDigitalProductPricing(viewingProduct),
    [viewingProduct]
  );

  useEffect(() => {
    fetchProducts();
    if (readHasCustomerToken()) {
      fetchLibrary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Allow opening "My downloads" from external pages (e.g. Profile)
  // Example: /DigitalStore?downloads=1
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const wantsDownloads = params.get("downloads") === "1";
    if (!wantsDownloads) {
      deepLinkHandledRef.current = false;
      return;
    }
    if (deepLinkHandledRef.current) return;
    deepLinkHandledRef.current = true;

    if (!readHasCustomerToken()) {
      navigate("/Login", { state: { redirectTo: "/DigitalStore?downloads=1" } });
      return;
    }

    setShowDownloads(true);
    fetchLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // If deep-linked to downloads but nothing is available, keep users on the store page.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const wantsDownloads = params.get("downloads") === "1";
    if (!wantsDownloads) return;
    if (!readHasCustomerToken()) return;
    if (libraryLoading) return;

    if (paidLibrary.length === 0) {
      setShowDownloads(false);
      toast.info("No downloads yet. Browse the Digital Store to buy and download.");
      navigate("/DigitalStore", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libraryLoading, paidLibrary.length, location.search]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("paid") !== "1") {
      payReturnHandledRef.current = false;
      return;
    }
    if (payReturnHandledRef.current) return;
    payReturnHandledRef.current = true;
    const purchaseId = params.get("purchase_id");
    let cancelled = false;
    (async () => {
      if (purchaseId && readHasCustomerToken()) {
        try {
          const res = await Api.digitalStore.ensureReceiptEmail(purchaseId);
          if (!cancelled) {
            if (res.data?.already_sent) {
              toast.success("Payment confirmed. Receipt was already emailed — check your inbox.");
            } else {
              toast.success("Payment confirmed. Receipt emailed — check your inbox.");
            }
          }
        } catch {
          if (!cancelled) {
            toast.success("Payment confirmed. Open My downloads for your receipt PDF if needed.");
          }
        }
      } else if (!cancelled) {
        toast.success("Payment confirmed. Your purchase is ready.");
      }
      if (!cancelled) {
        await fetchLibrary();
        window.history.replaceState({}, "", "/DigitalStore");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          fetchMoreProducts();
        }
      },
      { root: null, rootMargin: "800px 0px", threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadMoreRef, hasMoreProducts, productOffset, loadingMore, loading]);

  useEffect(() => {
    if (!thumbnailLightbox) return;
    const onKey = (e) => {
      if (e.key === "Escape") setThumbnailLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [thumbnailLightbox]);

  const goToShopperLogin = () => {
    setViewingProduct(null);
    setThumbnailLightbox(null);
    setCheckoutProduct(null);
    navigate("/Login", { state: { redirectTo: "/DigitalStore" } });
  };

  const handleBuy = (product) => {
    if (!readHasCustomerToken()) {
      goToShopperLogin();
      return;
    }
    if (product?.is_owned || product?.executive_free_access) {
      claimExecutiveDownload(product);
      return;
    }
    setViewingProduct(null);
    setThumbnailLightbox(null);
    setCheckoutProduct(product);
    setManualForm({ note: "", proof_url: "" });
  };

  const startPaystackCheckout = async (product) => {
    if (!readHasCustomerToken()) {
      goToShopperLogin();
      return;
    }
    try {
      setBuyingId(product?.id || product?._id || product?.slug || "x");
      const baseUrl =
        import.meta.env?.VITE_APP_URL ||
        (typeof window !== "undefined" ? window.location.origin : "");
      const payload = {
        product_id: product?.id ?? product?._id ?? product?.product_id,
        callback_url: baseUrl
          ? `${String(baseUrl).replace(/\/$/, "")}/payment/callback`
          : undefined,
      };
      const res = await Api.digitalStore.initiatePaystack(payload);
      if (res.data?.executive_free || res.data?.already_owned) {
        toast.success(
          res.data?.message ||
            (res.data?.executive_free
              ? "Included with your Executive membership."
              : "You already own this product.")
        );
        await fetchLibrary();
        if (res.data?.purchase_id) {
          await handleDownload(res.data.purchase_id);
        }
        setCheckoutProduct(null);
        setViewingProduct(null);
        return;
      }
      const url = res.data?.payment_url || res.data?.authorization_url;
      if (!url) {
        toast.error(res.data?.error || "Payment could not be started.");
        setBuyingId(null);
        return;
      }
      toast.success("Redirecting to Paystack…");
      window.location.href = url;
    } catch (e) {
      const code = e?.response?.data?.code;
      const msg = e?.response?.data?.error || e?.response?.data?.detail;
      if (code === "registration_required") {
        toast.error(msg || "Create an account before purchasing.");
      } else if (code === "account_inactive" || code === "email_required") {
        toast.error(msg || "Your account cannot complete this purchase.");
      } else {
        toast.error(msg || "Payment failed.");
      }
    } finally {
      setBuyingId(null);
    }
  };

  const claimExecutiveDownload = async (product) => {
    if (!readHasCustomerToken()) {
      goToShopperLogin();
      return;
    }
    const existing = purchaseByProductId.get(Number(product?.id ?? product?._id));
    if (existing?.id) {
      await handleDownload(existing.id);
      return;
    }
    await startPaystackCheckout(product);
  };

  const uploadManualProof = async (file) => {
    if (!readHasCustomerToken()) {
      goToShopperLogin();
      return;
    }
    try {
      setManualProofUploading(true);
      const res = await Api.digitalStore.uploadPaymentProof(file);
      const url = res.data?.url || res.data?.file_url || res.data?.file;
      if (!url) {
        toast.error("Upload did not return a proof URL.");
        return;
      }
      setManualForm((f) => ({ ...f, proof_url: url }));
      toast.success("Proof uploaded.");
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.response?.data?.detail || "Proof upload failed.");
    } finally {
      setManualProofUploading(false);
    }
  };

  const submitManualMoMo = async () => {
    if (!readHasCustomerToken()) {
      goToShopperLogin();
      return;
    }
    if (!checkoutProduct?.id && !checkoutProduct?._id) return;
    if (!String(manualForm.proof_url || "").trim()) {
      toast.error("Please upload proof of payment.");
      return;
    }
    try {
      setManualSubmitting(true);
      const res = await Api.digitalStore.submitManualMoMo({
        product_id: checkoutProduct?.id ?? checkoutProduct?._id,
        proof_url: String(manualForm.proof_url || "").trim(),
        sender_name: "",
        sender_number: "",
        note: String(manualForm.note || "").trim(),
      });
      toast.success(
        res.data?.updated
          ? "Submission updated. Admin will review your payment."
          : "Submitted. Admin will review and approve your download."
      );
      setCheckoutProduct(null);
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.response?.data?.detail || "Submission failed.");
    } finally {
      setManualSubmitting(false);
    }
  };

  const handleDownload = async (purchaseId) => {
    if (!readHasCustomerToken()) {
      goToShopperLogin();
      return;
    }
    try {
      setDownloadingId(purchaseId);
      const res = await Api.digitalStore.downloadLink(purchaseId);
      const url = res.data?.download_url || res.data?.url;
      if (!url) {
        toast.error("Download link not available yet.");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(
        e?.response?.data?.detail ||
          e?.response?.data?.error ||
          "Could not open download link."
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadReceipt = async (purchaseId) => {
    if (!readHasCustomerToken()) {
      goToShopperLogin();
      return;
    }
    try {
      setReceiptingId(purchaseId);
      await Api.digitalStore.downloadReceipt(purchaseId);
      toast.success("Receipt downloaded.");
    } catch (e) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.detail ||
        e?.message ||
        "Failed to download receipt";
      toast.error(typeof msg === "string" ? msg : "Failed to download receipt");
    } finally {
      setReceiptingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Digital Store
              </h1>
              <p className="mt-1 text-sm sm:text-base text-gray-600 dark:text-gray-400">
                Pay with Paystack and download instantly. We email a receipt (PDF) and your
                download link after payment.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:flex-wrap">
              {hasCustomerToken ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowDownloads(true);
                    fetchLibrary();
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-950/40"
                >
                  <FaFilePdf />
                  My downloads
                  {paidLibrary.length ? (
                    <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white">
                      {paidLibrary.length}
                    </span>
                  ) : null}
                </button>
              ) : null}
            </div>
          </div>
          {hasAdminTokenOnly ? (
            <p className="mb-6 text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 max-w-2xl">
              You are logged in as admin only. Log in with your shopper account to purchase or open
              My downloads.
            </p>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-3">
              {loading ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-10 shadow-sm dark:border-gray-700 dark:bg-gray-800 flex items-center justify-center gap-3 text-gray-600 dark:text-gray-300">
                  <FaSpinner className="animate-spin" />
                  Loading products…
                </div>
              ) : products.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-10 shadow-sm dark:border-gray-700 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-300">
                  No digital products available yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3 xl:grid-cols-5">
                  {products.map((p) => {
                    const productId = p?.id ?? p?._id;
                    const ownedPurchase = productId
                      ? purchaseByProductId.get(Number(productId))
                      : null;
                    const owned =
                      ownedPurchase ||
                      (p?.is_owned ? { id: ownedPurchase?.id, executive: true } : null);
                    const executiveFree = Boolean(p?.executive_free_access);

                    const saleEnabled = !!p?.sale_enabled;
                    const discountPercent =
                      p?.discount_percent != null ? Number(p.discount_percent) : null;
                    const { displayPrice, computedSale, basePrice } = getDigitalProductPricing(p);

                    return (
                      <div
                        key={p?.id ?? p?.slug ?? String(Math.random())}
                        className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                      >
                        <div className="relative w-full bg-gray-100 dark:bg-gray-950/50">
                          <button
                            type="button"
                            onClick={() => {
                              if (p?.thumbnail_url) {
                                setThumbnailLightbox({
                                  src: resolveAssetUrl(p.thumbnail_url),
                                  title: String(p?.title || p?.name || "Digital product").trim(),
                                });
                              } else {
                                setViewingProduct(p);
                              }
                            }}
                            className="relative flex w-full cursor-zoom-in items-center justify-center px-3 pb-4 pt-3 sm:px-4 sm:pb-5 sm:pt-4"
                            aria-label={
                              p?.thumbnail_url
                                ? `View full image: ${p?.title || "Digital product"}`
                                : `View product: ${p?.title || "Digital product"}`
                            }
                            title={p?.thumbnail_url ? "Tap to view full image" : "View product"}
                          >
                            <div className="pointer-events-none absolute inset-0 bg-black/[0.03] dark:bg-white/[0.03]" />
                            {p?.thumbnail_url ? (
                              <img
                                src={resolveAssetUrl(p.thumbnail_url)}
                                alt={p?.title || "Digital product"}
                                className="relative z-[1] max-h-[min(320px,62vw)] w-full max-w-[220px] object-contain sm:max-h-[min(340px,50vw)] sm:max-w-[260px]"
                                loading="lazy"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="relative z-[1] flex min-h-[160px] w-full max-w-[220px] items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 text-primary sm:min-h-[180px] sm:max-w-[260px]">
                                <FaFilePdf className="text-4xl" />
                              </div>
                            )}
                          </button>

                          {saleEnabled && discountPercent ? (
                            <div className="pointer-events-none absolute left-3 top-3 z-[2] inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-xs font-extrabold text-white shadow-lg ring-1 ring-red-400/60 backdrop-blur dark:bg-red-600 dark:ring-red-300/50">
                              <FaTag className="text-[11px]" />
                              {Number(discountPercent).toFixed(0)}% off
                            </div>
                          ) : null}

                          {owned || executiveFree ? (
                            <div className="pointer-events-none absolute right-3 top-3 z-[2] rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
                              {executiveFree ? "Executive" : "Owned"}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex flex-1 flex-col p-4 sm:p-5">
                          <p className="text-base font-semibold text-gray-900 dark:text-white line-clamp-2">
                            {p?.title || p?.name || "Digital product"}
                          </p>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                            {p?.description || "Instant PDF download after payment."}
                          </p>

                          <div className="mt-auto flex flex-col gap-3 pt-4">
                            <div className="min-h-[42px]">
                              {executiveFree ? (
                                <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                                  Free
                                </p>
                              ) : displayPrice != null ? (
                                <>
                                  <p className="text-lg font-extrabold text-gray-900 dark:text-white">
                                    ₵{Number(displayPrice).toFixed(2)}
                                  </p>
                                  {computedSale != null && basePrice != null ? (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-through">
                                      ₵{Number(basePrice).toFixed(2)}
                                    </p>
                                  ) : (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">&nbsp;</p>
                                  )}
                                </>
                              ) : (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Price not set
                                </p>
                              )}
                            </div>

                            <div className="flex items-stretch gap-2">
                              <button
                                type="button"
                                onClick={() => setViewingProduct(p)}
                                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-[11px] font-semibold leading-tight text-gray-800 hover:bg-gray-50 sm:text-xs dark:border-gray-600 dark:bg-gray-800/80 dark:text-gray-100 dark:hover:bg-gray-800"
                                aria-label="View full product details"
                                title="View full details"
                              >
                                <FaEye className="shrink-0 text-sm" />
                                <span className="sr-only">View details</span>
                              </button>
                              {ownedPurchase ? (
                                <button
                                  type="button"
                                  onClick={() => handleDownload(ownedPurchase.id)}
                                  disabled={downloadingId === ownedPurchase.id}
                                  className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-center text-[11px] font-semibold leading-tight text-white shadow-sm ring-1 ring-emerald-500/30 hover:bg-emerald-700 disabled:opacity-60 sm:text-xs dark:bg-emerald-600 dark:hover:bg-emerald-500 whitespace-nowrap"
                                >
                                  <FaDownload className="shrink-0 text-[11px]" />
                                  <span className="min-w-0">
                                    {downloadingId === ownedPurchase.id ? "Opening…" : "Download"}
                                  </span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    owned || executiveFree ? claimExecutiveDownload(p) : handleBuy(p)
                                  }
                                  disabled={buyingId === (p?.id ?? p?._id ?? p?.slug)}
                                  className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-center text-[11px] font-semibold leading-tight text-white disabled:opacity-60 sm:text-xs whitespace-nowrap ${
                                    owned || executiveFree
                                      ? "bg-emerald-600 shadow-sm ring-1 ring-emerald-500/30 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                                      : "bg-primary hover:opacity-95"
                                  }`}
                                >
                                  <FaDownload className="shrink-0 text-[11px]" />
                                  <span className="min-w-0">
                                    {owned || executiveFree ? "Download" : "Download"}
                                  </span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div ref={loadMoreRef} className="h-px w-full" />
              {loadingMore ? (
                <div className="mt-5 flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <FaSpinner className="animate-spin" />
                  Loading more…
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {showDownloads ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-3 sm:p-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowDownloads(false);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  My downloads
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Download your file or receipt PDF for each purchase.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDownloads(false)}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Close
              </button>
            </div>

            {!hasCustomerToken ? (
              <div className="p-5 text-sm text-gray-600 dark:text-gray-300">
                <p>Log in with your shopper account to see receipts and purchases.</p>
              </div>
            ) : libraryLoading ? (
              <div className="p-5 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <FaSpinner className="animate-spin" />
                Loading…
              </div>
            ) : paidLibrary.length === 0 ? (
              <div className="p-5 text-sm text-gray-600 dark:text-gray-300">
                No purchases yet.
              </div>
            ) : (
              <ul className="max-h-[70vh] overflow-auto divide-y divide-gray-100 dark:divide-gray-800">
                {paidLibrary.map((x) => (
                  <li key={x.id} className="p-5">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {x.product_title || x.title || "Purchased item"}
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => handleDownload(x.id)}
                        disabled={downloadingId === x.id}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-emerald-500/30 hover:bg-emerald-700 disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                        title="Open product file"
                      >
                        <FaDownload />
                        {downloadingId === x.id ? "Opening…" : "Download"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadReceipt(x.id)}
                        disabled={receiptingId === x.id}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:hover:bg-gray-900"
                        title="Download receipt PDF"
                      >
                        <FaFileAlt />
                        {receiptingId === x.id ? "Preparing…" : "Receipt"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {thumbnailLightbox ? (
        <div
          className="fixed inset-0 z-[95]"
          role="dialog"
          aria-modal="true"
          aria-label="Cover full size"
        >
          <button
            type="button"
            className="absolute inset-0 z-0 bg-black/92"
            onClick={() => setThumbnailLightbox(null)}
            aria-label="Close — tap empty space"
          />
          <div className="pointer-events-none relative z-10 flex h-full w-full flex-col p-3 sm:p-6">
            <div className="flex shrink-0 justify-end pointer-events-auto">
              <button
                type="button"
                onClick={() => setThumbnailLightbox(null)}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20"
                aria-label="Close cover view"
              >
                <FaTimes className="text-base" />
                Close
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 py-2">
              <img
                src={thumbnailLightbox.src}
                alt={thumbnailLightbox.title || "Product cover"}
                className="pointer-events-auto max-h-[min(82dvh,calc(100dvh-10rem))] max-w-[min(95vw,920px)] object-contain object-center shadow-2xl ring-1 ring-white/10"
              />
              {thumbnailLightbox.title ? (
                <p className="max-w-full truncate px-2 text-center text-sm font-medium text-white/90 sm:text-base">
                  {thumbnailLightbox.title}
                </p>
              ) : null}
              <p className="text-center text-xs text-white/55">
                Tap dark area or Esc to close
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {viewingProduct ? (
        <div
          className="fixed inset-0 z-[85] flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-8 sm:items-center sm:p-6 sm:py-10"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setViewingProduct(null);
          }}
        >
          <div className="my-auto flex max-h-[88dvh] w-full min-h-[min(360px,55dvh)] max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900 sm:max-w-3xl">
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-base font-bold text-gray-900 dark:text-white sm:text-lg">
                  {viewingProduct?.title || viewingProduct?.name || "Digital product"}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Full description
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingProduct(null)}
                className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Close
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 sm:py-6">
              {viewingProduct?.thumbnail_url ? (
                <div className="mb-4 rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950/50 sm:p-4">
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() =>
                        setThumbnailLightbox({
                          src: resolveAssetUrl(viewingProduct.thumbnail_url),
                          title: String(
                            viewingProduct?.title || viewingProduct?.name || "Digital product"
                          ).trim(),
                        })
                      }
                      className="group/cover cursor-zoom-in rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label="Tap to view full image"
                      title="Tap to view full image"
                    >
                      <div className="relative mx-auto flex h-[220px] w-[140px] items-center justify-center sm:h-[256px] sm:w-[160px]">
                        <img
                          src={resolveAssetUrl(viewingProduct.thumbnail_url)}
                          alt={viewingProduct?.title || "Digital product"}
                          className="max-h-full max-w-full object-contain transition group-hover/cover:opacity-95"
                          loading="lazy"
                        />
                      </div>
                    </button>
                  </div>
                  <p className="mt-2 text-center text-[11px] text-gray-500 dark:text-gray-400">
                    Tap to view full image
                  </p>
                </div>
              ) : null}
              <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words">
                {String(viewingProduct?.description || "").trim() ||
                  "No description provided."}
              </p>
            </div>

            <div className="shrink-0 border-t border-gray-100 bg-gray-50/90 px-5 py-4 dark:border-gray-800 dark:bg-gray-950/50 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-h-[42px] flex flex-col justify-end">
                  {viewingProduct?.executive_free_access ? (
                    <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                      Free · Executive member
                    </p>
                  ) : viewingPricing.displayPrice != null ? (
                    <>
                      <p className="text-xl font-extrabold text-gray-900 dark:text-white">
                        ₵{Number(viewingPricing.displayPrice).toFixed(2)}
                      </p>
                      {viewingPricing.computedSale != null && viewingPricing.basePrice != null ? (
                        <p className="text-xs text-gray-500 line-through dark:text-gray-400">
                          ₵{Number(viewingPricing.basePrice).toFixed(2)}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400">&nbsp;</p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Price not set</p>
                  )}
                </div>
                {viewingPurchase ? (
                  <button
                    type="button"
                    onClick={() => handleDownload(viewingPurchase.id)}
                    disabled={downloadingId === viewingPurchase.id}
                    className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm ring-1 ring-emerald-500/30 hover:bg-emerald-700 disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-500 sm:w-auto sm:min-w-[180px]"
                  >
                    <FaDownload />
                    {downloadingId === viewingPurchase.id ? "Opening…" : "Download"}
                  </button>
                ) : viewingProduct?.is_owned ? (
                  <button
                    type="button"
                    onClick={() => claimExecutiveDownload(viewingProduct)}
                    disabled={buyingId === (viewingProduct?.id ?? viewingProduct?._id ?? viewingProduct?.slug)}
                    className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm ring-1 ring-emerald-500/30 hover:bg-emerald-700 disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-500 sm:w-auto sm:min-w-[180px]"
                  >
                    <FaDownload />
                    Download free
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleBuy(viewingProduct)}
                    disabled={buyingId === (viewingProduct?.id ?? viewingProduct?._id ?? viewingProduct?.slug)}
                    className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60 sm:w-auto sm:min-w-[180px]"
                  >
                    <FaDownload />
                    Download
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {checkoutProduct ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-3 sm:p-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setCheckoutProduct(null);
          }}
        >
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  Choose payment method
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                  {checkoutProduct?.title || checkoutProduct?.name || "Digital product"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutProduct(null)}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Close
              </button>
            </div>

            <div className="p-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Pay with Paystack (Ghana)
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Instant approval + download after payment.
                </p>
                <button
                  type="button"
                  onClick={() => startPaystackCheckout(checkoutProduct)}
                  disabled={buyingId === (checkoutProduct?.id ?? checkoutProduct?._id ?? checkoutProduct?.slug)}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
                >
                  <FaShoppingCart />
                  {buyingId === (checkoutProduct?.id ?? checkoutProduct?._id ?? checkoutProduct?.slug)
                    ? "Redirecting…"
                    : "Pay with Paystack"}
                </button>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Pay to MoMo (Abroad)
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Pay to our MoMo and upload proof. Admin will approve.
                </p>

                <div className="mt-3 space-y-1.5 rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-800 dark:border-gray-800 dark:bg-gray-950/60 dark:text-gray-100">
                  <p>
                    <span className="font-semibold">MoMo name:</span> BuySellClub
                  </p>
                  <p>
                    <span className="font-semibold">Registered name:</span> DANIEL TWUMASI
                  </p>
                  <p>
                    <span className="font-semibold">Number:</span>{" "}
                    <a
                      href="tel:+233544370928"
                      className="font-semibold text-primary hover:underline"
                    >
                      054 437 0928
                    </a>
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  <textarea
                    rows={2}
                    value={manualForm.note}
                    onChange={(e) => setManualForm((f) => ({ ...f, note: e.target.value }))}
                    placeholder="Note (optional)"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                  />

                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadManualProof(f);
                        e.target.value = "";
                      }}
                      className="block w-full text-xs text-gray-700 dark:text-gray-200"
                    />
                  </div>

                  {manualForm.proof_url ? (
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 truncate">
                      Proof uploaded: {manualForm.proof_url}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    onClick={submitManualMoMo}
                    disabled={manualSubmitting || manualProofUploading}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60 dark:bg-white dark:text-gray-900"
                  >
                    {manualProofUploading ? "Uploading proof…" : manualSubmitting ? "Submitting…" : "Submit proof"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default DigitalStore;
