import React, { useEffect, useState, useRef } from "react";
import { toast } from "../../utils/toast";
import API from "../../api";
import { FaUserPlus, FaUserMinus, FaUserTag, FaSearch } from "react-icons/fa";
import ConfirmModal from "../../components/shared/ConfirmModal";
import { formatCompactCount } from "../../utils/formatCompactCount";

const USERS_PAGE_SIZE = 20;

export default function AgentManagement() {
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

  // Load users with pagination and optional search; when search term changes we reset to page 1 (via handler)
  useEffect(() => {
    const q = searchTerm.trim();
    const doLoad = () => {
      setUsersLoading(true);
      loadUsers(q || "", usersPage).finally(() => setUsersLoading(false));
    };
    if (q) {
      searchDebounceRef.current = setTimeout(doLoad, 300);
      return () => {
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      };
    }
    doLoad();
  }, [searchTerm, usersPage]);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const resp = await API.get("/buysellapi/admin/agents/");
      setAgents(Array.isArray(resp.data) ? resp.data : []);
    } catch (err) {
      console.error("Failed to load agents", err);
      // Only show error for actual failures (4xx/5xx), not for empty data
      const status = err.response?.status;
      if (status && status >= 400) {
        const errorMsg = err.response?.data?.detail || err.response?.data?.error || err.message || "Failed to load agents";
        toast.error(errorMsg, { toastId: "load-agents-error" });
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
      const response = await API.post("/buysellapi/admin/agents/", { user_id: userToAssign.id });
      toast.success("User assigned as agent successfully!");
      loadAgents();
      loadUsers(searchTerm.trim(), usersPage);
      setShowAssignModal(false);
      setUserToAssign(null);
    } catch (err) {
      console.error("Failed to assign agent", err);
      let errorMsg = "Failed to assign agent";
      
      if (err.response) {
        // Server responded with error
        errorMsg = err.response.data?.detail || 
                   err.response.data?.message || 
                   err.response.data?.error ||
                   `Server error: ${err.response.status}`;
      } else if (err.request) {
        // Request made but no response
        errorMsg = "No response from server. Please check your connection.";
      } else {
        // Something else happened
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
      await API.delete(`/buysellapi/admin/agents/${agentToRemove.id}/`);
      toast.success("Agent status removed successfully!");
      loadAgents();
      loadUsers(searchTerm.trim(), usersPage);
      setShowRemoveModal(false);
      setAgentToRemove(null);
    } catch (err) {
      console.error("Failed to remove agent", err);
      const errorMsg =
        err.response?.data?.detail || "Failed to remove agent";
      toast.error(errorMsg);
    }
  };

  const usersTotalPages = Math.max(1, Math.ceil(usersCount / USERS_PAGE_SIZE));

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setUsersPage(1);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Agent Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Assign and manage agents who can manage users, tracking numbers, and invoices
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      ) : (
        <>
          {/* Current Agents Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Current Agents ({agents.length})
            </h2>
            {agents.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No agents assigned yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Username
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Full Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Assigned At
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {agents.map((agent) => (
                      <tr key={agent.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <FaUserTag className="text-primary mr-2" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {agent.username}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {agent.full_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {agent.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {agent.assigned_at
                            ? new Date(agent.assigned_at).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleRemoveAgentClick(agent)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1 ml-auto"
                          >
                            <FaUserMinus /> Remove Agent
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Assign New Agent Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Assign New Agent
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Search for a user to assign as an agent
            </p>

            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by username, email, or name..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* Users List */}
            {usersLoading ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">Loading users...</p>
            ) : users.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                {searchTerm
                  ? "No users found matching your search."
                  : "No users available to assign as agents."}
              </p>
            ) : (
              <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Username
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Full Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {user.username}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {user.full_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleAssignAgentClick(user)}
                            disabled={assigning}
                            className="text-primary hover:text-primary/80 dark:text-primary-400 dark:hover:text-primary-300 flex items-center gap-1 ml-auto disabled:opacity-50"
                          >
                            <FaUserPlus /> Assign as Agent
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
                    Showing page {usersPage} of{" "}
                    <span title={String(usersTotalPages)}>
                      {formatCompactCount(usersTotalPages)}
                    </span>{" "}
                    (
                    <span title={String(usersCount)}>
                      {formatCompactCount(usersCount)}
                    </span>{" "}
                    user{usersCount !== 1 ? "s" : ""} total)
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
        </>
      )}

      {/* Assign Agent Confirmation Modal */}
      <ConfirmModal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setUserToAssign(null);
        }}
        onConfirm={handleAssignAgent}
        title="Assign as Agent"
        message={
          userToAssign
            ? `Are you sure you want to assign "${userToAssign.username}" (${userToAssign.full_name || userToAssign.email}) as an agent? This will give them access to the Agent Dashboard.`
            : "Are you sure you want to assign this user as an agent?"
        }
        confirmText="Assign"
        cancelText="Cancel"
        type="info"
      />

      {/* Remove Agent Confirmation Modal */}
      <ConfirmModal
        isOpen={showRemoveModal}
        onClose={() => {
          setShowRemoveModal(false);
          setAgentToRemove(null);
        }}
        onConfirm={handleRemoveAgent}
        title="Remove Agent Status"
        message={
          agentToRemove
            ? `Are you sure you want to remove agent status from "${agentToRemove.username}" (${agentToRemove.full_name || agentToRemove.email})? They will lose access to the Agent Dashboard.`
            : "Are you sure you want to remove agent status from this user?"
        }
        confirmText="Remove"
        cancelText="Cancel"
        type="warning"
      />
    </div>
  );
}

