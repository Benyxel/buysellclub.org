import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaImage, FaArrowRight } from "react-icons/fa";
import Title from "./Title";
import { getQuickOrderProducts } from "../api";

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
  saleEnabled: Boolean(product.sale_enabled),
  effectiveUnitPrice: Number(
    product.effective_unit_price ?? product.unit_cost ?? 0
  ),
});

/**
 * Home page preview of wholesale catalog products.
 */
const HomeWholesaleProducts = ({ limit = 8 }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const response = await getQuickOrderProducts({
          page: 1,
          page_size: limit,
        });
        let list = [];
        if (Array.isArray(response.data)) {
          list = response.data;
        } else if (Array.isArray(response.data?.results)) {
          list = response.data.results;
        }
        if (!cancelled) {
          setProducts(list.slice(0, limit).map(mapProduct));
        }
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [limit]);

  if (!loading && products.length === 0) {
    return null;
  }

  return (
    <section className="container my-10">
      <div className="text-center py-6 sm:py-8 text-3xl">
        <Title text1="WHOLESALE" text2="PRODUCTS" />
        <p className="w-3/4 m-auto text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400">
          Popular picks from our wholesale catalog — order in bulk with MOQ
          pricing.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4">
            {products.map((product) => {
              const isArriving = product.availabilityStatus === "arriving";
              const image = product.images[0];
              return (
                <Link
                  key={product.id}
                  to={`/Wholesale/${product.id}`}
                  className="group border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 hover:shadow-md transition-shadow flex flex-col"
                >
                  <div className="aspect-square bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
                    {image ? (
                      <img
                        src={image}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FaImage className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <span
                      className={`absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isArriving
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {isArriving ? "Arriving" : "Available"}
                    </span>
                  </div>
                  <div className="p-3 flex flex-col flex-1">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 mb-1">
                      {product.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                      {product.description || "Wholesale product"}
                    </p>
                    <div className="mt-auto space-y-0.5">
                      {product.saleEnabled ? (
                        <p className="text-sm">
                          <span className="line-through text-gray-400 mr-1 text-xs">
                            GHS {product.unitCost.toFixed(2)}
                          </span>
                          <span className="text-primary font-semibold">
                            GHS {product.effectiveUnitPrice.toFixed(2)}
                          </span>
                        </p>
                      ) : (
                        <p className="text-sm text-primary font-semibold">
                          GHS {product.effectiveUnitPrice.toFixed(2)}
                        </p>
                      )}
                      <p className="text-[11px] text-gray-500">
                        MOQ {product.minQuantity}
                        {product.totalQuantity > 0
                          ? ` · ${product.totalQuantity} left`
                          : ""}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="text-center mt-8">
            <Link
              to="/Wholesale"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              View all wholesale products
              <FaArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </>
      )}
    </section>
  );
};

export default HomeWholesaleProducts;
