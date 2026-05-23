import React from "react";
import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const adminToken = localStorage.getItem("adminToken");

  if (!token && !adminToken) {
    const redirectTo = location.pathname + location.search;
    return (
      <Navigate to="/Login" replace state={{ redirectTo }} />
    );
  }

  return children;
};

export default ProtectedRoute;
