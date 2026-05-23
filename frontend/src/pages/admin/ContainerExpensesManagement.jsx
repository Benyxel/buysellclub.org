import React, { useState, useEffect, useCallback } from "react";
import { toast } from "../../utils/toast";
import api from "../../api";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaDollarSign,
} from "react-icons/fa";
import ConfirmModal from "../../components/shared/ConfirmModal";

const ContainerExpensesManagement = () => {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    container: "",
    amount: "",
    description: "",
    expense_date: new Date().toISOString().slice(0, 10),
  });
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Load containers from admin API, then merge expense data from /api/admin/container-expenses (backend: buysellclub-backend buysellapi.views).
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch container list from admin containers API (same as Containers tab)
      const containerList = [];
      let page = 1;
      let totalPages = 1;
      let totalCount = 0;
      do {
        const res = await api.get("/api/admin/containers", {
          params: { page, limit: 100, sortBy: "-created_at" },
        });
        const data = res.data?.data || [];
        totalPages = res.data?.totalPages ?? 1;
        totalCount = res.data?.total ?? 0;
        containerList.push(...data);
        page += 1;
      } while (page <= totalPages && containerList.length < totalCount);

      // 2. Fetch expense data from same backend (bsbackend urls.py → AdminContainerExpenseListView)
      let expenseByContainerId = {};
      try {
        const expRes = await api.get("/api/admin/container-expenses");
        const expenseContainers = expRes.data?.containers || [];
        expenseContainers.forEach((c) => {
          expenseByContainerId[c.id] = {
            total_amount_ghs: c.total_amount_ghs ?? c.total_invoiced_ghs ?? c.total_shipping_fee ?? 0,
            total_collected_ghs: c.total_collected_ghs ?? c.total_amount_ghs ?? 0,
            total_expenses: c.total_expenses ?? 0,
            gain: c.gain ?? 0,
            expenses: c.expenses || [],
          };
        });
      } catch (expErr) {
        if (import.meta.env?.DEV) {
          console.warn("Container expense totals could not be loaded:", expErr?.response?.status ?? expErr);
        }
      }

      // 3. Merge: each container gets expense fields from expense API or defaults
      const merged = containerList.map((c) => {
        const exp = expenseByContainerId[c.id] || {
          total_amount_ghs: 0,
          total_collected_ghs: 0,
          total_expenses: 0,
          gain: 0,
          expenses: [],
        };
        return {
          id: c.id,
          container_number: c.container_number,
          status: c.status,
          total_amount_ghs: exp.total_amount_ghs,
          total_collected_ghs: exp.total_collected_ghs,
          total_expenses: exp.total_expenses,
          gain: exp.gain,
          expenses: exp.expenses,
        };
      });
      setContainers(merged);
    } catch (err) {
      console.error("Error fetching containers:", err);
      toast.error(err.response?.data?.error || "Failed to load containers");
      setContainers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAddExpense = (containerId) => {
    setEditingExpense(null);
    setExpenseForm({
      container: containerId || "",
      amount: "",
      description: "",
      expense_date: new Date().toISOString().slice(0, 10),
    });
    setShowExpenseModal(true);
  };

  const openEditExpense = (expense) => {
    setEditingExpense(expense);
    setExpenseForm({
      container: expense.container,
      amount: String(expense.amount),
      description: expense.description || "",
      expense_date: expense.expense_date || new Date().toISOString().slice(0, 10),
    });
    setShowExpenseModal(true);
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      container: Number(expenseForm.container) || expenseForm.container,
      amount: parseFloat(expenseForm.amount),
      description: (expenseForm.description || "").trim(),
      expense_date: expenseForm.expense_date || null,
    };
    if (!payload.container || isNaN(payload.amount) || payload.amount <= 0) {
      toast.error("Select a container and enter a valid amount.");
      return;
    }
    setLoading(true);
    try {
      if (editingExpense) {
        await api.patch(`/api/admin/container-expenses/${editingExpense.id}`, {
          amount: payload.amount,
          description: payload.description,
          expense_date: payload.expense_date,
        });
        toast.success("Expense updated.");
      } else {
        await api.post("/api/admin/container-expenses", payload);
        toast.success("Expense added.");
      }
      setShowExpenseModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.container?.[0] || "Failed to save expense");
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteExpense = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      await api.delete(`/api/admin/container-expenses/${deleteTarget.id}`);
      toast.success("Expense deleted.");
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete expense");
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (n) => {
    const x = Number(n);
    return isNaN(x) ? "0.00" : x.toFixed(2);
  };
  const formatCedis = (n) => `₵${formatMoney(n)}`;

  return (
    <div className="rounded-lg bg-white dark:bg-gray-800 shadow p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <FaDollarSign className="w-5 h-5 text-green-600" />
          Container Expenses
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          All amounts in cedis (₵). Gain = collected shipping fees (including part payments) − expenses.
        </p>
      </div>

      {loading && !containers.length ? (
        <div className="flex justify-center py-12">
          <span className="text-gray-500 dark:text-gray-400">Loading...</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Container</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Invoiced (₵)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Collected (₵)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Expenses (₵)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Gain (₵)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {containers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No containers yet. Create containers under the Containers tab first.
                  </td>
                </tr>
              ) : (
                containers.map((c) => (
                  <React.Fragment key={c.id}>
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{c.container_number}</span>
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({c.status})</span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{formatCedis(c.total_amount_ghs)}</td>
                      <td className="px-4 py-3 text-right text-green-700 dark:text-green-400 font-medium">{formatCedis(c.total_collected_ghs)}</td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{formatCedis(c.total_expenses)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={c.gain >= 0 ? "text-green-600 dark:text-green-400 font-medium" : "text-red-600 dark:text-red-400 font-medium"}>
                          {formatCedis(c.gain)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openAddExpense(c.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          <FaPlus className="w-3 h-3" /> Add expense
                        </button>
                      </td>
                    </tr>
                    {c.expenses && c.expenses.length > 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-2 bg-gray-50 dark:bg-gray-700/30">
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Expenses:</span>
                            {c.expenses.map((ex) => (
                              <span
                                key={ex.id}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200"
                              >
                                {ex.description || "Expense"} – {formatCedis(ex.amount)}
                                {ex.expense_date && ` (${ex.expense_date})`}
                                <button
                                  type="button"
                                  onClick={() => openEditExpense(ex)}
                                  className="p-0.5 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                                  title="Edit"
                                >
                                  <FaEdit className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget(ex)}
                                  className="p-0.5 rounded hover:bg-red-500 hover:text-white"
                                  title="Delete"
                                >
                                  <FaTrash className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit expense modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowExpenseModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {editingExpense ? "Edit expense" : "Add expense"}
            </h3>
            <form onSubmit={handleExpenseSubmit}>
              {!editingExpense && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Container</label>
                  <select
                    value={expenseForm.container}
                    onChange={(e) => setExpenseForm((f) => ({ ...f, container: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    required
                  >
                    <option value="">Select container</option>
                    {containers.map((c) => (
                      <option key={c.id} value={c.id}>{c.container_number}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (₵)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={expenseForm.amount}
                  placeholder="Cedis"
                  onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Port charges, handling"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date (optional)</label>
                <input
                  type="date"
                  value={expenseForm.expense_date}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, expense_date: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  {editingExpense ? "Update" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete expense"
        message="Are you sure you want to delete this expense?"
        onConfirm={confirmDeleteExpense}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default ContainerExpensesManagement;
