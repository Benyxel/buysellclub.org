import React, { useEffect, useState, useRef } from "react";
import { toast } from "../../utils/toast";
import API from "../../api";
import { FaUserPlus, FaUserMinus, FaUserTag, FaSearch, FaMapMarkerAlt } from "react-icons/fa";
import ConfirmModal from "../../components/shared/ConfirmModal";

const USERS_PAGE_SIZE = 20;

export default function LocalAgentManagement() {
  const [agents, setAgents] = useState([]);
  const [users, setUsers] = useState([]);
  const [usersCount, setUsersCount] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [userToAssign, setUserToAssign] = useState(null);
  const [agentToRemove, setAgentToRemove] = useState(null);
  const searchDebounceRef = useRef(null);

  useEffect(() => {
    loadAgents();
  }, []);

  useEffect(() => {
    const q = searchTerm.trim();
    const doLoad = (query, page) => {
      setUsersLoading(true);
      loadUsers(query, page).finally(() => setUsersLoading(false));
    };
    if (q) {
      searchDebounceRef.current = setTimeout(() => doLoad(q, usersPage), 300);
      return () => {
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      };
    }
    doLoad("", usersPage);
  }, [searchTerm, usersPage]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setUsersPage(1);
  };

  const loadAgents = async () => {
    try {
      setLoading(true);
      const resp = await API.get("/buysellapi/admin/agents/");
      const allAgents = Array.isArray(resp.data) ? resp.data : [];
      // Filter for local agents
      const localAgents = allAgents.filter(
        (agent) => agent.agent_type === "local" || agent.agent_category === "local"
      );
      setAgents(localAgents);
    } catch (err) {
      console.error("Failed to load local agents", err);
      const status = err.response?.status;
      if (status && status >= 400) {
        const errorMsg = err.response?.data?.detail || err.response?.data?.error || err.message || "Failed to load local agents";
        toast.error(errorMsg, { toastId: "load-local-agents-error" });
      }
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async (searchQuery = "", page = 1) => {
    try {
      const params = { page_size: USERS_PAGE_SIZE, page };
      if (searchQuery && searchQuery.trim()) {
        params.q = searchQuery.trim();
      }
      const resp = await API.get("/buysellapi/users/", { params });
      const allUsers = resp.data?.results ?? (Array.isArray(resp.data) ? resp.data : []);
      const total = resp.data?.count ?? allUsers.length;
      setUsersCount(total);
      const nonAgentUsers = allUsers.filter(
        (user) => !user.is_agent && user.role !== "admin"
      );
      setUsers(nonAgentUsers);
    } catch (err) {
      console.error("Failed to load users", err);
      setUsers([]);
      setUsersCount(0);
    }
  };

  const handleAssignAgentClick = (user) => {
    setUserToAssign(user);
    setShowAssignModal(true);
  };

  const handleAssignAgent = async () => {
    if (!userToAssign) return;

    try {
      setAssigning(true);
      await API.post("/buysellapi/admin/agents/", {
        user_id: userToAssign.id,
        agent_type: "local",
      });
      toast.success("User assigned as local agent successfully!");
      loadAgents();
      loadUsers(searchTerm.trim(), usersPage);
      setShowAssignModal(false);
      setUserToAssign(null);
    } catch (err) {
      console.error("Failed to assign local agent", err);
      let errorMsg = "Failed to assign local agent";
      
      if (err.response) {
        errorMsg = err.response.data?.detail || 
                   err.response.data?.message || 
                   err.response.data?.error ||
                   `Server error: ${err.response.status}`;
      } else if (err.request) {
        errorMsg = "No response from server. Please check your connection.";
      } else {
        errorMsg = err.message || "An unexpected error occurred";
      }
      
      toast.error(errorMsg);
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveAgentClick = (agent) => {
    setAgentToRemove(agent);
    setShowRemoveModal(true);
  };

  const handleRemoveAgent = async () => {
    if (!agentToRemove) return;

    try {
      setLoading(true);
      await API.delete(`/buysellapi/admin/agents/${agentToRemove.id || agentToRemove.user_id}/`);
      toast.success("Local agent removed successfully!");
      loadAgents();
      loadUsers(searchTerm.trim(), usersPage);
      setShowRemoveModal(false);
      setAgentToRemove(null);
    } catch (err) {
      console.error("Failed to remove local agent", err);
      const errorMsg = err.response?.data?.detail || 
                      err.response?.data?.error || 
                      "Failed to remove local agent";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const filteredAgents = agents.filter((agent) => {
    const searchLower = searchTerm.toLowerCase();
    const agentData = agent.user || agent;
    return (
      (agentData.username || "").toLowerCase().includes(searchLower) ||
      (agentData.full_name || "").toLowerCase().includes(searchLower) ||
      (agentData.email || "").toLowerCase().includes(searchLower)
    );
  });

  const usersToShow = users;
  const usersTotalPages = Math.max(1, Math.ceil(usersCount / USERS_PAGE_SIZE));

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
          <FaMapMarkerAlt className="text-green-600" />
          Local Agent Management
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Manage local agents who bring goods to the platform
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search local agents below, or type to search all users to add as agent..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Local Agents List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <FaUserTag className="text-green-600" />
          Local Agents ({filteredAgents.length})
        </h3>
        {loading && filteredAgents.length === 0 ? (
          <div className="text-center py-8">Loading local agents...</div>
        ) : filteredAgents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No local agents found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Username
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Full Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Assigned At
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAgents.map((agent) => {
                  const agentData = agent.user || agent;
                  return (
                    <tr key={agent.id || agent.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {agentData.username}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {agentData.full_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {agentData.email}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {agent.assigned_at
                          ? new Date(agent.assigned_at).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => handleRemoveAgentClick(agent)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 flex items-center gap-1"
                        >
                          <FaUserMinus /> Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Available Users to Assign */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <FaUserPlus className="text-green-600" />
          Available Users ({usersToShow.length})
          {searchTerm.trim() && (
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
              — search across all users
            </span>
          )}
        </h3>
        {usersLoading ? (
          <div className="text-center py-8 text-gray-500">Loading users…</div>
        ) : usersToShow.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm.trim()
              ? "No users match your search. Try a different term."
              : "No available users to assign as local agents"}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Username
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Full Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {usersToShow.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {user.username}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {user.full_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {user.email}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => handleAssignAgentClick(user)}
                          className="text-green-600 hover:text-green-800 dark:text-green-400 flex items-center gap-1"
                        >
                          <FaUserPlus /> Assign as Local Agent
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {usersTotalPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Page {usersPage} of {usersTotalPages} ({usersCount} user{usersCount !== 1 ? "s" : ""} total)
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
                    disabled={usersPage <= 1 || usersLoading}
                    className="px-3 py-1.5 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setUsersPage((p) => Math.min(usersTotalPages, p + 1))}
                    disabled={usersPage >= usersTotalPages || usersLoading}
                    className="px-3 py-1.5 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Assign Confirmation Modal */}
      <ConfirmModal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setUserToAssign(null);
        }}
        onConfirm={handleAssignAgent}
        title="Assign Local Agent"
        message={`Are you sure you want to assign ${userToAssign?.username || userToAssign?.full_name} as a local agent?`}
        confirmText={assigning ? "Assigning..." : "Assign"}
        disabled={assigning}
        type="info"
      />

      {/* Remove Confirmation Modal */}
      <ConfirmModal
        isOpen={showRemoveModal}
        onClose={() => {
          setShowRemoveModal(false);
          setAgentToRemove(null);
        }}
        onConfirm={handleRemoveAgent}
        title="Remove Local Agent"
        message={`Are you sure you want to remove ${agentToRemove?.user?.username || agentToRemove?.username} as a local agent?`}
        confirmText={loading ? "Removing..." : "Remove"}
        disabled={loading}
        type="danger"
      />
    </div>
  );
}

