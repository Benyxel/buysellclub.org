import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import API from "../api";
import { FaSpinner } from "react-icons/fa";

const AgentRoute = ({ children }) => {
  const [isAgent, setIsAgent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAgentStatus();
  }, []);

  const checkAgentStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsAgent(false);
        setLoading(false);
        return;
      }

      const response = await API.get("/buysellapi/users/me/");
      setIsAgent(response.data?.is_agent || false);
    } catch (error) {
      console.error("Error checking agent status:", error);
      setIsAgent(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <FaSpinner className="animate-spin text-4xl text-blue-600" />
      </div>
    );
  }

  if (!isAgent) {
    return <Navigate to="/Profile" replace />;
  }

  return children;
};

export default AgentRoute;


