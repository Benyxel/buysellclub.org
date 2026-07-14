import React, { useCallback, useEffect, useRef, useState } from "react";
import { FaImage } from "react-icons/fa";
import { Link } from "react-router-dom";
import { toast } from "../utils/toast";
import { getQuickOrderProducts } from "../api";

const PAGE_SIZE = 12;

const mapProduct = (product) => ({
  id: product.id,
  title: product.title,
  description: product.description || "",
  images: product.images || [],
  minQuantity: product.min_quantity || 1,
  availabilityStatus: product.availability_status || "available",
  arrivingDate: product.arriving_date || "",
  totalQuantity: product.total_quantity ?? 0,
  unitCost: product.unit_cost ?? 0,
  saleEnabled: Boolean(product.sale_enabled),
  effectiveUnitPrice: Number(
    product.effective_unit_price ?? product.unit_cost ?? 0
  ),
  minOrderTotal: Number(product.min_order_total ?? 0),
  averageRating: Number(product.average_rating ?? 0),
  reviewCount: Number(product.review_count ?? 0),
  likeCount: Number(product.like_count ?? 0),
});

/**
 * Wholesale catalog grid — infinite scroll; click a product for details.
 */
const WholesaleOrdersListing = () => {
  const [products, setProducts] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);
  const loadMoreRef = useRef(null);

  const fetchPage = useCallback(async (pageNum, { append }) => {
    if (loadingRef.current) return;
    if (append && !hasMoreRef.current) return;

    loadingRef.current = true;
    if (append) setLoadingMore(true);
    else setInitialLoading(true);

    try {
      const response = await getQuickOrderProducts({
        page: pageNum,
        page_size: PAGE_SIZE,
      });
      let list = [];
      let count = 0;
      let nextUrl = null;

      if (
        response.data &&
        typeof response.data === "object" &&
        "results" in response.data
      ) {
        list = response.data.results || [];
        count = response.data.count ?? list.length;
        nextUrl = response.data.next;
      } else if (Array.isArray(response.data)) {
        list = response.data;
        count = response.data.length;
      } else if (response.data && typeof response.data === "object") {
        list = [response.data];
        count = 1;
      }

      const mapped = list.map(mapProduct);
      setProducts((prev) => {
        if (!append) return mapped;
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...mapped.filter((p) => !seen.has(p.id))];
      });

      let more = false;
      if (nextUrl != null) {
        more = Boolean(nextUrl);
      } else if (count > 0) {
        more = pageNum * PAGE_SIZE < count && mapped.length > 0;
      } else {
        more = mapped.length >= PAGE_SIZE;
      }

      hasMoreRef.current = more;
      pageRef.current = pageNum;
    } catch (error) {
      const status = error.response?.status;
      if (status && status >= 400) {
        toast.error(
          error.response?.data?.detail ||
            error.response?.data?.error ||
            "Failed to load wholesale products",
          { toastId: "fetch-wholesale-products-error" }
        );
      }
      if (!append) {
        setProducts([]);
      }
      hasMoreRef.current = false;
    } finally {
      loadingRef.current = false;
      setInitialLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    pageRef.current = 1;
    hasMoreRef.current = true;
    fetchPage(1, { append: false });
  }, [fetchPage]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (loadingRef.current || !hasMoreRef.current) return;
        fetchPage(pageRef.current + 1, { append: true });
      },
      { root: null, rootMargin: "240px", threshold: 0 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchPage, initialLoading]);

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8 max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Wholesale Products
        </h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        {initialLoading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center p-8">
            <p className="text-gray-500 dark:text-gray-400">
              No wholesale products available right now.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {products.map((product, productIndex) => {
                const isArriving = product.availabilityStatus === "arriving";
                return (
                  <Link
                    key={product.id || `product-${productIndex}`}
                    to={`/Wholesale/${product.id}`}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:shadow-md transition-shadow flex flex-col"
                  >
                    <div className="flex gap-1 mb-2 overflow-x-auto pb-2">
                      {product.images && product.images.length > 0 ? (
                        <>
                          {product.images.slice(0, 2).map((image, index) => (
                            <img
                              key={`${product.id}-img-${index}`}
                              src={image}
                              alt={`${product.title} image ${index + 1}`}
                              className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
                            />
                          ))}
                          {product.images.length > 2 && (
                            <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center text-xs text-gray-500 flex-shrink-0">
                              +{product.images.length - 2}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FaImage className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <h3 className="font-medium text-sm text-gray-900 dark:text-white line-clamp-2 mb-1">
                      {product.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                      {product.description}
                    </p>
                    <div className="text-xs space-y-1 mt-auto">
                      <p>
                        {isArriving ? (
                          <span className="text-amber-700 dark:text-amber-300">
                            Arriving
                            {product.arrivingDate
                              ? ` · ${product.arrivingDate}`
                              : ""}
                          </span>
                        ) : (
                          <span className="text-emerald-700 dark:text-emerald-300">
                            Available
                          </span>
                        )}
                      </p>
                      <p className="text-gray-700 dark:text-gray-300">
                        {product.saleEnabled ? (
                          <>
                            <span className="line-through text-gray-400 mr-1">
                              GHS {Number(product.unitCost).toFixed(2)}
                            </span>
                            <span className="text-primary font-medium">
                              GHS {product.effectiveUnitPrice.toFixed(2)}
                            </span>
                          </>
                        ) : (
                          <span className="font-medium text-primary">
                            GHS {product.effectiveUnitPrice.toFixed(2)} / unit
                          </span>
                        )}
                      </p>
                      <p className="text-gray-500">
                        MOQ {product.minQuantity} · {product.totalQuantity}{" "}
                        available
                      </p>
                      {(product.reviewCount > 0 || product.likeCount > 0) && (
                        <p className="text-gray-500">
                          {product.reviewCount > 0 &&
                            `★ ${Number(product.averageRating || 0).toFixed(1)} (${product.reviewCount})`}
                          {product.reviewCount > 0 &&
                            product.likeCount > 0 &&
                            " · "}
                          {product.likeCount > 0 && `♥ ${product.likeCount}`}
                        </p>
                      )}
                      <p className="text-primary font-medium pt-1">
                        View details →
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div ref={loadMoreRef} className="h-8 mt-6" aria-hidden />

            {loadingMore && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default WholesaleOrdersListing;
