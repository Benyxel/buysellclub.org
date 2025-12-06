import React, { useState, useEffect } from "react";
import { toast } from "../../utils/toast";
import API from "../../api";

const AgentShippingTracking = () => {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [trackings, setTrackings] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [shippingMark, setShippingMark] = useState("");
  const [shippingMarkId, setShippingMarkId] = useState("");

  useEffect(() => {
    fetchTrackings();
  }, []);

  // Prefetch the agent's permanent shipping mark so the readonly field is populated
  useEffect(() => {
    const fetchMyMark = async () => {
      try {
        const smResp = await API.get("/buysellapi/shipping-marks/me/");
        const sm = smResp?.data;
        if (sm && (sm.shippingMark || (sm.markId && sm.name))) {
          const myMarkFull = sm.shippingMark || `${sm.markId}:${sm.name}`;
          setShippingMark(myMarkFull);
          // determine mark id: prefer explicit sm.markId, otherwise parse from shippingMark
          const myMarkId = sm.markId
            ? String(sm.markId)
            : myMarkFull && myMarkFull.includes(":")
            ? myMarkFull.split(":")[0]
            : myMarkFull;
          setShippingMarkId(myMarkId);
        }
      } catch (e) {
        // ignore if not found; modal will show placeholder and handle error on submit
      }
    };

    fetchMyMark();
  }, []);

  const fetchTrackings = async () => {
    try {
      setLoading(true);
      const response = await API.get("/buysellapi/agent/trackings/");
      if (response.data && Array.isArray(response.data)) {
        setTrackings(response.data);
      }
    } catch (error) {
      console.error("Error fetching trackings:", error);
      setTrackings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTracking = async () => {
    const tn = (trackingNumber || "").toUpperCase().trim();
    if (!tn) {
      setMessage("Please enter a tracking number.");
      return;
    }

    try {
      setLoading(true);

      // 1) Check if tracking already exists in backend (same as regular user flow)
      try {
        await API.get(
          `/buysellapi/trackings/by-number/${encodeURIComponent(tn)}/`
        );
        // If we got here with 200, it exists already
        setMessage(`Tracking number ${tn} already exists in the system.`);
        setTrackingNumber("");
        setLoading(false);
        return;
      } catch (err) {
        if (err?.response?.status && err.response.status !== 404) {
          // Non-404 error (e.g., 401)
          if (err.response.status === 401) {
            setMessage("Please log in to add a new shipment.");
            setLoading(false);
            return;
          } else {
            setMessage("Could not verify tracking status. Please try again.");
            setLoading(false);
            return;
          }
        }
        // 404 is expected - tracking doesn't exist yet, continue
      }

      // 2) Fetch the agent's permanent shipping mark (if not already loaded).
      let smark = "N/A";
      try {
        if (!shippingMark) {
          const smResp = await API.get("/buysellapi/shipping-marks/me/");
          const sm = smResp?.data;
          if (sm && (sm.shippingMark || (sm.markId && sm.name))) {
            const myMark = sm.shippingMark || `${sm.markId}:${sm.name}`;
            setShippingMark(myMark);
            smark = myMark;
          } else {
            setMessage(
              "Please generate your shipping address first so we can use your permanent shipping mark."
            );
            setLoading(false);
            return;
          }
        } else {
          smark = shippingMark;
        }
      } catch (e) {
        if (e?.response?.status === 404) {
          setMessage(
            "Please generate your shipping address first so we can use your permanent shipping mark."
          );
          setLoading(false);
          return;
        }
      }

      // 3) Create in backend with sensible defaults (same as regular user flow)
      // Use the mark id (not the full shipping string) for backend and storage
      const markIdForPayload =
        shippingMarkId || (smark ? extractMarkId(smark) : "");
      const payload = {
        tracking_number: tn,
        shipping_mark: markIdForPayload,
        status: "pending",
        cbm: 0,
        action: "",
      };

      const res = await API.post("/buysellapi/agent/trackings/", payload);
      if (res.status === 201 || res.status === 200) {
        setMessage(`Tracking number ${tn} has been added successfully.`);
        setTrackingNumber("");
        // Close modal when adding from modal
        setShowAddForm(false);

        // Store in localStorage for agent tracking tab (same pattern as regular users)
        try {
          const stored = localStorage.getItem("agentTrackings");
          let storedTrackings = [];
          if (stored) {
            storedTrackings = JSON.parse(stored);
          }

          // Add new tracking to localStorage
          const markIdForStorage =
            shippingMarkId || (smark ? extractMarkId(smark) : "");
          const newTracking = {
            TrackingNum: tn,
            ShippingMark: markIdForStorage,
            Status: "Pending",
            CBM: "",
            Action: "",
            AddedDate: new Date().toISOString(),
            LastUpdated: new Date().toISOString(),
            id: Date.now(),
          };

          storedTrackings.push(newTracking);
          localStorage.setItem(
            "agentTrackings",
            JSON.stringify(storedTrackings)
          );
          console.log("✅ Saved to localStorage:", newTracking);
          console.log("📦 Total trackings in storage:", storedTrackings.length);
        } catch (e) {
          console.error("❌ Failed to save to localStorage:", e);
        }

        // Refresh trackings from backend
        await fetchTrackings();
        return;
      }
      setMessage("Unexpected response from server. Please try again.");
    } catch (err) {
      if (err?.response?.status === 401) {
        setMessage("Please log in to add a new shipment.");
      } else if (err?.response?.status === 400) {
        // Likely validation error such as duplicate or required fields
        const data = err.response.data || {};
        if (data.tracking_number) {
          setMessage(`Tracking number ${tn} already exists.`);
        } else {
          setMessage("Invalid data. Please check and try again.");
        }
      } else {
        setMessage("Failed to add shipment. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatStatus = (status) => {
    const statusMap = {
      pending: "Pending",
      in_transit: "In Transit",
      arrived: "Arrived(China)",
      vessel: "On The Vessel",
      clearing: "Clearing",
      arrived_ghana: "Arrived(Ghana)",
      off_loading: "Off Loading",
      pick_up: "Pick up",
    };
    return statusMap[status] || status;
  };

  const extractMarkId = (fullMark) => {
    if (!fullMark) return "";
    try {
      if (typeof fullMark === "string" && fullMark.includes(":")) {
        return fullMark.split(":")[0];
      }
      return String(fullMark);
    } catch (e) {
      return String(fullMark);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
        Agent Shipping Tracking
      </h2>

      {/* Add New Shipment moved to Shipping page and Profile tracking tab */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1 text-gray-700 dark:text-gray-300">
            Add New Shipment
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Add a shipment directly from the agent dashboard.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2"
            title="Open Add Shipment form"
          >
            Add Shipping
          </button>
          <button
            onClick={fetchTrackings}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            title="Refresh trackings"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Add Shipment Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">
                Add New Shipment
              </h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label="Close add shipment form"
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddTracking();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tracking Number
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  User Mark ID (readonly)
                </label>
                <input
                  type="text"
                  value={shippingMarkId || "(agent mark will be used)"}
                  readOnly
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-white"
                />
              </div>

              {/* Only two fields: Tracking Number and readonly User Mark ID (lookup) */}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  {loading ? "Adding..." : "Add Shipment"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Trackings List */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">
          Your Trackings
        </h3>
        {loading && trackings.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">
            Loading trackings...
          </p>
        ) : trackings.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">
            No trackings found. Add a tracking number above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Tracking Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Shipping Mark
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    CBM
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Shipping Fee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Date Added
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {trackings.map((tracking) => (
                  <tr key={tracking.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {tracking.tracking_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {tracking.shipping_mark
                        ? extractMarkId(tracking.shipping_mark)
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {formatStatus(tracking.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {tracking.cbm || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {tracking.shipping_fee
                        ? `$${tracking.shipping_fee}`
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {tracking.date_added
                        ? new Date(tracking.date_added).toLocaleDateString()
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentShippingTracking;
