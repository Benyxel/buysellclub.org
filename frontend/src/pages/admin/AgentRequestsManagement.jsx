import React, { useState, useEffect } from "react";
import {
  FaEye,
  FaCheck,
  FaTimes,
  FaSearch,
  FaUserTag,
  FaSpinner,
  FaBuilding,
  FaMapMarkerAlt,
  FaHandshake,
  FaDownload,
  FaFile,
} from "react-icons/fa";
import { toast } from "react-toastify";
import API from "../../api";
import ConfirmModal from "../../components/shared/ConfirmModal";

const AgentRequestsManagement = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [requestToAction, setRequestToAction] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchAgentRequests();
  }, []);

  const fetchAgentRequests = async () => {
    try {
      setLoading(true);
      // Fetch agent requests (requests to become agents)
      const response = await API.get("/buysellapi/admin/agent-requests/");
      const requestsData = Array.isArray(response.data) 
        ? response.data 
        : Array.isArray(response.data?.results) 
        ? response.data.results 
        : [];

      // Transform data
      const transformedRequests = requestsData.map((request) => ({
        id: request.id,
        userId: request.user_id || request.user?.id,
        userName: request.user_name || request.user?.username || request.user?.full_name || "Unknown User",
        userEmail: request.user_email || request.user?.email || "",
        agentType: request.agent_type || "corporate",
        status: request.status || "pending",
        message: request.message || "",
        businessName: request.business_name || "",
        location: request.location || "",
        phoneNumber: request.phone_number || request.phone || "",
        businessCert: request.business_cert || request.business_certificate || "",
        ghanaCard: request.ghana_card || "",
        createdAt: request.created_at || request.createdAt,
        updatedAt: request.updated_at || request.updatedAt,
        ...request, // Include all other fields
      }));

      setRequests(transformedRequests);
    } catch (error) {
      console.error("Error fetching agent requests:", error);
      toast.error("Failed to fetch agent requests");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewRequest = (request) => {
    setSelectedRequest(request);
  };

  const handleCloseModal = () => {
    setSelectedRequest(null);
  };

  const handleApprove = async () => {
    if (!requestToAction) return;

    try {
      setProcessing(true);
      // Approve the agent request and assign user as agent
      await API.post(`/buysellapi/admin/agent-requests/${requestToAction.id}/approve/`, {
        agent_type: requestToAction.agentType,
      });

      toast.success("Agent request approved successfully! User has been assigned as agent.");
      setShowApproveModal(false);
      setRequestToAction(null);
      fetchAgentRequests();
    } catch (error) {
      console.error("Error approving agent request:", error);
      const errorMsg = 
        error.response?.data?.detail ||
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to approve agent request";
      toast.error(errorMsg);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!requestToAction) return;

    try {
      setProcessing(true);
      // Reject the agent request
      await API.post(`/buysellapi/admin/agent-requests/${requestToAction.id}/reject/`);

      toast.success("Agent request rejected.");
      setShowRejectModal(false);
      setRequestToAction(null);
      fetchAgentRequests();
    } catch (error) {
      console.error("Error rejecting agent request:", error);
      const errorMsg = 
        error.response?.data?.detail ||
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to reject agent request";
      toast.error(errorMsg);
    } finally {
      setProcessing(false);
    }
  };

  const getAgentTypeIcon = (type) => {
    switch (type) {
      case "corporate":
        return <FaBuilding className="text-blue-600" />;
      case "local":
        return <FaMapMarkerAlt className="text-green-600" />;
      case "affiliate":
        return <FaHandshake className="text-purple-600" />;
      default:
        return <FaUserTag className="text-gray-600" />;
    }
  };

  const getAgentTypeLabel = (type) => {
    switch (type) {
      case "corporate":
        return "Corporate Agent";
      case "local":
        return "Local Agent";
      case "affiliate":
        return "Affiliate Agent";
      default:
        return "Agent";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    }
  };

  const filteredRequests = requests
    .filter(
      (request) => statusFilter === "all" || request.status === statusFilter
    )
    .filter((request) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (request.userName || "").toLowerCase().includes(searchLower) ||
        (request.userEmail || "").toLowerCase().includes(searchLower) ||
        (request.businessName || "").toLowerCase().includes(searchLower) ||
        getAgentTypeLabel(request.agentType).toLowerCase().includes(searchLower)
      );
    });

  if (loading && requests.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <FaSpinner className="animate-spin text-4xl text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
            <FaUserTag className="text-blue-600" />
            Agent Requests Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Review and manage requests from users who want to become agents
          </p>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center space-x-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search agent requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <button
              onClick={fetchAgentRequests}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Requests Table */}
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <FaUserTag className="mx-auto text-4xl text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No agent requests found
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Agent Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Business Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredRequests.map((request) => (
                  <tr
                    key={request.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-4 py-3 text-sm">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {request.userName}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400 text-xs">
                          {request.userEmail}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        {getAgentTypeIcon(request.agentType)}
                        <span className="text-gray-900 dark:text-white">
                          {getAgentTypeLabel(request.agentType)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          request.status
                        )}`}
                      >
                        {request.status || "pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {request.businessName || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {request.createdAt
                        ? new Date(request.createdAt).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewRequest(request)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                          title="View Details"
                        >
                          <FaEye />
                        </button>
                        {request.status === "pending" && (
                          <>
                            <button
                              onClick={() => {
                                setRequestToAction(request);
                                setShowApproveModal(true);
                              }}
                              className="text-green-600 hover:text-green-800 dark:text-green-400"
                              title="Approve"
                            >
                              <FaCheck />
                            </button>
                            <button
                              onClick={() => {
                                setRequestToAction(request);
                                setShowRejectModal(true);
                              }}
                              className="text-red-600 hover:text-red-800 dark:text-red-400"
                              title="Reject"
                            >
                              <FaTimes />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Request Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={handleCloseModal}
            ></div>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    {getAgentTypeIcon(selectedRequest.agentType)}
                    Agent Request Details
                  </h3>
                  <button
                    onClick={handleCloseModal}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <FaTimes />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        User Name
                      </label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        {selectedRequest.userName}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Email
                      </label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        {selectedRequest.userEmail}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Agent Type
                      </label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white flex items-center gap-2">
                        {getAgentTypeIcon(selectedRequest.agentType)}
                        {getAgentTypeLabel(selectedRequest.agentType)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Status
                      </label>
                      <p className="mt-1">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            selectedRequest.status
                          )}`}
                        >
                          {selectedRequest.status || "pending"}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Corporate Agent Specific Fields */}
                  {selectedRequest.agentType === "corporate" && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                        Corporate Agent Information
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Business Name
                          </label>
                          <p className="mt-1 text-sm text-gray-900 dark:text-white">
                            {selectedRequest.businessName || "-"}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Location
                          </label>
                          <p className="mt-1 text-sm text-gray-900 dark:text-white">
                            {selectedRequest.location || "-"}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Phone Number
                          </label>
                          <p className="mt-1 text-sm text-gray-900 dark:text-white">
                            {selectedRequest.phoneNumber || "-"}
                          </p>
                        </div>
                      </div>

                      {/* Business Certificate */}
                      {selectedRequest.businessCert && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Business Certificate
                          </label>
                          <div className="flex items-center gap-2">
                            <FaFile className="text-gray-400" />
                            <span className="text-sm text-gray-900 dark:text-white">
                              {typeof selectedRequest.businessCert === 'string' 
                                ? selectedRequest.businessCert.split('/').pop() 
                                : 'Business Certificate'}
                            </span>
                            {typeof selectedRequest.businessCert === 'string' && (
                              <a
                                href={selectedRequest.businessCert}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-1"
                              >
                                <FaDownload /> Download
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Ghana Card */}
                      {selectedRequest.ghanaCard && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Ghana Card
                          </label>
                          <div className="flex items-center gap-2">
                            <FaFile className="text-gray-400" />
                            <span className="text-sm text-gray-900 dark:text-white">
                              {typeof selectedRequest.ghanaCard === 'string' 
                                ? selectedRequest.ghanaCard.split('/').pop() 
                                : 'Ghana Card'}
                            </span>
                            {typeof selectedRequest.ghanaCard === 'string' && (
                              <a
                                href={selectedRequest.ghanaCard}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-1"
                              >
                                <FaDownload /> Download
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message */}
                  {selectedRequest.message && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Additional Message
                      </label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                        {selectedRequest.message}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Created At
                      </label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        {selectedRequest.createdAt
                          ? new Date(selectedRequest.createdAt).toLocaleString()
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Updated At
                      </label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        {selectedRequest.updatedAt
                          ? new Date(selectedRequest.updatedAt).toLocaleString()
                          : "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                {selectedRequest.status === "pending" && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setRequestToAction(selectedRequest);
                        setShowApproveModal(true);
                        handleCloseModal();
                      }}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      <FaCheck className="mr-2" /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRequestToAction(selectedRequest);
                        setShowRejectModal(true);
                        handleCloseModal();
                      }}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      <FaTimes className="mr-2" /> Reject
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      <ConfirmModal
        isOpen={showApproveModal}
        onClose={() => {
          setShowApproveModal(false);
          setRequestToAction(null);
        }}
        onConfirm={handleApprove}
        title="Approve Agent Request"
        message={
          requestToAction
            ? `Are you sure you want to approve ${requestToAction.userName}'s request to become a ${getAgentTypeLabel(requestToAction.agentType)}? This will assign them as an agent.`
            : "Are you sure you want to approve this agent request?"
        }
        confirmText={processing ? "Approving..." : "Approve"}
        type="info"
        disabled={processing}
      />

      {/* Reject Confirmation Modal */}
      <ConfirmModal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setRequestToAction(null);
        }}
        onConfirm={handleReject}
        title="Reject Agent Request"
        message={
          requestToAction
            ? `Are you sure you want to reject ${requestToAction.userName}'s request to become a ${getAgentTypeLabel(requestToAction.agentType)}?`
            : "Are you sure you want to reject this agent request?"
        }
        confirmText={processing ? "Rejecting..." : "Reject"}
        type="danger"
        disabled={processing}
      />
    </div>
  );
};

export default AgentRequestsManagement;
