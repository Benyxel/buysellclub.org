import React from "react";
import ContainerManagement from "../../components/ContainerManagement";

// Agent containers - reuse the same component but with agent filter
// The backend should filter containers that contain agent trackings
const AgentContainerManagement = () => {
  return (
    <div>
      <div className="mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          View and manage containers containing agent shipments
        </p>
      </div>
      <ContainerManagement />
    </div>
  );
};

export default AgentContainerManagement;

