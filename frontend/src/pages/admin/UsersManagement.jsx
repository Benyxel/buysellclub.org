import React, { useState, useEffect } from "react";
import {
  FaEdit,
  FaTrash,
  FaUserPlus,
  FaSearch,
  FaTimes,
  FaUsers,
} from "react-icons/fa";
import { toast } from "react-toastify";
import API from "../../api";
import ConfirmModal from "../../components/shared/ConfirmModal";
import BulkActions from "../../components/shared/BulkActions";

const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuper, setIsSuper] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userIdToDelete, setUserIdToDelete] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  // Add user form (matches backend /user/register/ fields)
  const [addForm, setAddForm] = useState({
    username: "",
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
    contact: "",
    location: "",
  });
  // Edit user form (admin updates limited fields)
  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    role: "user",
    status: "active",
    contact: "",
    location: "",
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Use shared API wrapper (adds JWT automatically)
      const resp = await API.get("/buysellapi/users/");
      const data = Array.isArray(resp.data) ? resp.data : [];
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
      if (error.response?.status === 401) {
        toast.error("Unauthorized. Please log in again.");
      } else {
        toast.error("Failed to fetch users");
      }
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        // Determine if current user is admin
        const me = await API.get("/buysellapi/users/me/");
        setIsAdmin((me?.data?.role || "user") === "admin");
        setIsSuper(Boolean(me?.data?.is_superuser));
      } catch {
        setIsAdmin(false);
      }
      fetchUsers();
    };
    init();
  }, []);

  // Manage Tabs modal state (superadmin-only feature)
  const [showManageTabsModal, setShowManageTabsModal] = useState(false);
  const [manageTabsUser, setManageTabsUser] = useState(null);
  const [allTabs, setAllTabs] = useState([]);
  const [assignedTabs, setAssignedTabs] = useState(new Set());
  const [tabsLoading, setTabsLoading] = useState(false);

  // Define all available menu items as tabs
  const availableMenuItems = [
    { label: "Dashboard", section: "dashboard" },
    { label: "Users", section: "users" },
    { label: "Shipping", section: "shipping" },
    { label: "Alipay Payments", section: "alipay-payments" },
    { label: "Buy4me", section: "buy4me" },
    { label: "Orders", section: "orders" },
    { label: "Products", section: "products" },
    { label: "Categories", section: "categories" },
    { label: "Training", section: "training" },
    { label: "YouTube", section: "youtube" },
    { label: "Quick Orders", section: "quick-orders" },
    { label: "Messages", section: "messages" },
    { label: "Analytics", section: "analytics" },
    { label: "Staff", section: "staff" },
    { label: "Settings", section: "settings" },
  ];

  const openManageTabs = async (user) => {
    if (!isSuper)
      return toast.error("Only superadmins can manage dashboard tabs");
    setManageTabsUser(user);
    setShowManageTabsModal(true);
    setTabsLoading(true);
    try {
      let dbTabs = [];
      let userTabs = [];
      
      // Try to fetch all tabs
      try {
        const allResp = await API.get("/buysellapi/dashboard-tabs/all/");
        dbTabs = Array.isArray(allResp.data) ? allResp.data : [];
      } catch (allErr) {
        console.warn("Failed to fetch all tabs:", allErr);
        // Continue with empty array - we'll show menu items as fallback
      }
      
      // Try to fetch user's assigned tabs
      try {
        const userResp = await API.get(
          `/buysellapi/dashboard-tabs/user/${user.id}/`
        );
        userTabs = Array.isArray(userResp.data) ? userResp.data : [];
      } catch (userErr) {
        console.warn("Failed to fetch user tabs:", userErr);
        // Continue with empty array
      }
      
      // Merge menu items with database tabs
      // Create a map of existing tabs from DB
      const dbTabsMap = new Map(dbTabs.map(t => [t.slug, t]));
      
      // Create combined list: use DB tab if exists, otherwise use menu item
      const combinedTabs = availableMenuItems.map((menuItem, idx) => {
        const dbTab = dbTabsMap.get(menuItem.section);
        if (dbTab) {
          return dbTab;
        }
        // Return menu item as tab structure (not yet in DB)
        return {
          name: menuItem.label,
          slug: menuItem.section,
          description: menuItem.label,
          order: idx,
          is_active: true,
          assigned_to_all_admins: false,
          _existsInDb: false, // Flag to indicate this tab doesn't exist in DB yet
        };
      });
      
      setAllTabs(combinedTabs);
      setAssignedTabs(new Set(userTabs.map((t) => t.slug)));
    } catch (err) {
      console.error("Error loading tabs:", err);
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || err.message || "Failed to load dashboard tabs";
      toast.error(`Failed to load dashboard tabs: ${errorMsg}`);
      // Even on error, show menu items
      const fallbackTabs = availableMenuItems.map((menuItem, idx) => ({
        name: menuItem.label,
        slug: menuItem.section,
        description: menuItem.label,
        order: idx,
        is_active: true,
        assigned_to_all_admins: false,
        _existsInDb: false,
      }));
      setAllTabs(fallbackTabs);
      setAssignedTabs(new Set());
    } finally {
      setTabsLoading(false);
    }
  };

  const toggleTabAssignment = async (tabSlug) => {
    if (!manageTabsUser) return;
    const shouldAssign = !assignedTabs.has(tabSlug);
    // Optimistic update
    const next = new Set(assignedTabs);
    if (shouldAssign) next.add(tabSlug);
    else next.delete(tabSlug);
    setAssignedTabs(next);
    try {
      // First, ensure the tab exists in the database (create if needed)
      const menuItem = availableMenuItems.find(m => m.section === tabSlug);
      if (!menuItem) {
        throw new Error(`Tab ${tabSlug} not found in available menu items`);
      }
      
      // Check if tab exists in DB - if it has an id, it exists in DB
      const currentTab = allTabs.find(t => t.slug === tabSlug);
      const tabExistsInDb = currentTab && currentTab.id;
      
      if (!tabExistsInDb) {
        try {
          // Create the tab first
          await API.post("/buysellapi/dashboard-tabs/all/", {
            name: menuItem.label,
            slug: tabSlug,
            description: menuItem.label,
            order: availableMenuItems.findIndex(m => m.section === tabSlug),
          });
          // Small delay to ensure the tab is committed to the database
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (createErr) {
          // If tab already exists (400 error), that's fine - just continue
          // This can happen if tab was created between our check and the create request
          if (createErr.response?.status === 400) {
            const errorMsg = createErr.response?.data?.error || "";
            if (errorMsg.includes("already exists")) {
              // Tab already exists, continue with assignment
            } else {
              throw createErr;
            }
          } else {
            throw createErr;
          }
        }
      }
      
      // Now assign/unassign
      try {
        // Ensure user_id is a number
        const userId = typeof manageTabsUser.id === 'string' ? parseInt(manageTabsUser.id, 10) : manageTabsUser.id;
        
        if (isNaN(userId)) {
          throw new Error(`Invalid user ID: ${manageTabsUser.id}`);
        }
        
        await API.post("/buysellapi/dashboard-tabs/assign-user/", {
          tab_slug: tabSlug,
          user_id: userId,
          assign: shouldAssign,
        });
        toast.success(shouldAssign ? "Tab assigned" : "Tab unassigned");
      } catch (assignErr) {
        const errorMsg = assignErr.response?.data?.error || assignErr.response?.data?.detail || assignErr.message || "Unknown error";
        throw new Error(`Failed to ${shouldAssign ? 'assign' : 'unassign'} tab: ${errorMsg}`);
      }
      
      // Refresh tabs to get updated data
      try {
        const allResp = await API.get("/buysellapi/dashboard-tabs/all/");
        const dbTabs = Array.isArray(allResp.data) ? allResp.data : [];
        const dbTabsMap = new Map(dbTabs.map(t => [t.slug, t]));
        const combinedTabs = availableMenuItems.map((menuItem, idx) => {
          const dbTab = dbTabsMap.get(menuItem.section);
          return dbTab || {
            name: menuItem.label,
            slug: menuItem.section,
            description: menuItem.label,
            order: idx,
            is_active: true,
            assigned_to_all_admins: false,
          };
        });
        setAllTabs(combinedTabs);
        
        // Refresh user's assigned tabs
        try {
          const userResp = await API.get(
            `/buysellapi/dashboard-tabs/user/${manageTabsUser.id}/`
          );
          const userTabs = Array.isArray(userResp.data) ? userResp.data : [];
          setAssignedTabs(new Set(userTabs.map((t) => t.slug)));
        } catch (refreshErr) {
          console.warn("Failed to refresh user tabs:", refreshErr);
        }
      } catch (refreshErr) {
        console.warn("Failed to refresh all tabs:", refreshErr);
      }
    } catch (err) {
      console.error("Failed to update tab assignment:", err);
      console.error("Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        tabSlug,
        userId: manageTabsUser?.id,
        shouldAssign,
      });
      const errorMsg = err.response?.data?.error || 
                      err.response?.data?.detail || 
                      err.message || 
                      "Failed to update tab assignment";
      toast.error(errorMsg);
      // revert optimistic
      const revert = new Set(assignedTabs);
      setAssignedTabs(revert);
    }
  };

  const assignTabToAdmins = async (tabSlug, assign = true) => {
    if (!manageTabsUser) return;
    try {
      setTabsLoading(true);
      
      // First, ensure the tab exists in the database (create if needed)
      const menuItem = availableMenuItems.find(m => m.section === tabSlug);
      if (menuItem) {
        // Check if tab exists in DB - if it has an id, it exists in DB
        const currentTab = allTabs.find(t => t.slug === tabSlug);
        const tabExistsInDb = currentTab && currentTab.id;
        
        if (!tabExistsInDb) {
          try {
            // Create the tab first
            await API.post("/buysellapi/dashboard-tabs/all/", {
              name: menuItem.label,
              slug: tabSlug,
              description: menuItem.label,
              order: availableMenuItems.findIndex(m => m.section === tabSlug),
            });
          } catch (createErr) {
            // If tab already exists (400 error), that's fine - just continue
            // This can happen if tab was created between our check and the create request
            if (createErr.response?.status === 400) {
              const errorMsg = createErr.response?.data?.error || "";
              if (errorMsg.includes("already exists")) {
                // Tab already exists, continue with assignment
              } else {
                throw createErr;
              }
            } else {
              throw createErr;
            }
          }
        }
      }
      
      await API.post("/buysellapi/dashboard-tabs/assign-role/", {
        tab_slug: tabSlug,
        role: "admin",
        assign,
      });
      toast.success(
        assign ? "Assigned to all admins" : "Unassigned from all admins"
      );
      // Refresh user's assigned tabs (in case this affected membership)
      const userResp = await API.get(
        `/buysellapi/dashboard-tabs/user/${manageTabsUser.id}/`
      );
      const userTabs = Array.isArray(userResp.data) ? userResp.data : [];
      setAssignedTabs(new Set(userTabs.map((t) => t.slug)));
      // Refresh all tabs list
      const allResp = await API.get("/buysellapi/dashboard-tabs/all/");
      const dbTabs = Array.isArray(allResp.data) ? allResp.data : [];
      const dbTabsMap = new Map(dbTabs.map(t => [t.slug, t]));
      const combinedTabs = availableMenuItems.map((menuItem, idx) => {
        const dbTab = dbTabsMap.get(menuItem.section);
        return dbTab || {
          name: menuItem.label,
          slug: menuItem.section,
          description: menuItem.label,
          order: idx,
          is_active: true,
          assigned_to_all_admins: false,
        };
      });
      setAllTabs(combinedTabs);
    } catch (err) {
      console.error("Failed to assign tab to admins:", err);
      toast.error("Failed to assign tab to admins");
    } finally {
      setTabsLoading(false);
    }
  };

  const syncDefaultTabs = async () => {
    if (!isSuper) return;
    try {
      setTabsLoading(true);
      // Define default menu items to sync
      const menuItems = [
        { label: "Dashboard", section: "dashboard" },
        { label: "Users", section: "users" },
        { label: "Shipping", section: "shipping" },
        { label: "Alipay Payments", section: "alipay-payments" },
        { label: "Buy4me", section: "buy4me" },
        { label: "Orders", section: "orders" },
        { label: "Products", section: "products" },
        { label: "Categories", section: "categories" },
        { label: "Training", section: "training" },
        { label: "YouTube", section: "youtube" },
        { label: "Quick Orders", section: "quick-orders" },
        { label: "Messages", section: "messages" },
        { label: "Analytics", section: "analytics" },
        { label: "Staff", section: "staff" },
        { label: "Settings", section: "settings" },
      ];

      const tabs = menuItems.map((m, idx) => ({
        name: m.label,
        slug: m.section,
        description: m.label,
        order: idx,
      }));

      await API.post("/buysellapi/dashboard-tabs/sync-defaults/", { tabs });
      toast.success("Dashboard tabs created successfully");
      
      // Refresh tabs list
      const allResp = await API.get("/buysellapi/dashboard-tabs/all/");
      const all = Array.isArray(allResp.data) ? allResp.data : [];
      setAllTabs(all);
      
      // Refresh user's assigned tabs
      if (manageTabsUser) {
        const userResp = await API.get(
          `/buysellapi/dashboard-tabs/user/${manageTabsUser.id}/`
        );
        const userTabs = Array.isArray(userResp.data) ? userResp.data : [];
        setAssignedTabs(new Set(userTabs.map((t) => t.slug)));
      }
    } catch (err) {
      console.error("Failed to sync tabs:", err);
      toast.error("Failed to create dashboard tabs");
    } finally {
      setTabsLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      if (
        !addForm.username ||
        !addForm.full_name ||
        !addForm.email ||
        !addForm.password ||
        !addForm.confirm_password
      ) {
        toast.error("Please fill in all required fields");
        return;
      }
      if (addForm.password !== addForm.confirm_password) {
        toast.error("Passwords do not match");
        return;
      }
      const resp = await API.post("/buysellapi/user/register/", addForm);
      toast.success(resp.data?.message || "User added successfully");
      setShowAddModal(false);
      setAddForm({
        username: "",
        full_name: "",
        email: "",
        password: "",
        confirm_password: "",
        contact: "",
        location: "",
      });
      // Refresh list
      fetchUsers();
    } catch (error) {
      console.error("Error adding user:", error);
      const msg =
        error.response?.data?.detail ||
        Object.values(error.response?.data || {})?.flat()?.[0] ||
        "Failed to add user";
      toast.error(String(msg));
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    try {
      if (!selectedUser?.id) {
        toast.error("No user selected");
        return;
      }
      await API.put(`/buysellapi/users/${selectedUser.id}/update/`, editForm);
      toast.success("User updated successfully");
      setShowEditModal(false);
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      const msg = error.response?.data?.detail || "Failed to update user";
      toast.error(msg);
    }
  };

  const handleDeleteUser = (userId) => {
    setUserIdToDelete(userId);
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!userIdToDelete) return;
    try {
      await API.delete(`/buysellapi/users/${userIdToDelete}/delete/`);
      toast.success("User deleted successfully");
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      const msg =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        "Failed to delete user";
      toast.error(msg);
    } finally {
      setShowDeleteModal(false);
      setUserIdToDelete(null);
    }
  };

  const filteredUsers = users.filter((user) => {
    const term = searchTerm.toLowerCase();
    return (
      (user.username || "").toLowerCase().includes(term) ||
      (user.full_name || "").toLowerCase().includes(term) ||
      (user.email || "").toLowerCase().includes(term) ||
      (user.shipping_mark?.mark_id || "").toLowerCase().includes(term) ||
      (user.shipping_mark?.name || "").toLowerCase().includes(term)
    );
  });

  // Bulk actions handlers
  const handleSelectUser = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map((user) => user.id));
    }
    setSelectAll(!selectAll);
  };

  useEffect(() => {
    setSelectAll(selectedUsers.length === filteredUsers.length && filteredUsers.length > 0);
  }, [selectedUsers, filteredUsers]);

  const handleBulkDelete = async (selectedIds) => {
    if (!isAdmin) {
      toast.error("Only admins can delete users");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} user(s)?`)) {
      return;
    }
    try {
      const deletePromises = selectedIds.map((id) =>
        API.delete(`/buysellapi/users/${id}/delete/`)
      );
      await Promise.all(deletePromises);
      toast.success(`${selectedIds.length} user(s) deleted successfully`);
      setSelectedUsers([]);
      fetchUsers();
    } catch (error) {
      console.error("Error bulk deleting users:", error);
      toast.error("Failed to delete some users");
    }
  };

  const handleBulkUpdateStatus = async (selectedIds, newStatus) => {
    if (!isAdmin) {
      toast.error("Only admins can update user status");
      return;
    }
    try {
      const updatePromises = selectedIds.map((id) =>
        API.put(`/buysellapi/users/${id}/update/`, { status: newStatus })
      );
      await Promise.all(updatePromises);
      toast.success(`${selectedIds.length} user(s) status updated successfully`);
      setSelectedUsers([]);
      fetchUsers();
    } catch (error) {
      console.error("Error bulk updating status:", error);
      toast.error("Failed to update some users");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
          Users Management
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <FaUserPlus />
          <span>Add User</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
          />
          <FaSearch className="absolute left-3 top-3 text-gray-400" />
        </div>
      </div>

      {/* Bulk Actions */}
      <BulkActions
        selectedItems={selectedUsers}
        onBulkDelete={handleBulkDelete}
        onBulkUpdateStatus={handleBulkUpdateStatus}
        availableStatuses={[
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ]}
        showDelete={isAdmin}
        showStatusUpdate={isAdmin}
      />

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-600">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider w-12">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="rounded"
                />
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                User
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                Email
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                Mark
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                Role
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredUsers.map((user) => (
              <tr
                key={user.id}
                className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-gray-700 dark:hover:to-gray-600 transition-all duration-200 border-l-4 border-transparent hover:border-purple-500"
              >
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => handleSelectUser(user.id)}
                    className="rounded"
                  />
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                      {user.username}
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {user.full_name}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div
                    className="text-sm text-blue-600 dark:text-blue-400 max-w-[200px] truncate"
                    title={user.email}
                  >
                    {user.email}
                  </div>
                </td>
                <td className="px-3 py-3 text-sm">
                  {user.shipping_mark ? (
                    <span className="font-mono bg-gradient-to-r from-pink-100 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/30 px-2 py-1 rounded-full text-pink-700 dark:text-pink-300 font-semibold shadow-sm text-xs">
                      {user.shipping_mark.mark_id}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full uppercase ${
                      user.role === "admin"
                        ? "bg-gradient-to-r from-orange-400 to-red-500 text-white shadow-sm"
                        : "bg-gradient-to-r from-blue-400 to-indigo-500 text-white shadow-sm"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full uppercase ${
                      user.status === "active"
                        ? "bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-sm"
                        : "bg-gradient-to-r from-red-400 to-rose-500 text-white shadow-sm"
                    }`}
                  >
                    {user.status}
                  </span>
                </td>
                <td className="px-3 py-3 text-sm text-gray-800 dark:text-white">
                  <div className="max-w-[120px] truncate" title={user.contact}>
                    {user.contact}
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => {
                      setSelectedUser(user);
                      setEditForm({
                        full_name: user.full_name || "",
                        email: user.email || "",
                        role: user.role || "user",
                        status: user.status || "active",
                        contact: user.contact || "",
                        location: user.location || "",
                      });
                      setShowEditModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                  >
                    <FaEdit />
                  </button>
                  {isSuper && (
                    <button
                      onClick={() => openManageTabs(user)}
                      className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 mr-3"
                      title="Manage dashboard tabs for this user"
                    >
                      <FaUsers />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className={`text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 ${
                      isAdmin ? "" : "opacity-50 cursor-not-allowed"
                    }`}
                    disabled={!isAdmin}
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                  Add New User
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Username *
                    </label>
                    <input
                      type="text"
                      value={addForm.username}
                      onChange={(e) =>
                        setAddForm({ ...addForm, username: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={addForm.full_name}
                      onChange={(e) =>
                        setAddForm({ ...addForm, full_name: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={addForm.email}
                      onChange={(e) =>
                        setAddForm({ ...addForm, email: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      value={addForm.password}
                      onChange={(e) =>
                        setAddForm({ ...addForm, password: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      value={addForm.confirm_password}
                      onChange={(e) =>
                        setAddForm({
                          ...addForm,
                          confirm_password: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Contact
                    </label>
                    <input
                      type="text"
                      value={addForm.contact}
                      onChange={(e) =>
                        setAddForm({ ...addForm, contact: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={addForm.location}
                      onChange={(e) =>
                        setAddForm({ ...addForm, location: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    Add User
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
              Edit User
            </h3>
            <form onSubmit={handleEditUser}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={editForm.full_name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, full_name: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Role
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm({ ...editForm, role: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({ ...editForm, status: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Contact
                  </label>
                  <input
                    type="text"
                    value={editForm.contact}
                    onChange={(e) =>
                      setEditForm({ ...editForm, contact: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Location
                  </label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) =>
                      setEditForm({ ...editForm, location: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md"
                >
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Tabs Modal (superadmin only) */}
      {showManageTabsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                Manage Dashboard Tabs for {manageTabsUser?.username}
              </h3>
              <button
                onClick={() => {
                  setShowManageTabsModal(false);
                  setManageTabsUser(null);
                  setAllTabs([]);
                  setAssignedTabs(new Set());
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300"
              >
                <FaTimes />
              </button>
            </div>

            {tabsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {allTabs.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Loading tabs...
                    </div>
                  </div>
                ) : (
                  allTabs.map((tab) => (
                    <label
                      key={tab.slug}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <div className="font-medium text-gray-800 dark:text-white">
                            {tab.name}
                          </div>
                          {tab.assigned_to_all_admins && (
                            <div className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                              All Admins
                            </div>
                          )}
                        </div>
                        {tab.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {tab.description}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={assignedTabs.has(tab.slug)}
                          onChange={() => toggleTabAssignment(tab.slug)}
                          className="h-4 w-4"
                        />
                        <button
                          onClick={() => {
                            if (
                              !window.confirm("Assign this tab to ALL admins?")
                            )
                              return;
                            assignTabToAdmins(tab.slug, true);
                          }}
                          className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-md hover:bg-green-200"
                          title="Assign to all admins"
                        >
                          Assign Admins
                        </button>
                        <button
                          onClick={() => {
                            if (
                              !window.confirm(
                                "Remove this tab from ALL admins?"
                              )
                            )
                              return;
                            assignTabToAdmins(tab.slug, false);
                          }}
                          className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-md hover:bg-red-200"
                          title="Remove from all admins"
                        >
                          Unassign Admins
                        </button>
                      </div>
                    </label>
                  ))
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowManageTabsModal(false);
                  setManageTabsUser(null);
                  setAllTabs([]);
                  setAssignedTabs(new Set());
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setUserIdToDelete(null);
        }}
        onConfirm={confirmDeleteUser}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default UsersManagement;
