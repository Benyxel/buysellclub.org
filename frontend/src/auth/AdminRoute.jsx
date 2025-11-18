import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import API from "../api";

const AdminRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const check = async () => {
      try {
        const token = localStorage.getItem("token");
        const adminToken = localStorage.getItem("adminToken");
        if (!token && !adminToken) {
          setAllowed(false);
          setLoading(false);
          return;
        }

        // If legacy adminToken is set, allow (fallback)
        if (adminToken) {
          setAllowed(true);
          setUserRole("admin");
          setLoading(false);
          return;
        }

        // Verify via backend role
        const resp = await API.get("/buysellapi/users/me/");
        const role = resp?.data?.role || "user";
        setUserRole(role);
        setAllowed(role === "admin");
      } catch {
        setAllowed(false);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    };
    check();
  }, []);

  useEffect(() => {
    // Show error toast and redirect if user has "user" role
    if (!loading && userRole === "user") {
      toast.error(
        "Access Denied: You don't have permission to access the admin dashboard.",
        {
          position: "top-center",
          autoClose: 4000,
        }
      );
      // Redirect to home after showing the message
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 500);
    }
  }, [loading, userRole, navigate]);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!allowed) {
    // If not authenticated at all, send to admin login
    if (!userRole) {
      return <Navigate to="/admin-login" replace />;
    }
    // If user role, redirect handled by useEffect above
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600">Redirecting to home page...</p>
        </div>
      </div>
    );
  }

  return children;
};

export default AdminRoute;
