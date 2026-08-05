import React, { useEffect, useRef, useState } from "react";
import { FaTimesCircle } from "react-icons/fa";
import API from "../../api";
import { toast } from "../../utils/toast";
import {
  normalizeMarkIdInput,
  preferExactMarkMatches,
} from "../../utils/markIdFormat";

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "in_transit", label: "In Transit" },
  { value: "arrived", label: "Arrived(China)" },
  { value: "vessel", label: "On The Vessel" },
  { value: "clearing", label: "Clearing" },
  { value: "arrived_ghana", label: "Arrived(Ghana)" },
  { value: "off_loading", label: "Of Loading" },
  { value: "pick_up", label: "Pick up" },
];

/**
 * Create repack tracking: auto {mark}RP001, CBM from H×W×L (cm), optional member trackings.
 * @param {boolean} forAgent - use agent API paths
 */
export default function RepackTrackingModal({
  open,
  onClose,
  onSuccess,
  forAgent = false,
  containers = [],
}) {
  const [shippingMark, setShippingMark] = useState("");
  const [markOptions, setMarkOptions] = useState([]);
  const [markLoading, setMarkLoading] = useState(false);
  const [nextRepackNumber, setNextRepackNumber] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [widthCm, setWidthCm] = useState("");
  const [lengthCm, setLengthCm] = useState("");
  const [calculatedCbm, setCalculatedCbm] = useState("");
  const [membersText, setMembersText] = useState("");
  const [containerId, setContainerId] = useState("");
  const [status, setStatus] = useState("pending");
  const [goodsType, setGoodsType] = useState("normal");
  const [shippingFee, setShippingFee] = useState("");
  const [eta, setEta] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const markDebounceRef = useRef(null);

  const apiPrefix = forAgent ? "/buysellapi/agent/trackings" : "/buysellapi/trackings";

  useEffect(() => {
    if (!open) return;
    setShippingMark("");
    setMarkOptions([]);
    setNextRepackNumber("");
    setHeightCm("");
    setWidthCm("");
    setLengthCm("");
    setCalculatedCbm("");
    setMembersText("");
    setContainerId("");
    setStatus("pending");
    setGoodsType("normal");
    setShippingFee("");
    setEta("");
  }, [open]);

  useEffect(() => {
    const h = parseFloat(heightCm);
    const w = parseFloat(widthCm);
    const l = parseFloat(lengthCm);
    if (h > 0 && w > 0 && l > 0) {
      const cbm = (h * w * l) / 1000000;
      setCalculatedCbm(cbm.toFixed(3));
    } else {
      setCalculatedCbm("");
    }
  }, [heightCm, widthCm, lengthCm]);

  const fetchNextRepackNumber = async (markId) => {
    const m = normalizeMarkIdInput(markId);
    if (!m || m.length < 2) {
      setNextRepackNumber("");
      return;
    }
    try {
      const resp = await API.get(`${apiPrefix}/repack/next-number/`, {
        params: { mark_id: m },
      });
      setNextRepackNumber(resp.data?.next_repack_number || "");
    } catch {
      setNextRepackNumber("");
    }
  };

  const handleMarkChange = (val) => {
    const upper = val.toUpperCase();
    setShippingMark(upper);
    if (markDebounceRef.current) clearTimeout(markDebounceRef.current);
    markDebounceRef.current = setTimeout(async () => {
      try {
        setMarkLoading(true);
        const resp = await API.get("/buysellapi/shipping-marks/", {
          params: { q: normalizeMarkIdInput(upper), page_size: 10 },
        });
        const items = Array.isArray(resp.data?.results)
          ? resp.data.results
          : Array.isArray(resp.data)
          ? resp.data
          : [];
        setMarkOptions(preferExactMarkMatches(items, upper));
        await fetchNextRepackNumber(upper);
      } catch {
        setMarkOptions([]);
      } finally {
        setMarkLoading(false);
      }
    }, 300);
  };

  const selectMark = async (m) => {
    const markId = m.markId || m.mark_id || "";
    setShippingMark(markId);
    setMarkOptions([]);
    await fetchNextRepackNumber(markId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!shippingMark.trim()) {
      toast.error("Select a Mark ID");
      return;
    }
    const h = parseFloat(heightCm);
    const w = parseFloat(widthCm);
    const l = parseFloat(lengthCm);
    if (!(h > 0 && w > 0 && l > 0)) {
      toast.error("Enter valid height, width, and length (cm)");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        shipping_mark: normalizeMarkIdInput(shippingMark),
        height_cm: h,
        width_cm: w,
        length_cm: l,
        member_tracking_numbers_text: membersText,
        status,
        goods_type: goodsType,
        eta: eta || null,
        container_id: containerId ? Number(containerId) : null,
        shipping_fee: shippingFee ? parseFloat(shippingFee) : null,
        for_agent: forAgent,
      };
      const resp = await API.post(`${apiPrefix}/repack-create/`, payload);
      const repackNo = resp.data?.repack?.tracking_number;
      const errCount = (resp.data?.member_errors || []).length;
      if (errCount) {
        toast.success(
          `Repack ${repackNo} created; ${errCount} member line(s) had issues (see response)`
        );
      } else {
        toast.success(`Repack ${repackNo} created`);
      }
      onSuccess?.(resp.data);
      onClose();
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
          err.response?.data?.detail ||
          "Failed to create repack tracking"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg my-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Add repack tracking
          </h3>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-400">
            <FaTimesCircle />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Mark ID *
            </label>
            <div className="relative">
              <input
                type="text"
                value={shippingMark}
                onChange={(e) => handleMarkChange(e.target.value)}
                placeholder="Search mark IDs..."
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
              {(markLoading || markOptions.length > 0) && (
                <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border rounded-md shadow-lg max-h-40 overflow-auto">
                  {markLoading && (
                    <div className="px-3 py-2 text-xs text-gray-500">Searching...</div>
                  )}
                  {!markLoading &&
                    markOptions.map((m) => (
                      <button
                        key={m._id || m.id || m.markId}
                        type="button"
                        onClick={() => selectMark(m)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        {(m.markId || m.mark_id) + (m.name ? `: ${m.name}` : "")}
                      </button>
                    ))}
                </div>
              )}
            </div>
            {nextRepackNumber && (
              <p className="mt-1 text-sm font-mono text-indigo-600 dark:text-indigo-400">
                Next repack #: <strong>{nextRepackNumber}</strong>
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Height (cm) *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className="w-full px-2 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Width (cm) *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={widthCm}
                onChange={(e) => setWidthCm(e.target.value)}
                className="w-full px-2 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Length (cm) *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={lengthCm}
                onChange={(e) => setLengthCm(e.target.value)}
                className="w-full px-2 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                required
              />
            </div>
          </div>
          {calculatedCbm && (
            <p className="text-sm text-green-700 dark:text-green-400">
              Calculated CBM: <strong>{calculatedCbm}</strong> m³
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Member tracking numbers (one per line)
            </label>
            <textarea
              rows={5}
              value={membersText}
              onChange={(e) => setMembersText(e.target.value)}
              className="w-full px-3 py-2 font-mono text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder={"TN001\nTN002\nTN003"}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-2 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              >
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Goods type
              </label>
              <select
                value={goodsType}
                onChange={(e) => setGoodsType(e.target.value)}
                className="w-full px-2 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="normal">Normal</option>
                <option value="special">Special</option>
              </select>
            </div>
          </div>

          {containers.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Container
              </label>
              <select
                value={containerId}
                onChange={(e) => setContainerId(e.target.value)}
                className="w-full px-2 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="">— None —</option>
                {containers.map((c) => (
                  <option key={c.id || c._id} value={c.id || c._id}>
                    {c.container_number || c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Shipping fee (optional)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={shippingFee}
                onChange={(e) => setShippingFee(e.target.value)}
                className="w-full px-2 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                ETA
              </label>
              <input
                type="date"
                value={eta}
                onChange={(e) => setEta(e.target.value)}
                className="w-full px-2 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border rounded-lg dark:border-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create repack"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
