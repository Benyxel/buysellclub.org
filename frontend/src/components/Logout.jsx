import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Logout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Clear auth data
    localStorage.removeItem("adminToken");
    localStorage.removeItem("token");
    localStorage.removeItem("userData");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("currentUserProfile");
    localStorage.removeItem("userShippingMark");

    // Dispatch custom event to notify Navbar of logout
    window.dispatchEvent(new Event("authChange"));

    // Redirect to login page (toast will be shown by the calling component if needed)
    navigate("/Login", { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-600 dark:text-gray-400">Logging out...</p>
    </div>
  );
};

export default Logout;
