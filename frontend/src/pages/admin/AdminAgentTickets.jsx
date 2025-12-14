import React, { useEffect, useState } from "react";
import API from "../../api";
import { toast } from "../../utils/toast";
import {
  FaEye,
  FaSearch,
  FaSpinner,
  FaClock,
  FaExclamationCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaUser,
  FaEdit,
  FaUserShield,
} from "react-icons/fa";

const AdminAgentTickets = () => {
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [ticketDetails, setTicketDetails] = useState(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [respondingTicket, setRespondingTicket] = useState(null);
  const [adminResponse, setAdminResponse] = useState("");
  const [assignedAdmin, setAssignedAdmin] = useState("");
  const [admins, setAdmins] = useState([]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (search) params.search = search;

      const resp = await API.get("/buysellapi/admin/agent/tickets/", { params });
      let list = Array.isArray(resp.data?.results)
        ? resp.data.results
        : Array.isArray(resp.data)
        ? resp.data
        : [];

      setTickets(list);
    } catch (err) {
      console.error("Failed to load agent tickets", err);
      toast.error("Failed to load agent tickets");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const resp = await API.get("/buysellapi/users/", {
        params: { role: "admin" },
      });
      setAdmins(Array.isArray(resp.data) ? resp.data : []);
    } catch (err) {
      console.error("Failed to load admins", err);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (search !== undefined) {
        fetchTickets();
      }
    }, 500);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleViewTicket = async (ticket) => {
    try {
      const resp = await API.get(`/buysellapi/admin/agent/tickets/${ticket.id}/`);
      setTicketDetails(resp.data);
      setShowDetailsModal(true);
    } catch (err) {
      console.error("Failed to load ticket details", err);
      toast.error("Failed to load ticket details");
    }
  };

  const handleRespond = (ticket) => {
    setRespondingTicket(ticket);
    setAdminResponse(ticket.admin_response || "");
    setAssignedAdmin(ticket.assigned_to_admin?.toString() || "");
    setShowResponseModal(true);
  };

  const handleSubmitResponse = async (e) => {
    e.preventDefault();
    if (!respondingTicket) return;

    try {
      setLoading(true);
      const updateData = {
        admin_response: adminResponse,
        status: respondingTicket.status,
      };

      if (assignedAdmin) {
        updateData.assigned_to_admin = assignedAdmin;
      }

      // If status is being changed, include it
      if (respondingTicket.status !== "resolved" && adminResponse.trim()) {
        updateData.status = "in_progress";
      }

      await API.patch(
        `/buysellapi/admin/agent/tickets/${respondingTicket.id}/`,
        updateData
      );
      toast.success("Ticket updated successfully");
      setShowResponseModal(false);
      setRespondingTicket(null);
      setAdminResponse("");
      setAssignedAdmin("");
      fetchTickets();
    } catch (err) {
      console.error("Failed to update ticket", err);
      toast.error(err.response?.data?.error || "Failed to update ticket");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (ticket, newStatus) => {
    try {
      setLoading(true);
      await API.patch(`/buysellapi/admin/agent/tickets/${ticket.id}/`, {
        status: newStatus,
      });
      toast.success("Ticket status updated");
      fetchTickets();
      if (showDetailsModal && ticketDetails?.id === ticket.id) {
        handleViewTicket(ticket);
      }
    } catch (err) {
      console.error("Failed to update ticket status", err);
      toast.error("Failed to update ticket status");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "resolved":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "closed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
          Agent Tickets
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Manage support tickets from agents
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      {loading && tickets.length === 0 ? (
        <div className="flex justify-center items-center py-12">
          <FaSpinner className="animate-spin text-4xl text-pink-600" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
          <FaTimesCircle className="text-6xl text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            No tickets found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {search || statusFilter || priorityFilter
              ? "Try adjusting your filters"
              : "No agent tickets have been submitted yet"}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Ticket Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {ticket.ticket_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {ticket.subject}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {ticket.created_by_agent_full_name ||
                        ticket.created_by_agent_username ||
                        "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          ticket.status
                        )}`}
                      >
                        {ticket.status?.replace("_", " ").toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                          ticket.priority
                        )}`}
                      >
                        {ticket.priority?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {formatDate(ticket.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewTicket(ticket)}
                          className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400"
                          title="View"
                        >
                          <FaEye />
                        </button>
                        <button
                          onClick={() => handleRespond(ticket)}
                          className="text-pink-600 hover:text-pink-900 dark:hover:text-pink-400"
                          title="Respond"
                        >
                          <FaEdit />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Ticket Modal */}
      {showDetailsModal && ticketDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                  Ticket Details
                </h3>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setTicketDetails(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <FaTimesCircle className="text-2xl" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Ticket Number
                  </label>
                  <p className="text-gray-800 dark:text-white">
                    {ticketDetails.ticket_number}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subject
                  </label>
                  <p className="text-gray-800 dark:text-white">
                    {ticketDetails.subject}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Agent
                  </label>
                  <p className="text-gray-800 dark:text-white">
                    {ticketDetails.created_by_agent_full_name ||
                      ticketDetails.created_by_agent_username ||
                      "N/A"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                        ticketDetails.status
                      )}`}
                    >
                      {ticketDetails.status?.replace("_", " ").toUpperCase()}
                    </span>
                    <select
                      value={ticketDetails.status}
                      onChange={(e) =>
                        handleStatusChange(ticketDetails, e.target.value)
                      }
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priority
                  </label>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(
                      ticketDetails.priority
                    )}`}
                  >
                    {ticketDetails.priority?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Message
                  </label>
                  <p className="text-gray-800 dark:text-white whitespace-pre-wrap bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    {ticketDetails.message}
                  </p>
                </div>
                {ticketDetails.admin_response && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Admin Response
                    </label>
                    <p className="text-gray-800 dark:text-white whitespace-pre-wrap bg-pink-50 dark:bg-pink-900/20 p-3 rounded-lg">
                      {ticketDetails.admin_response}
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Created At
                  </label>
                  <p className="text-gray-800 dark:text-white">
                    {formatDate(ticketDetails.created_at)}
                  </p>
                </div>
                {ticketDetails.assigned_to_admin_full_name && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Assigned To
                    </label>
                    <p className="text-gray-800 dark:text-white">
                      {ticketDetails.assigned_to_admin_full_name}
                    </p>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => handleRespond(ticketDetails)}
                    className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
                  >
                    {ticketDetails.admin_response ? "Update Response" : "Respond"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Respond Modal */}
      {showResponseModal && respondingTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                  Respond to Ticket
                </h3>
                <button
                  onClick={() => {
                    setShowResponseModal(false);
                    setRespondingTicket(null);
                    setAdminResponse("");
                    setAssignedAdmin("");
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <FaTimesCircle className="text-2xl" />
                </button>
              </div>
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {respondingTicket.subject}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {respondingTicket.ticket_number}
                </p>
              </div>
              <form onSubmit={handleSubmitResponse} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Assign to Admin (Optional)
                  </label>
                  <select
                    value={assignedAdmin}
                    onChange={(e) => setAssignedAdmin(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Unassigned</option>
                    {admins.map((admin) => (
                      <option key={admin.id} value={admin.id}>
                        {admin.full_name || admin.username}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Response *
                  </label>
                  <textarea
                    value={adminResponse}
                    onChange={(e) => setAdminResponse(e.target.value)}
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    required
                    placeholder="Enter your response to the agent..."
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowResponseModal(false);
                      setRespondingTicket(null);
                      setAdminResponse("");
                      setAssignedAdmin("");
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? "Saving..." : "Save Response"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAgentTickets;

