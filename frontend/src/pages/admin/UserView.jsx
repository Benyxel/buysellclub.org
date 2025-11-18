import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaIdBadge,
  FaClock,
} from "react-icons/fa";
import { toast } from "react-toastify";
import API from "../../api";

const UserView = () => {
  const { markId } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserByMarkId = React.useCallback(async () => {
    try {
      setLoading(true);
      // Fetch all users and find the one with matching mark_id
      const resp = await API.get("/buysellapi/users/");
      const users = Array.isArray(resp.data) ? resp.data : [];

      console.log("Searching for markId:", markId);
      console.log(
        "All users:",
        users.map((u) => ({
          username: u.username,
          has_shipping_mark: !!u.shipping_mark,
          shipping_mark_obj: u.shipping_mark,
        }))
      );
      console.log(
        "Users with shipping marks:",
        users
          .filter((u) => u.shipping_mark)
          .map((u) => ({
            username: u.username,
            mark_id: u.shipping_mark?.mark_id,
            mark_name: u.shipping_mark?.name,
            full_mark: u.shipping_mark,
          }))
      );

      // Try to match by mark_id or by the full "markId:name" format
      const matchedUser = users.find((u) => {
        if (!u.shipping_mark) return false;

        // Check if shipping_mark is a string (like "FIM639:John Doe") or an object
        if (typeof u.shipping_mark === "string") {
          const markLower = u.shipping_mark.toLowerCase();
          const searchLower = markId?.toLowerCase();

          // Direct match
          if (markLower === searchLower) return true;

          // Match the part before the colon
          const markIdPart = u.shipping_mark.split(":")[0].toLowerCase();
          if (markIdPart === searchLower) return true;

          return false;
        }

        // If it's an object with mark_id property
        const userMarkId = u.shipping_mark.mark_id?.toLowerCase();
        const searchMarkId = markId?.toLowerCase();

        // Direct match
        if (userMarkId === searchMarkId) return true;

        // Match against "markId:name" format
        const fullMark =
          `${u.shipping_mark.mark_id}:${u.shipping_mark.name}`.toLowerCase();
        if (fullMark === searchMarkId) return true;

        // Match if the search string is part of the mark
        if (fullMark.includes(searchMarkId)) return true;

        return false;
      });

      if (matchedUser) {
        setUser(matchedUser);
      } else {
        console.error("No user found for markId:", markId);
        toast.error("User not found with this shipping mark");
        // User not found - just show the "not found" UI
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      toast.error("Failed to fetch user details");
    } finally {
      setLoading(false);
    }
  }, [markId]);

  useEffect(() => {
    fetchUserByMarkId();
  }, [fetchUserByMarkId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-blue-500 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <FaUser className="text-blue-500 text-2xl animate-pulse" />
            </div>
          </div>
          <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">
            Loading user profile...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
        <div className="text-center bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaUser className="text-4xl text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            User Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We couldn't find a user with this shipping mark.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            You can close this tab and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              User Profile
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Detailed information about this user
            </p>
          </div>
        </div>

        {/* User Profile Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
          {/* Hero Header Section with Animated Gradient */}
          <div className="relative bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 p-8 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/50 to-purple-600/50 animate-pulse"></div>
            <div className="relative z-10 flex items-center gap-6">
              <div className="relative">
                <div className="w-28 h-28 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center ring-4 ring-white/30 shadow-2xl">
                  <FaUser className="text-5xl text-white" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-400 rounded-full border-4 border-white dark:border-gray-800 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">✓</span>
                </div>
              </div>
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
                  {user.full_name}
                </h1>
                <p className="text-xl text-blue-100 font-medium mb-3">
                  @{user.username}
                </p>
                <div className="flex flex-wrap gap-3">
                  <span
                    className={`px-4 py-1.5 text-sm font-semibold rounded-full shadow-lg ${
                      user.role === "admin"
                        ? "bg-purple-400 text-white"
                        : "bg-white text-blue-600"
                    }`}
                  >
                    {user.role?.toUpperCase()}
                  </span>
                  <span
                    className={`px-4 py-1.5 text-sm font-semibold rounded-full shadow-lg ${
                      user.status === "active"
                        ? "bg-green-400 text-white"
                        : "bg-red-400 text-white"
                    }`}
                  >
                    {user.status?.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Details Section with Cards */}
          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Contact Information Card */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center shadow-md">
                    <FaEnvelope className="text-white text-xl" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Contact Info
                  </h2>
                </div>

                <div className="space-y-4">
                  <div className="group">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                      Email Address
                    </p>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm break-all group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {user.email}
                    </p>
                  </div>

                  <div className="group">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                      Phone Number
                    </p>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                      {user.contact || "Not provided"}
                    </p>
                  </div>

                  <div className="group">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                      Location
                    </p>
                    <div className="flex items-center gap-2">
                      <FaMapMarkerAlt className="text-red-500" />
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">
                        {user.location || "Not provided"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Information Card */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center shadow-md">
                    <FaClock className="text-white text-xl" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Account Details
                  </h2>
                </div>

                <div className="space-y-4">
                  <div className="group">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                      Created Date
                    </p>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )
                        : "N/A"}
                    </p>
                  </div>

                  <div className="group">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                      Last Login
                    </p>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">
                      {user.last_login
                        ? new Date(user.last_login).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )
                        : "Never"}
                    </p>
                  </div>

                  <div className="group">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                      User ID
                    </p>
                    <p className="font-mono font-semibold text-gray-900 dark:text-white text-sm">
                      #{user.id}
                    </p>
                  </div>
                </div>
              </div>

              {/* Shipping Mark Card - Highlighted */}
              {user.shipping_mark ? (
                <div className="relative bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-900/20 dark:via-orange-900/20 dark:to-yellow-900/20 rounded-xl p-6 border-2 border-amber-300 dark:border-amber-700 shadow-xl overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-400/20 to-orange-400/20 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center shadow-md">
                        <FaIdBadge className="text-white text-xl" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Shipping Mark
                      </h2>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                          Mark ID
                        </p>
                        <p className="text-3xl font-bold font-mono text-amber-700 dark:text-amber-300 tracking-tight">
                          {user.shipping_mark.mark_id}
                        </p>
                      </div>

                      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                          Mark Name
                        </p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {user.shipping_mark.name}
                        </p>
                      </div>

                      {user.shipping_mark.created_at && (
                        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                            Assigned Date
                          </p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {new Date(
                              user.shipping_mark.created_at
                            ).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-100 dark:bg-gray-700/50 rounded-xl p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center">
                  <FaIdBadge className="text-6xl text-gray-400 dark:text-gray-500 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 font-semibold">
                    No Shipping Mark Assigned
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                    This user doesn't have a shipping mark yet
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserView;
