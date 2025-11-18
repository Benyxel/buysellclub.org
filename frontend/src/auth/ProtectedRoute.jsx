import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  // Check if user has a valid token in localStorage
  const token = localStorage.getItem("token");
  const adminToken = localStorage.getItem("adminToken");

  // Debug: Log token status
  console.log("ProtectedRoute - Token check:", {
    hasToken: !!token,
    hasAdminToken: !!adminToken,
    token: token,
    adminToken: adminToken,
  });

  // If no token, redirect to login page
  if (!token && !adminToken) {
    console.log("ProtectedRoute - No token found, redirecting to /Login");
    return <Navigate to="/Login" replace />;
  }

  // If token exists, allow access
  console.log("ProtectedRoute - Token found, allowing access");
  return children;
};

export default ProtectedRoute;
