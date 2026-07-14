import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaBoxOpen,
  FaSyncAlt,
  FaTimes,
  FaTruck,
  FaImage,
} from "react-icons/fa";
import { toast } from "../../utils/toast";
import { getWholesaleRequests } from "../../api";

const statusColor = (status) => {
  switch ((status || "").toLowerCase()) {
    case "pending":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "approved":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "processing":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "completed":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "cancelled":
    case "rejected":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
  }
};

const paymentColor = (status) => {
  switch ((status || "").toLowerCase()) {
    case "paid":
    case "confirmed":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
    case "partial":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
    case "rejected":
      return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
    default:
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
  }
};

const formatLabel = (value) => {
  if (!value) return "—";
  const s = String(value).toLowerCase();
  if (s === "partial") return "Part paid";
  if (s === "paid" || s === "confirmed") return "Fully paid";
  if (s === "pending_review") return "Pending review";
  if (s === "rejected") return "Rejected";
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const WholesaleOrdersTab = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState(null);
  const [previewProof, setPreviewProof] = useState("");

  const fetchOrders = useCallback(async (showToast = false) => {
    setLoading(true);
    try {
      const response = await getWholesaleRequests({ page_size: 100 });
      const list = Array.isArray(response.data)
        ? response.data
        : response.data?.results || [];
      setOrders(list);
      if (showToast) toast.success("Wholesale orders refreshed");
    } catch (error) {
      setOrders([]);
      toast.error(
        error.response?.data?.error ||
          error.response?.data?.detail ||
          "Failed to load wholesale orders"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const visible = showAll ? orders : orders.slice(0, 3);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h2 className="text-base sm:text-xl font-semibold text-gray-800 dark:text-white">
            Wholesale orders
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            Track status, payment review, and order details.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchOrders(true)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          title="Refresh"
        >
          <FaSyncAlt className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-8">
          <FaBoxOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            No wholesale orders yet
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Browse the wholesale catalog to place an order
          </p>
          <Link
            to="/Wholesale"
            className="inline-block mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Go to Wholesale
          </Link>
        </div>
      ) : (
        <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
          {visible.map((order) => {
            const image =
              Array.isArray(order.images) && order.images[0]
                ? order.images[0]
                : "";
            return (
              <div
                key={order.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 hover:shadow-sm transition-shadow"
              >
                <div className="flex gap-3">
                  <div className="w-16 h-16 shrink-0 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    {image ? (
                      <img
                        src={image}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FaImage className="text-gray-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">
                          {order.title}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Order #{order.id} · Qty {order.quantity}
                          {order.created_at
                            ? ` · ${new Date(
                                order.created_at
                              ).toLocaleDateString()}`
                            : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelected(order)}
                        className="px-3 py-1 text-xs font-medium bg-primary text-white rounded-md hover:bg-primary/90 transition-colors shrink-0"
                      >
                        View details
                      </button>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(
                          order.status
                        )}`}
                      >
                        {formatLabel(order.status)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${paymentColor(
                          order.payment_status
                        )}`}
                      >
                        Payment: {formatLabel(order.payment_status)}
                      </span>
                      {order.tracking_status && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">
                          <FaTruck className="w-3 h-3" />
                          {formatLabel(order.tracking_status)}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                      <span>
                        Total:{" "}
                        <strong className="text-gray-900 dark:text-white">
                          GHS {Number(order.line_total || 0).toFixed(2)}
                        </strong>
                      </span>
                      <span>
                        Paid / due:{" "}
                        <strong className="text-gray-900 dark:text-white">
                          GHS {Number(order.amount_due || 0).toFixed(2)}
                        </strong>
                        {order.payment_percent
                          ? ` (${order.payment_percent}%)`
                          : ""}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {orders.length > 3 && (
            <div className="text-center pt-3 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setShowAll((prev) => !prev)}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-primary border border-primary rounded-lg hover:bg-primary/10 transition-colors"
              >
                {showAll
                  ? "Show fewer orders"
                  : `View all ${orders.length} orders`}
              </button>
            </div>
          )}
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Order #{selected.id}
              </h3>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 text-sm">
              {Array.isArray(selected.images) && selected.images[0] && (
                <img
                  src={selected.images[0]}
                  alt={selected.title}
                  className="w-full h-44 object-cover rounded-lg"
                />
              )}

              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white text-base">
                  {selected.title}
                </h4>
                {selected.description ? (
                  <p className="mt-1 text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {selected.description}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor(
                    selected.status
                  )}`}
                >
                  Status: {formatLabel(selected.status)}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${paymentColor(
                    selected.payment_status
                  )}`}
                >
                  Payment: {formatLabel(selected.payment_status)}
                </span>
                {selected.tracking_status && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">
                    Tracking: {formatLabel(selected.tracking_status)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                <div>
                  <p className="text-xs text-gray-500">Quantity</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selected.quantity}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Unit price</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    GHS {Number(selected.unit_price || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Order total</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    GHS {Number(selected.line_total || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">
                    Amount due ({selected.payment_percent || 100}%)
                  </p>
                  <p className="font-medium text-blue-600 dark:text-blue-400">
                    GHS {Number(selected.amount_due || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Availability at order</p>
                  <p className="font-medium text-gray-900 dark:text-white capitalize">
                    {selected.availability_at_order || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Payment method</p>
                  <p className="font-medium text-gray-900 dark:text-white uppercase">
                    {selected.payment_method || "—"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Placed on</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selected.created_at
                      ? new Date(selected.created_at).toLocaleString()
                      : "—"}
                  </p>
                </div>
              </div>

              {selected.payment_status === "pending_review" && (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-amber-800 dark:text-amber-200 text-xs">
                  Payment proof is under review. Your order is validated once
                  payment is confirmed.
                </div>
              )}
              {selected.payment_status === "partial" && (
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 text-blue-800 dark:text-blue-200 text-xs">
                  Part payment received
                  {Number(selected.payment_percent || 0) > 0
                    ? ` (${selected.payment_percent}% / GHS ${Number(
                        selected.amount_due || 0
                      ).toFixed(2)})`
                    : ""}
                  . Remaining balance: GHS{" "}
                  {(
                    Number(selected.line_total || 0) -
                    Number(selected.amount_due || 0)
                  ).toFixed(2)}
                  . Full payment will complete your order.
                </div>
              )}
              {(selected.payment_status === "paid" ||
                selected.payment_status === "confirmed") && (
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 text-emerald-800 dark:text-emerald-200 text-xs">
                  Full payment received — your wholesale order is validated.
                </div>
              )}
              {selected.payment_status === "rejected" && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-red-800 dark:text-red-200 text-xs">
                  Payment was rejected. Contact support if you need help.
                </div>
              )}

              {selected.proof_of_payment ? (
                <div>
                  <p className="text-xs text-gray-500 mb-2">
                    Your payment proof
                  </p>
                  <button
                    type="button"
                    onClick={() => setPreviewProof(selected.proof_of_payment)}
                    className="block"
                  >
                    <img
                      src={selected.proof_of_payment}
                      alt="Payment proof"
                      className="max-h-40 rounded-lg border border-gray-200 dark:border-gray-700"
                    />
                  </button>
                </div>
              ) : null}

              {selected.admin_notes ? (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Admin notes</p>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {selected.admin_notes}
                  </p>
                </div>
              ) : null}

              {selected.product_id ? (
                <Link
                  to={`/Wholesale/${selected.product_id}`}
                  className="inline-flex text-primary text-sm font-medium hover:underline"
                >
                  View product
                </Link>
              ) : (
                <Link
                  to="/Wholesale"
                  className="inline-flex text-primary text-sm font-medium hover:underline"
                >
                  Browse wholesale
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {previewProof && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewProof("")}
        >
          <div
            className="relative max-w-3xl w-full bg-white dark:bg-gray-900 rounded-lg p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewProof("")}
              className="absolute top-2 right-2 p-2 text-gray-500 hover:text-gray-800"
              aria-label="Close"
            >
              <FaTimes />
            </button>
            <img
              src={previewProof}
              alt="Payment proof"
              className="max-h-[80vh] w-auto mx-auto rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default WholesaleOrdersTab;
