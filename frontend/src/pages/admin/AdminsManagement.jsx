import React from "react";
import UsersManagement from "./UsersManagement";

/**
 * Dedicated Admins dashboard page — lists admin accounts only
 * via /buysellapi/admin/admins/ (not the general users list).
 */
const AdminsManagement = () => <UsersManagement adminsOnly />;

export default AdminsManagement;
