import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaStore, FaArrowLeft, FaBoxOpen, FaChartLine, FaExclamationTriangle, FaMoneyBillWave, FaCheckCircle, FaTimesCircle, FaClock, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { toast } from "../utils/toast";
import { Api } from "../api";
import Title from "../components/Title";

const VendorSales = ({ embedded = false }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ products: [] });
  const [eligibility, setEligibility] = useState(null);
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);
  const [payoutPage, setPayoutPage] = useState(1);
  const [payoutPageSize] = useState(10);
  const [payoutTotal, setPayoutTotal] = useState(0);
  const [payoutForm, setPayoutForm] = useState({
    payment_method: "momo",
    momo_number: "",
    momo_name: "",
    bank_name: "",
    bank_account_number: "",
    bank_account_name: "",
  });

  useEffect(() => {
    const fetchSales = async () => {
      try {
        setLoading(true);
        const res = await Api.vendor.sales({ noCache: true });
        setData(res.data || { products: [] });
      } catch (err) {
        if (err.response?.status === 403) {
          setData({ products: [] });
          if (!embedded) toast.error("You are not an approved vendor.");
        } else {
          console.error("Vendor sales fetch failed:", err);
          if (!embedded) toast.error("Failed to load sales data");
          setData({ products: [] });
        }
      } finally {
        setLoading(false);
      }
    };
    fetchSales();
  }, [embedded]);

  useEffect(() => {
    if (loading) return;
    const fetchEligibility = async () => {
      try {
        const eligRes = await Api.vendor.payoutEligibility({ noCache: true });
        setEligibility(eligRes.data || null);
      } catch (e) {
        setEligibility(null);
      }
    };
    fetchEligibility();
  }, [loading]);

  useEffect(() => {
    if (loading) return;
    const fetchPayoutRequests = async () => {
      try {
        const reqRes = await Api.vendor.payoutRequests.list(
          { params: { page: payoutPage, page_size: payoutPageSize }, noCache: true }
        );
        const data = reqRes.data;
        const list = data?.results ?? (Array.isArray(data) ? data : []);
        const total = data?.count ?? list.length;
        setPayoutRequests(list);
        setPayoutTotal(total);
      } catch (e) {
        setPayoutRequests([]);
        setPayoutTotal(0);
      }
    };
    fetchPayoutRequests();
  }, [loading, payoutPage, payoutPageSize]);

  const products = data.products || [];
  const summary = data.summary || null;

  const handlePayoutSubmit = async (e) => {
    e.preventDefault();
    const amount = eligibility?.remaining_payable != null ? Number(eligibility.remaining_payable) : 0;
    if (amount <= 0) {
      toast.error("No amount remaining to request.");
      return;
    }
    if (payoutForm.payment_method === "momo" && (!payoutForm.momo_number?.trim() || !payoutForm.momo_name?.trim())) {
      toast.error("Momo number and name are required");
      return;
    }
    if (payoutForm.payment_method === "bank" && (!payoutForm.bank_name?.trim() || !payoutForm.bank_account_number?.trim() || !payoutForm.bank_account_name?.trim())) {
      toast.error("Bank name, account number and account name are required");
      return;
    }
    setPayoutSubmitting(true);
    try {
      const payload = {
        amount,
        payment_method: payoutForm.payment_method,
        momo_number: payoutForm.payment_method === "momo" ? payoutForm.momo_number.trim() : "",
        momo_name: payoutForm.payment_method === "momo" ? payoutForm.momo_name.trim() : "",
        bank_name: payoutForm.payment_method === "bank" ? payoutForm.bank_name.trim() : "",
        bank_account_number: payoutForm.payment_method === "bank" ? payoutForm.bank_account_number.trim() : "",
        bank_account_name: payoutForm.payment_method === "bank" ? payoutForm.bank_account_name.trim() : "",
      };
      await Api.vendor.payoutRequests.create(payload);
      toast.success("Payout request submitted. Admin will review it.");
      setPayoutForm({ payment_method: "momo", momo_number: "", momo_name: "", bank_name: "", bank_account_number: "", bank_account_name: "" });
      const [reqRes, eligRes] = await Promise.all([
        Api.vendor.payoutRequests.list({ params: { page: payoutPage, page_size: payoutPageSize }, noCache: true }),
        Api.vendor.payoutEligibility({ noCache: true }),
      ]);
      const data = reqRes.data;
      setPayoutRequests(data?.results ?? (Array.isArray(data) ? data : []));
      setPayoutTotal(data?.count ?? 0);
      setEligibility(eligRes.data || null);
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.detail || "Failed to submit request");
    } finally {
      setPayoutSubmitting(false);
    }
  };

  const content = (
    <>
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <FaStore className="w-10 h-10 text-primary" />
            <div>
              <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
                Vendor sales
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Track sales and inventory for your listed products
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <FaBoxOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                No products listed yet
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Admin will assign your products to you. Once they list products under your vendor account, they will appear here with sales and inventory.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile: card list */}
              <div className="md:hidden space-y-4">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-4 space-y-3"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{p.name}</p>
                        {p.slug && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.slug}</p>
                        )}
                      </div>
                      {p.is_out_of_stock ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 shrink-0">
                          <FaExclamationTriangle className="w-3 h-3" />
                          Out of stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 shrink-0">
                          In stock
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div className="text-gray-500 dark:text-gray-400">Unit price</div>
                      <div className="text-gray-900 dark:text-white font-medium">₵{Number(p.price || 0).toFixed(2)}</div>
                      <div className="text-gray-500 dark:text-gray-400">Total sold</div>
                      <div className="text-gray-900 dark:text-white inline-flex items-center gap-1">
                        <FaChartLine className="w-3.5 h-3.5 text-primary" />
                        {p.total_purchased}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">Sales (₵)</div>
                      <div className="text-gray-900 dark:text-white font-semibold">₵{Number(p.total_sales_amount || 0).toFixed(2)}</div>
                      <div className="text-gray-500 dark:text-gray-400">Inventory left</div>
                      <div className="text-gray-900 dark:text-white">{p.inventory_left}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Unit price
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Total sold
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Sales (₵)
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Inventory left
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-900 dark:text-white">{p.name}</span>
                          {p.slug && (
                            <span className="block text-xs text-gray-500 dark:text-gray-400">{p.slug}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white">
                          ₵{Number(p.price || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white">
                          <span className="inline-flex items-center gap-1">
                            <FaChartLine className="w-4 h-4 text-primary" />
                            {p.total_purchased}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                          ₵{Number(p.total_sales_amount || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white">
                          {p.inventory_left}
                        </td>
                        <td className="px-4 py-3">
                          {p.is_out_of_stock ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200">
                              <FaExclamationTriangle className="w-3 h-3" />
                              Out of stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                              In stock
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {products.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-1">
                  <div className="flex justify-end">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">
                      Total sales (earned): ₵
                      {summary
                        ? Number(summary.total_sales_amount || 0).toFixed(2)
                        : products.reduce((sum, p) => sum + Number(p.total_sales_amount || 0), 0).toFixed(2)}
                    </p>
                  </div>
                  {summary && (
                    <div className="flex flex-wrap justify-end gap-x-6 text-xs text-gray-600 dark:text-gray-400">
                      <span>Inventory value (unsold): ₵{Number(summary.inventory_value_remaining || 0).toFixed(2)}</span>
                      <span>Remaining you can request: ₵{Number(summary.remaining_payable ?? 0).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

    {/* Request payout card */}
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mt-6">
      <div className="flex items-center gap-3 mb-4">
        <FaMoneyBillWave className="w-8 h-8 text-primary" />
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Request payout</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Request to be paid when 40% or more of your inventory (for a product) is sold. Provide Momo or bank details.
          </p>
        </div>
      </div>
      {eligibility != null && (
        <div className="space-y-2 mb-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-sm">
          <p className="text-gray-700 dark:text-gray-300">
            <strong>Total earned from sales:</strong> ₵{Number(eligibility.total_sales_amount || 0).toFixed(2)}
            <span className="text-gray-500 dark:text-gray-400 ml-1">(from sold units at your price)</span>
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            <strong>Remaining you can request:</strong> ₵{Number(eligibility.remaining_payable ?? 0).toFixed(2)}
            <span className="text-gray-500 dark:text-gray-400 ml-1">(after approved/paid payouts)</span>
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            <strong>Value of inventory left (unsold):</strong> ₵{Number(eligibility.inventory_value_remaining ?? 0).toFixed(2)}
          </p>
          {eligibility.eligible ? (
            <p className="text-green-600 dark:text-green-400 font-medium">You can request a payout (40%+ of at least one product sold).</p>
          ) : (
            <p className="text-amber-600 dark:text-amber-400">Request when at least 40% of a product’s inventory is sold.</p>
          )}
        </div>
      )}
      <form onSubmit={handlePayoutSubmit} className="space-y-4 mb-6">
        {eligibility != null && (
          <div className="p-3 rounded-lg bg-primary/10 dark:bg-primary/20 border border-primary/30">
            <p className="text-sm font-medium text-gray-800 dark:text-white">
              Amount to request: <strong className="text-lg">₵{Number(eligibility.remaining_payable ?? 0).toFixed(2)}</strong>
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              This is your total earned from sales (minus any payouts already approved or paid). You can request when 40%+ of a product’s inventory is sold.
            </p>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment method</label>
          <select
            value={payoutForm.payment_method}
            onChange={(e) => setPayoutForm((f) => ({ ...f, payment_method: e.target.value }))}
            className="w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            <option value="momo">Mobile Money (Momo)</option>
            <option value="bank">Bank Account</option>
          </select>
        </div>
        {payoutForm.payment_method === "momo" && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Momo number</label>
              <input
                type="text"
                value={payoutForm.momo_number}
                onChange={(e) => setPayoutForm((f) => ({ ...f, momo_number: e.target.value }))}
                className="w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                placeholder="e.g. 0241234567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Momo account name</label>
              <input
                type="text"
                value={payoutForm.momo_name}
                onChange={(e) => setPayoutForm((f) => ({ ...f, momo_name: e.target.value }))}
                className="w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                placeholder="Name on Momo account"
              />
            </div>
          </>
        )}
        {payoutForm.payment_method === "bank" && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bank name</label>
              <input
                type="text"
                value={payoutForm.bank_name}
                onChange={(e) => setPayoutForm((f) => ({ ...f, bank_name: e.target.value }))}
                className="w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                placeholder="e.g. GCB Bank"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account number</label>
              <input
                type="text"
                value={payoutForm.bank_account_number}
                onChange={(e) => setPayoutForm((f) => ({ ...f, bank_account_number: e.target.value }))}
                className="w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account name</label>
              <input
                type="text"
                value={payoutForm.bank_account_name}
                onChange={(e) => setPayoutForm((f) => ({ ...f, bank_account_name: e.target.value }))}
                className="w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
          </>
        )}
        <button
          type="submit"
          disabled={payoutSubmitting || (eligibility && !eligibility.eligible) || (eligibility && Number(eligibility.remaining_payable ?? 0) <= 0)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {payoutSubmitting ? "Submitting..." : "Submit payout request"}
        </button>
        {eligibility && Number(eligibility.remaining_payable ?? 0) <= 0 && eligibility.eligible && (
          <p className="text-sm text-gray-500 dark:text-gray-400">You have no remaining amount to request (already paid or approved).</p>
        )}
      </form>
      {(payoutRequests.length > 0 || payoutTotal > 0) && (
        <div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-2">My payout requests</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-300">Amount</th>
                  <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-300">Method</th>
                  <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-300">Status</th>
                  <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-300">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {payoutRequests.length === 0 ? (
                  <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">No requests on this page.</td></tr>
                ) : (
                  payoutRequests.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2 text-gray-900 dark:text-white">₵{Number(r.amount).toFixed(2)}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{r.payment_method === "momo" ? "Momo" : "Bank"}</td>
                      <td className="px-3 py-2">
                        {r.status === "pending" && <span className="inline-flex items-center gap-1 text-amber-600"><FaClock className="w-3 h-3" /> Pending</span>}
                        {r.status === "approved" && <span className="inline-flex items-center gap-1 text-blue-600"><FaCheckCircle className="w-3 h-3" /> Approved</span>}
                        {r.status === "rejected" && <span className="inline-flex items-center gap-1 text-red-600"><FaTimesCircle className="w-3 h-3" /> Rejected</span>}
                        {r.status === "paid" && <span className="inline-flex items-center gap-1 text-green-600"><FaCheckCircle className="w-3 h-3" /> Paid</span>}
                      </td>
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{r.requested_at ? new Date(r.requested_at).toLocaleDateString() : ""}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {payoutTotal > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-sm text-gray-600 dark:text-gray-400">
              <span>
                Showing {(payoutPage - 1) * payoutPageSize + 1}–{Math.min(payoutPage * payoutPageSize, payoutTotal)} of {payoutTotal}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPayoutPage((p) => Math.max(1, p - 1))}
                  disabled={payoutPage <= 1}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <FaChevronLeft className="w-4 h-4" /> Prev
                </button>
                <span className="px-2 py-1">Page {payoutPage} of {Math.ceil(payoutTotal / payoutPageSize) || 1}</span>
                <button
                  type="button"
                  onClick={() => setPayoutPage((p) => p + 1)}
                  disabled={payoutPage >= Math.ceil(payoutTotal / payoutPageSize)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Next <FaChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Link
          to="/become-a-vendor"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary mb-6"
        >
          <FaArrowLeft /> Back to vendor
        </Link>
        <Title title="My sales" />
        {content}
      </div>
    </div>
  );
};

export default VendorSales;
