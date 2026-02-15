import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaClock, FaSignInAlt, FaSignOutAlt, FaUser } from "react-icons/fa";
import { Api } from "../api";
import { toast } from "../utils/toast";

const parseStaffResponse = (data) => {
  const raw =
    data != null
      ? Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data?.data)
            ? data.data
            : []
      : [];
  return raw
    .map((s) => ({
      id: s.id ?? s.pk,
      full_name: s.full_name ?? s.fullName ?? s.name ?? "Unknown",
    }))
    .filter((s) => s.id != null);
};

const StaffClockPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [me, setMe] = useState(null);
  const [authStatus, setAuthStatus] = useState("loading");
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastRecord, setLastRecord] = useState(null);
  const [locationRequired, setLocationRequired] = useState(false);
  const [cardMessage, setCardMessage] = useState(null);

  const loginRedirect = { pathname: "/Login", search: "?redirectTo=/clock", state: { redirectTo: "/clock" } };

  const fetchMe = useCallback(async () => {
    setAuthStatus("loading");
    try {
      const res = await Api.staffClock.me();
      const data = res?.data || res;
      setMe({ id: data.id, full_name: data.full_name ?? "You" });
      setAuthStatus("ok");
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) {
        setAuthStatus("unauthenticated");
        setMe(null);
      } else if (status === 403) {
        setAuthStatus("forbidden");
        setMe(null);
      } else {
        setAuthStatus("error");
        setMe(null);
        toast.error(err.response?.data?.error || "Failed to load. Try again.");
      }
    }
  }, []);

  // Check auth first; redirect to Login if not logged in
  useEffect(() => {
    if (location.pathname !== "/clock") return;
    fetchMe();
  }, [location.pathname, fetchMe]);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      navigate(loginRedirect.pathname + loginRedirect.search, { replace: true, state: loginRedirect.state });
    }
  }, [authStatus, navigate]);

  const fetchStaff = useCallback(async () => {
    setLoadingStaff(true);
    let list = [];
    try {
      const res = await Api.staffClock.staffList();
      list = parseStaffResponse(res?.data);
    } catch (err) {
      console.warn("Staff list (API) failed, trying same-origin fallback:", err);
      try {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const url = `${origin}/buysellapi/staff-clock/staff/`;
        const fallback = await fetch(url, { credentials: "include" });
        if (!fallback.ok) throw new Error(`HTTP ${fallback.status}`);
        const data = await fallback.json();
        list = parseStaffResponse(data);
      } catch (fallbackErr) {
        console.error("Staff list failed:", fallbackErr);
        toast.error("Failed to load staff list. Try again.");
      }
    }
    setStaffList(list);
    setSelectedStaffId((prev) => (list.length > 0 && !prev ? String(list[0].id) : prev));
    setLoadingStaff(false);
  }, []);

  // Only fetch staff list when staff is logged in
  useEffect(() => {
    if (me?.id) fetchStaff();
  }, [me?.id, fetchStaff]);

  // Fetch whether work-location check is enabled (public endpoint)
  useEffect(() => {
    Api.staffClock
      .config()
      .then((res) => setLocationRequired(res?.data?.location_required === true))
      .catch(() => setLocationRequired(false));
  }, []);

  useEffect(() => {
    if (me?.id && staffList.length > 0) {
      const found = staffList.some((s) => Number(s.id) === Number(me.id));
      if (found) setSelectedStaffId(String(me.id));
    }
  }, [me, staffList]);

  const getLocation = () =>
    new Promise((resolve) => {
      if (!navigator?.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 15000, maximumAge: 60000, enableHighAccuracy: true }
      );
    });

  const handleSubmit = async (action) => {
    if (!me?.id) return;
    setCardMessage(null);
    const staffId = selectedStaffId ? parseInt(selectedStaffId, 10) : null;
    if (!staffId) {
      toast.error("Please select your name.");
      return;
    }
    let coords = null;
    try {
      coords = await getLocation();
    } catch {
      coords = null;
    }
    if (locationRequired && !coords) {
      setCardMessage("Location is required to clock in at work. Please enable location access for this site and try again.");
      return;
    }
    try {
      setLoading(true);
      const payload = { action, staff_id: staffId };
      if (coords) {
        payload.latitude = coords.latitude;
        payload.longitude = coords.longitude;
      }
      const res = await Api.staffClock.submit(payload);
      const data = res?.data || {};
      setLastRecord({
        staff_name: data.staff_name,
        action: data.action,
        day: data.day,
        date: data.date,
        time: data.time,
      });
      const actionLabel = data.action === "in" ? "Clocked in" : "Clocked out";
      toast.success(`${actionLabel} at ${data.time}`);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || "Failed to record.";
      const isLocationRejected =
        err.response?.status === 403 &&
        (msg.toLowerCase().includes("work") ||
          msg.toLowerCase().includes("premises") ||
          msg.toLowerCase().includes("far") ||
          msg.toLowerCase().includes("location"));
      if (isLocationRejected) {
        setCardMessage("You must be at the work premises to clock in or out. Please go to the work location and try again.");
      } else if (msg.includes("Location") || msg.includes("location")) {
        setCardMessage("Enable location access for this site to clock in at work.");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Redirecting to login – show minimal loading
  if (authStatus === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-gray-500 dark:text-gray-400">Redirecting to login...</div>
      </div>
    );
  }

  // Must be logged-in staff to see the page
  if (authStatus === "loading" || !me) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (authStatus === "forbidden") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 mb-4">
            <FaClock className="text-2xl" />
          </div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Staff Time Clock</h1>
          <p className="text-amber-600 dark:text-amber-400">
            Only staff (Admin role) can use the clock. Contact an administrator if you should have access.
          </p>
          <Link to="/" className="mt-6 inline-block text-sm text-primary hover:underline">Go to home</Link>
        </div>
      </div>
    );
  }

  if (authStatus === "error") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 text-center">
          <p className="text-gray-700 dark:text-gray-300 mb-4">Something went wrong loading the clock.</p>
          <button
            type="button"
            onClick={fetchMe}
            className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Logged-in staff: show clock UI
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mb-3">
            <FaClock className="text-2xl" />
          </div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Staff Time Clock</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Clock in or out when you arrive or leave.</p>
        </div>

        {loadingStaff ? (
          <div className="py-6 text-center text-gray-500 dark:text-gray-400">Loading...</div>
        ) : (
          <>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Clocking as</label>
            <div className="relative mb-6">
              <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">-- Select name --</option>
                {(staffList.filter((s) => Number(s.id) === Number(me.id)).length > 0
                  ? staffList.filter((s) => Number(s.id) === Number(me.id))
                  : [{ id: me.id, full_name: me.full_name }]
                ).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
            </div>

            {cardMessage && (
              <div className="mb-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-200">{cardMessage}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                type="button"
                onClick={() => handleSubmit("in")}
                disabled={loading || !selectedStaffId}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
              >
                <FaSignInAlt className="w-5 h-5" />
                Clock In
              </button>
              <button
                type="button"
                onClick={() => handleSubmit("out")}
                disabled={loading || !selectedStaffId}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
              >
                <FaSignOutAlt className="w-5 h-5" />
                Clock Out
              </button>
            </div>

            {lastRecord && (
              <div className="rounded-xl bg-gray-100 dark:bg-gray-700/50 p-4 text-center">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {lastRecord.staff_name} — {lastRecord.action === "in" ? "Clocked in" : "Clocked out"}
                </p>
                <p className="text-lg font-bold text-primary mt-1">
                  {lastRecord.day}, {lastRecord.date} at {lastRecord.time}
                </p>
              </div>
            )}

            <p className="text-center mt-4">
              <Link to="/" className="text-sm text-primary hover:underline">Go to home</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default StaffClockPage;
