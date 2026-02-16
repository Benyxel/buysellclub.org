import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaStore, FaArrowLeft, FaCheckCircle, FaClock, FaTimesCircle } from "react-icons/fa";
import { toast } from "../utils/toast";
import { Api } from "../api";
import Title from "../components/Title";

const BUSINESS_TYPES = [
  { value: "individual", label: "Individual / Sole Proprietor" },
  { value: "retail", label: "Retail Store" },
  { value: "wholesale", label: "Wholesale / Distributor" },
  { value: "manufacturer", label: "Manufacturer" },
  { value: "reseller", label: "Reseller" },
  { value: "other", label: "Other" },
];

const statusConfig = {
  pending: {
    label: "Pending review",
    icon: <FaClock className="text-amber-600" />,
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  },
  approved: {
    label: "Approved",
    icon: <FaCheckCircle className="text-green-600" />,
    badge: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
  },
  rejected: {
    label: "Rejected",
    icon: <FaTimesCircle className="text-red-600" />,
    badge: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
  },
};

const VendorOnboarding = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [meData, setMeData] = useState(null);
  const [form, setForm] = useState({
    full_name: "",
    location: "",
    business_type: "",
    business_number: "",
    product_name: "",
    quantity_available: 0,
  });

  const isLoggedIn = !!(
    typeof window !== "undefined" && localStorage.getItem("token")
  );

  const fetchMe = async () => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    try {
      const res = await Api.vendor.me({ noCache: true });
      setMeData(res.data || null);
      const latest = res.data?.applications?.[0];
      if (latest) {
        setForm((f) => ({
          ...f,
          full_name: latest.full_name || f.full_name,
          location: latest.location || f.location,
          business_type: latest.business_type || f.business_type,
          business_number: latest.business_number ?? f.business_number,
          product_name: latest.product_name ?? f.product_name,
          quantity_available: latest.quantity_available ?? f.quantity_available,
        }));
      }
    } catch (e) {
      console.warn("Vendor me load failed:", e);
      setMeData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      try {
        const userData = JSON.parse(localStorage.getItem("userData") || "{}");
        if (!form.full_name && (userData.full_name || userData.username)) {
          setForm((f) => ({
            ...f,
            full_name: userData.full_name || userData.username || "",
            location: userData.location || f.location,
          }));
        }
      } catch (_) {}
    }
  }, [isLoggedIn]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
      toast.error("Please log in to apply as a vendor.");
      navigate("/Login", { state: { from: "/become-a-vendor" } });
      return;
    }
    if (!form.full_name?.trim()) {
      toast.error("Please enter your full name.");
      return;
    }
    if (!form.location?.trim()) {
      toast.error("Please enter your location.");
      return;
    }
    if (!form.business_type) {
      toast.error("Please select a business type.");
      return;
    }
    if (!form.product_name?.trim()) {
      toast.error("Please enter product name(s).");
      return;
    }
    const qty = Number(form.quantity_available);
    if (isNaN(qty) || qty < 0) {
      toast.error("Please enter a valid quantity.");
      return;
    }
    setSubmitting(true);
    try {
      await Api.vendor.submit({
        full_name: form.full_name.trim(),
        location: form.location.trim(),
        business_type: form.business_type,
        business_number: (form.business_number || "").trim(),
        product_name: form.product_name.trim(),
        quantity_available: qty,
      });
      toast.success("Application submitted. We'll review it shortly.");
      fetchMe();
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        "Failed to submit application.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-md mx-auto text-center">
          <Title title="Become a Vendor" />
          <FaStore className="w-16 h-16 text-primary mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Log in to start the vendor onboarding process.
          </p>
          <Link
            to="/Login"
            state={{ from: "/become-a-vendor" }}
            className="inline-block px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Log in
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  const isVendor = meData?.is_vendor === true;
  const latestApplication = meData?.applications?.[0];
  const status = latestApplication?.status || meData?.vendor_request_status;
  const hasPending = status === "pending";

  if (isVendor) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-lg mx-auto">
          <Link
            to="/Shop"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary mb-6"
          >
            <FaArrowLeft /> Back to Shop
          </Link>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
            <FaCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
              You're an approved vendor
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You can work with admin to list your products for sale. Track sales and inventory on your vendor sales page.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                to="/vendor-sales"
                className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                <FaStore className="w-4 h-4" />
                My sales
              </Link>
              <Link
                to="/Shop"
                className="inline-block px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Go to Shop
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (hasPending) {
    const config = statusConfig.pending;
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-lg mx-auto">
          <Link
            to="/Shop"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary mb-6"
          >
            <FaArrowLeft /> Back to Shop
          </Link>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
            <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 mb-4">
              {config.icon}
            </span>
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
              Application under review
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We'll notify you once your vendor application has been reviewed.
            </p>
            <span
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${config.badge}`}
            >
              {config.icon} {config.label}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (status === "rejected") {
    const config = statusConfig.rejected;
    const rejectedApplication = meData?.applications?.[0];
    const adminNote = rejectedApplication?.admin_notes || rejectedApplication?.adminNotes || "";
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-lg mx-auto">
          <Link
            to="/Shop"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary mb-6"
          >
            <FaArrowLeft /> Back to Shop
          </Link>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
            <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 mb-4">
              {config.icon}
            </span>
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
              Application not approved
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Your previous vendor application was not approved. You may contact support if you have questions, or try applying again.
            </p>
            {adminNote.trim() && (
              <div className="mb-6 text-left rounded-lg bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 p-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Note from admin
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                  {adminNote.trim()}
                </p>
              </div>
            )}
            <span
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${config.badge} mb-4`}
            >
              {config.icon} {config.label}
            </span>
            <button
              type="button"
              onClick={() => setMeData(null)}
              className="mt-2 text-sm text-primary hover:underline"
            >
              Apply again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <Link
          to="/Shop"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary mb-6"
        >
          <FaArrowLeft /> Back to Shop
        </Link>
        <Title title="Become a Vendor" />
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <FaStore className="w-10 h-10 text-primary" />
            <div>
              <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
                Vendor onboarding
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Answer a few questions to apply. Admin will review your request.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, full_name: e.target.value }))
                }
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Your full name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) =>
                  setForm((f) => ({ ...f, location: e.target.value }))
                }
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="City / Region"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Business type <span className="text-red-500">*</span>
              </label>
              <select
                value={form.business_type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, business_type: e.target.value }))
                }
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              >
                <option value="">Select type</option>
                {BUSINESS_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Vendor business number
              </label>
              <input
                type="text"
                value={form.business_number}
                onChange={(e) =>
                  setForm((f) => ({ ...f, business_number: e.target.value }))
                }
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Business registration number (optional)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Product name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.product_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, product_name: e.target.value }))
                }
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Name of product(s) you want to sell"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quantity of products available to sell
              </label>
              <input
                type="number"
                min="0"
                value={form.quantity_available === 0 ? "" : form.quantity_available}
                onChange={(e) => {
                  const v = e.target.value;
                  const n = v === "" ? 0 : parseInt(v, 10);
                  setForm((f) => ({
                    ...f,
                    quantity_available: isNaN(n) ? 0 : Math.max(0, n),
                  }));
                }}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Estimated number of products"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {submitting ? "Submitting…" : "Submit application"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VendorOnboarding;
