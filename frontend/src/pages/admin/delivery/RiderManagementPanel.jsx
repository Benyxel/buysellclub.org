import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  FaPlus,
  FaUserTag,
  FaSearch,
  FaSpinner,
  FaUserMinus,
} from "react-icons/fa";
import { toast } from "../../../utils/toast";
import API from "../../../api";

function normalizeUserListResponse(resp) {
  const d = resp?.data;
  if (d && typeof d === "object" && "results" in d) {
    return Array.isArray(d.results) ? d.results : [];
  }
  if (Array.isArray(d)) return d;
  return [];
}

/**
 * Admin: delivery riders are existing users with `is_rider=true`.
 * Add rider = pick a user from the database and enable rider flag.
 */
const RiderManagementPanel = () => {
  const [riders, setRiders] = useState([]);
  const [loadingRiders, setLoadingRiders] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [candidateQuery, setCandidateQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const debounceRef = useRef(null);

  const loadRiders = useCallback(async () => {
    setLoadingRiders(true);
    try {
      const resp = await API.get("/buysellapi/users/", {
        params: {
          delivery_riders_only: 1,
          page_size: 500,
        },
        noCache: true,
      });
      setRiders(normalizeUserListResponse(resp));
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        "Could not load riders.";
      toast.error(typeof msg === "string" ? msg : "Could not load riders.");
      setRiders([]);
    } finally {
      setLoadingRiders(false);
    }
  }, []);

  useEffect(() => {
    loadRiders();
  }, [loadRiders]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQ(candidateQuery.trim());
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [candidateQuery]);

  const loadCandidates = useCallback(async () => {
    if (!showAddModal) return;
    setLoadingCandidates(true);
    try {
      const params = {
        delivery_rider_candidates: 1,
        page_size: 100,
      };
      if (debouncedQ.length >= 1) {
        params.q = debouncedQ;
      }
      const resp = await API.get("/buysellapi/users/", {
        params,
        noCache: true,
      });
      setCandidates(normalizeUserListResponse(resp));
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        "Could not load users.";
      toast.error(typeof msg === "string" ? msg : "Could not load users.");
      setCandidates([]);
    } finally {
      setLoadingCandidates(false);
    }
  }, [showAddModal, debouncedQ]);

  useEffect(() => {
    if (!showAddModal) return;
    loadCandidates();
  }, [showAddModal, loadCandidates]);

  const closeModal = useCallback(() => {
    setShowAddModal(false);
    setCandidateQuery("");
    setDebouncedQ("");
    setCandidates([]);
    setSelectedCandidateId(null);
  }, []);

  const handleAddRider = async (e) => {
    e.preventDefault();
    if (!selectedCandidateId) {
      toast.error("Select a user from the list.");
      return;
    }
    setSaving(true);
    try {
      await API.put(`/buysellapi/users/${selectedCandidateId}/update/`, {
        is_rider: true,
      });
      toast.success("User is now a delivery rider.");
      closeModal();
      loadRiders();
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to update user.";
      toast.error(typeof msg === "string" ? msg : "Failed to update user.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveRider = async (user) => {
    if (!user?.id) return;
    const label = user.full_name || user.username || "this user";
    if (
      !window.confirm(
        `Remove delivery rider role from ${label}? They will keep their account.`
      )
    ) {
      return;
    }
    setRemovingId(user.id);
    try {
      await API.put(`/buysellapi/users/${user.id}/update/`, {
        is_rider: false,
      });
      toast.success("Rider role removed.");
      loadRiders();
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        "Failed to update user.";
      toast.error(typeof msg === "string" ? msg : "Failed to update user.");
    } finally {
      setRemovingId(null);
    }
  };

  const displayName = (u) =>
    (u.full_name && String(u.full_name).trim()) || u.username || `User #${u.id}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
          Riders are normal users flagged in the database. Use{" "}
          <strong>Add rider</strong> to choose an existing user; they will see the Rider
          tab in their profile after refresh or next login.
        </p>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        >
          <FaPlus className="w-4 h-4" />
          Add rider
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loadingRiders ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    <FaSpinner className="w-6 h-6 animate-spin inline mr-2" />
                    Loading riders…
                  </td>
                </tr>
              ) : riders.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-16 text-center text-gray-500 dark:text-gray-400"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <FaUserTag className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        No riders yet
                      </span>
                      <span className="text-sm max-w-md">
                        Add a rider by selecting an existing user from your database.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                riders.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {displayName(user)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 font-mono">
                      {user.username || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {user.contact || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 break-all">
                      {user.email || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 capitalize">
                      {user.status || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveRider(user)}
                        disabled={removingId === user.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-50"
                      >
                        {removingId === user.id ? (
                          <FaSpinner className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FaUserMinus className="w-3.5 h-3.5" />
                        )}
                        Remove rider
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-rider-title"
          >
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3
                id="add-rider-title"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                Add rider from users
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddRider} className="px-6 py-4 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Search by name, username, email, phone, or shipping mark. Admin accounts
                are not listed. Users who are already riders appear only in the table
                above.
              </p>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="search"
                  value={candidateQuery}
                  onChange={(e) => setCandidateQuery(e.target.value)}
                  placeholder="Search users…"
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 pl-10 pr-3 py-2 text-sm text-gray-900 dark:text-white"
                  autoFocus
                />
              </div>
              <div className="border border-gray-200 dark:border-gray-600 rounded-md max-h-64 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-600">
                {loadingCandidates ? (
                  <div className="p-6 text-center text-sm text-gray-500">
                    <FaSpinner className="w-5 h-5 animate-spin inline mr-2" />
                    Loading users…
                  </div>
                ) : candidates.length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-500">
                    No users match. Try another search or leave search empty to see recent
                    non-admin users.
                  </div>
                ) : (
                  candidates.map((u) => (
                    <label
                      key={u.id}
                      className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/40 ${
                        selectedCandidateId === u.id
                          ? "bg-blue-50 dark:bg-blue-900/20"
                          : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="rider-candidate"
                        checked={selectedCandidateId === u.id}
                        onChange={() => setSelectedCandidateId(u.id)}
                        className="mt-1"
                      />
                      <span className="min-w-0 text-sm">
                        <span className="font-medium text-gray-900 dark:text-white block">
                          {displayName(u)}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400 text-xs">
                          @{u.username}
                          {u.email ? ` · ${u.email}` : ""}
                          {u.contact ? ` · ${u.contact}` : ""}
                        </span>
                      </span>
                    </label>
                  ))
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !selectedCandidateId}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <FaSpinner className="w-4 h-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Make rider"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiderManagementPanel;
