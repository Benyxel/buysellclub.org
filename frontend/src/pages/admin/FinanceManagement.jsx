import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../../api";
import { toast } from "../../utils/toast";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

const PRESETS = [
  { id: "this_year", label: "This year" },
  { id: "custom", label: "Custom" },
  { id: "all", label: "All time" },
];

const FINANCE_YEAR = new Date().getFullYear();
const YEAR_MONTHS = Array.from({ length: 12 }, (_, index) => {
  const month = String(index + 1).padStart(2, "0");
  const id = `month-${FINANCE_YEAR}-${month}`;
  const label = new Date(FINANCE_YEAR, index, 1).toLocaleString("en-GB", { month: "long" });
  return { id, label };
});

const CATEGORIES = [
  { id: "salaries", label: "Salaries" },
  { id: "china_warehouse", label: "China warehouse" },
  { id: "china_warehouse_salaries", label: "China staff salary" },
  { id: "other", label: "Other" },
];

const EMPTY_FORM = {
  category: "salaries",
  amount: "",
  currency: "GHS",
  expense_date: "",
  description: "",
  container: "",
};

function money(value, currency = "GHS") {
  const amount = Number(value || 0);
  const formatted = amount.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency ? `${currency} ${formatted}` : formatted;
}

function compactMoney(value) {
  const amount = Number(value || 0);
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  if (abs >= 1000000000000) return `${sign}GHS ${(abs / 1000000000000).toFixed(1)}T`;
  if (abs >= 1000000000) return `${sign}GHS ${(abs / 1000000000).toFixed(1)}B`;
  if (abs >= 1000000) return `${sign}GHS ${(abs / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${sign}GHS ${(abs / 1000).toFixed(1)}K`;
  return money(amount);
}

const CARD_ACCENTS = ["#7c6cf0", "#34d399", "#f5b942", "#fb7185"];
const SOURCE_COLORS = [
  "#7c6cf0",
  "#34d399",
  "#f5b942",
  "#60a5fa",
  "#a78bfa",
  "#22d3ee",
  "#fb7185",
  "#f97316",
  "#94a3b8",
  "#4ade80",
];
const EXPENSE_COLORS = ["#7c6cf0", "#a78bfa", "#60a5fa", "#34d399", "#fb7185"];
const PANEL_PAGE_SIZE = 20;
const CONTAINER_PAGE_SIZE = 5;

function useDarkMode() {
  const [dark, setDark] = useState(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setDark(root.classList.contains("dark"));
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

function FinanceTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-white/10 dark:bg-gray-900">
      {label ? <p className="mb-1 font-semibold text-gray-900 dark:text-white">{label}</p> : null}
      {payload.map((item) => (
        <p key={item.dataKey || item.name} style={{ color: item.color || item.payload?.color }}>
          {item.name}: {item.name === "No revenue" ? money(0) : money(item.value)}
        </p>
      ))}
    </div>
  );
}

export default function FinanceManagement({ onOpenContainerExpenses }) {
  const [preset, setPreset] = useState("this_month");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState(null);
  const [lines, setLines] = useState([]);
  const [linesLoading, setLinesLoading] = useState(false);
  const [panelPage, setPanelPage] = useState(1);
  const [containerPage, setContainerPage] = useState(1);
  const [view, setView] = useState("overview");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const dark = useDarkMode();

  const params = useMemo(() => {
    const query = { preset };
    if (preset === "custom") {
      query.start = start;
      query.end = end;
    }
    return query;
  }, [preset, start, end]);

  const load = useCallback(async () => {
    if (preset === "custom" && (!start || !end)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await API.get("/buysellapi/admin/finance/", { params });
      setReport(response.data);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Could not load finance");
    } finally {
      setLoading(false);
    }
  }, [params, preset, start, end]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setContainerPage(1);
  }, [report]);

  const openSource = async (row) => {
    setSource(row);
    setPanelPage(1);
    setLines([]);
    if (row.key === "containers") {
      setLines(report?.containers || []);
      return;
    }
    setLinesLoading(true);
    try {
      const response = await API.get("/buysellapi/admin/finance/lines/", {
        params: { ...params, source: row.key },
      });
      setLines(response.data?.lines || []);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Could not load that source");
    } finally {
      setLinesLoading(false);
    }
  };

  const startEdit = (expense) => {
    setEditingId(expense.id);
    setForm({
      category: expense.category,
      amount: String(expense.amount),
      currency: expense.currency || "GHS",
      expense_date: expense.expense_date,
      description: expense.description || "",
      container: expense.container_id ? String(expense.container_id) : "",
    });
    setView("expenses");
  };

  const saveExpense = async (event) => {
    event.preventDefault();
    setSaving(true);
    const body = {
      category: form.category,
      amount: form.amount,
      currency: form.currency || "GHS",
      expense_date: form.expense_date,
      description: form.description,
      container: form.container || null,
    };
    try {
      if (editingId) {
        await API.patch(`/buysellapi/admin/finance/expenses/${editingId}/`, body);
        toast.success("Expense updated");
      } else {
        await API.post("/buysellapi/admin/finance/expenses/", body);
        toast.success("Expense added");
      }
      setEditingId(null);
      setForm({
        ...EMPTY_FORM,
        expense_date: new Date().toISOString().slice(0, 10),
      });
      setView("expenses");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Could not save expense");
    } finally {
      setSaving(false);
    }
  };

  const removeExpense = async (expense) => {
    if (!window.confirm("Delete this company expense?")) return;
    try {
      await API.delete(`/buysellapi/admin/finance/expenses/${expense.id}/`);
      toast.success("Expense deleted");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Could not delete expense");
    }
  };

  const summary = report?.summary;
  const periodName =
    YEAR_MONTHS.find((item) => item.id === preset)?.label ||
    PRESETS.find((item) => item.id === preset)?.label ||
    "This month";
  const cards = [
    { label: "Total revenue", value: summary?.revenue_ghs, hint: "Received in GHS" },
    { label: "Total expenses", value: summary?.expenses_ghs, hint: "GHS only" },
    { label: "Profit", value: summary?.profit_ghs, hint: "Revenue minus expenses" },
    { label: "Outstanding", value: summary?.outstanding_ghs, hint: "Invoiced or approved, not paid" },
  ];
  const sourceSlices = (report?.revenue_by_source || []).map((row, index) => ({
    ...row,
    color: SOURCE_COLORS[index % SOURCE_COLORS.length],
  }));
  const donutData = sourceSlices.some((row) => Number(row.amount_ghs) > 0)
    ? sourceSlices.filter((row) => Number(row.amount_ghs) > 0)
    : [{ label: "No revenue", amount_ghs: 1, color: "#2a3348" }];
  const expenseBars = report?.expenses_by_category || [];
  const tallestExpense = Math.max(...expenseBars.map((row) => Number(row.amount_ghs) || 0), 1);

  return (
    <div className="min-h-full bg-gray-50 p-6 text-gray-900 dark:bg-gray-900 dark:text-white">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Finance overview</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Company totals · {periodName}</p>
          <div className="mt-3 flex gap-2">
            {[
              { id: "overview", label: "Overview" },
              { id: "expenses", label: "Expenses" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setView(item.id);
                  if (item.id === "expenses") {
                    setForm((current) =>
                      current.expense_date
                        ? current
                        : {
                            ...current,
                            expense_date: new Date().toISOString().slice(0, 10),
                          }
                    );
                  }
                }}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                  view === item.id
                    ? "bg-[#7c6cf0] text-white"
                    : "bg-white text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={preset.startsWith("month-") || preset === "this_month" ? (preset === "this_month" ? `month-${FINANCE_YEAR}-${String(new Date().getMonth() + 1).padStart(2, "0")}` : preset) : ""}
            onChange={(event) => {
              if (event.target.value) setPreset(event.target.value);
            }}
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 dark:border-white/10 dark:bg-gray-800 dark:text-white"
            aria-label="Month"
          >
            <option value="">{FINANCE_YEAR} months</option>
            {YEAR_MONTHS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          {PRESETS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPreset(item.id)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                preset === item.id
                  ? "border-gray-300 bg-white text-gray-900 dark:border-white/20 dark:bg-gray-700 dark:text-white"
                  : "border-transparent bg-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {preset === "custom" && (
        <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <label>
            From
            <input
              type="date"
              value={start}
              onChange={(event) => setStart(event.target.value)}
              className="ml-2 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-900 px-2 py-1 text-gray-900 dark:text-white"
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
              className="ml-2 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-900 px-2 py-1 text-gray-900 dark:text-white"
            />
          </label>
        </div>
      )}

      {preset === "custom" && (!start || !end) ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Choose a start and end date.</p>
      ) : loading && !report ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading finance…</p>
      ) : view === "expenses" ? (
        <ExpensesPanel
          form={form}
          setForm={setForm}
          editingId={editingId}
          saving={saving}
          onSubmit={saveExpense}
          onCancel={() => {
            setEditingId(null);
            setForm({
              ...EMPTY_FORM,
              expense_date: new Date().toISOString().slice(0, 10),
            });
          }}
          companyExpenses={report?.company_expenses || []}
          containerExpenses={report?.container_expenses || []}
          containerOptions={report?.container_options || []}
          onEdit={startEdit}
          onDelete={removeExpense}
          onOpenContainerExpenses={onOpenContainerExpenses}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card, index) => (
              <div key={card.label} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-800 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{card.label}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{periodName}</p>
                  </div>
                  <p className="text-2xl font-semibold tracking-tight">{compactMoney(card.value)}</p>
                </div>
                <div className="mt-4 h-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
                  <div className="h-full w-full rounded-full" style={{ background: CARD_ACCENTS[index] }} />
                </div>
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{card.hint}</p>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            USD freight collected {money(summary?.usd_freight_collected, "USD")} stays out of the GHS total.
            {Number(summary?.usd_outstanding) > 0 && (
              <> Outstanding USD with no rate: {money(summary.usd_outstanding, "USD")}.</>
            )}
            {(summary?.non_ghs_expenses || []).map((row) => (
              <span key={row.currency}>
                {" "}
                {row.currency} expenses are stored and not converted: {money(row.amount, row.currency)}.
              </span>
            ))}
          </p>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
            <section className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-800 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">Performance</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Revenue, expenses, and profit for the selected range</p>
                </div>
                <span className="rounded-lg border border-gray-200 dark:border-white/10 px-2 py-1 text-xs text-gray-500 dark:text-gray-400">{periodName}</span>
              </div>
              <p className="mt-4 text-4xl font-semibold tracking-tight">{compactMoney(summary?.revenue_ghs)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total revenue</p>
              <div className="mt-2 h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={report?.months || []}>
                    <CartesianGrid vertical stroke={dark ? "#2a3348" : "#e5e7eb"} strokeDasharray="3 6" horizontal={false} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={28} tick={{ fill: dark ? "#8b93a7" : "#6b7280", fontSize: 11 }} />
                    <Tooltip content={<FinanceTooltip />} />
                    <Line type="monotone" dataKey="revenue_ghs" name="Revenue" stroke="#8b7cf6" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0, fill: "#8b7cf6" }} />
                    <Line type="monotone" dataKey="expenses_ghs" name="Expenses" stroke="#f5b942" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0, fill: "#f5b942" }} />
                    <Line type="monotone" dataKey="profit_ghs" name="Profit" stroke="#3dce8a" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0, fill: "#3dce8a" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 grid grid-cols-3 border-t border-gray-200 dark:border-white/10 pt-4 text-center">
                <FooterStat label="Revenue" value={compactMoney(summary?.revenue_ghs)} />
                <FooterStat label="Expenses" value={compactMoney(summary?.expenses_ghs)} />
                <FooterStat label="Profit" value={compactMoney(summary?.profit_ghs)} />
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-800 p-5">
              <h3 className="font-semibold">Revenue by source</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Received GHS in this period</p>
              <div className="relative mx-auto mt-4 h-[220px] w-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} dataKey="amount_ghs" nameKey="label" innerRadius={68} outerRadius={92} paddingAngle={3} stroke="none">
                      {donutData.map((slice) => (
                        <Cell key={slice.label} fill={slice.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<FinanceTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-semibold">{compactMoney(summary?.revenue_ghs)}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">received</span>
                </div>
              </div>
              <ul className="mt-2 space-y-2">
                {sourceSlices.map((row) => (
                  <li key={row.key || row.label}>
                    <button
                      type="button"
                      onClick={() => openSource(report.sources.find((item) => item.key === row.key) || row)}
                      className="flex w-full items-center justify-between text-sm"
                    >
                      <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: row.color }} />
                        {row.label}
                      </span>
                      <span>{compactMoney(row.amount_ghs)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <section className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-800 p-5">
              <h3 className="font-semibold">Sources</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Click a source to open the payments behind it</p>
              <div className="mt-4 grid gap-x-8 sm:grid-cols-2">
                {(report?.sources || []).map((row) => (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() => openSource(row)}
                    className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 py-3 text-left text-sm"
                  >
                    <span className="text-gray-500 dark:text-gray-400">{row.label}</span>
                    <span className="font-semibold">{compactMoney(row.revenue_ghs)}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-800 p-5">
              <h3 className="font-semibold">Expenses by category</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Company expenses and container expenses</p>
              <div className="mt-6 flex h-52 items-end justify-between gap-3">
                {expenseBars.map((row, index) => {
                  const height = Math.max(8, (Number(row.amount_ghs) / tallestExpense) * 160);
                  return (
                    <div key={row.key} className="flex flex-1 flex-col items-center">
                      <span className="mb-2 text-center text-[11px] text-gray-700 dark:text-gray-300">{compactMoney(row.amount_ghs)}</span>
                      <div
                        className="w-full max-w-[56px] rounded-xl"
                        style={{ height, background: EXPENSE_COLORS[index % EXPENSE_COLORS.length] }}
                      />
                      <span className="mt-2 text-center text-[11px] leading-tight text-gray-500 dark:text-gray-400">{row.label}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <section className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-800">
            <div className="border-b border-gray-200 dark:border-white/10 px-5 py-4">
              <h3 className="font-semibold">Revenue</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Paid and approved amounts only. Container freight is a breakdown of shipping invoices and is not added again.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900 text-left text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-2">Source</th>
                    <th className="px-4 py-2">Received</th>
                    <th className="px-4 py-2">Outstanding</th>
                    <th className="px-4 py-2">In total</th>
                  </tr>
                </thead>
                <tbody>
                  {(report?.sources || []).map((row) => (
                    <tr
                      key={row.key}
                      className="cursor-pointer border-t border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5"
                      onClick={() => openSource(row)}
                    >
                      <td className="px-4 py-3 font-medium text-[#7c6cf0]">{row.label}</td>
                      <td className="px-4 py-3">{money(row.revenue_ghs)}</td>
                      <td className="px-4 py-3">{money(row.outstanding_ghs)}</td>
                      <td className="px-4 py-3">{row.included_in_total ? "Yes" : "Breakdown"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-800">
            <div className="border-b border-gray-200 dark:border-white/10 px-5 py-4">
              <h3 className="font-semibold">Profit by container</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Newest containers first, 5 per page. Invoiced freight in GHS minus that container’s expenses. A container with no GHS fee is not profit.
              </p>
            </div>
            <ContainerProfitTable
              rows={report?.containers || []}
              page={containerPage}
              onPage={setContainerPage}
            />
          </section>

        </>
      )}

      {source && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => setSource(null)}>
          <div
            className="h-full w-full max-w-3xl overflow-y-auto bg-white p-5 text-gray-900 shadow-xl dark:bg-gray-900 dark:text-white"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold">{source.label}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {money(source.revenue_ghs)} received
                  {source.included_in_total ? "" : " · not added to total revenue"}
                </p>
              </div>
              <button type="button" onClick={() => setSource(null)} className="text-sm text-gray-500 dark:text-gray-400">
                Close
              </button>
            </div>
            {source.key === "membership_cards" && (
              <p className="mb-4 text-sm text-gray-700 dark:text-gray-300">
                Membership cards do not store a payment amount, so this revenue stays at zero. Community and executive payments are listed on their own rows.
              </p>
            )}
            {linesLoading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
            ) : lines.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {source.key === "containers" ? "No containers in this period." : "No paid records in this period."}
              </p>
            ) : (
              <PanelPage
                page={panelPage}
                total={lines.length}
                onPage={setPanelPage}
              >
                {source.key === "containers" ? (
                  <ContainerLines rows={pageSlice(lines, panelPage)} />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="text-left text-gray-500 dark:text-gray-400">
                        <tr>
                          <th className="py-2 pr-3">Date</th>
                          <th className="py-2 pr-3">Customer</th>
                          <th className="py-2 pr-3">Mark</th>
                          <th className="py-2 pr-3">Reference</th>
                          <th className="py-2 pr-3">Amount</th>
                          <th className="py-2 pr-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageSlice(lines, panelPage).map((line, index) => (
                          <tr key={`${line.reference}-${index}`} className="border-t border-gray-200 dark:border-white/10">
                            <td className="py-2 pr-3">{line.date || "—"}</td>
                            <td className="py-2 pr-3">{line.customer || "—"}</td>
                            <td className="py-2 pr-3">{line.mark_id || "—"}</td>
                            <td className="py-2 pr-3">{line.reference}</td>
                            <td className="py-2 pr-3">{money(line.amount, line.currency)}</td>
                            <td className="py-2 pr-3">{line.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </PanelPage>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FooterStat({ label, value }) {
  return (
    <div className="border-gray-200 dark:border-white/10 px-2 first:border-0 sm:border-l">
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

function ExpensesPanel({
  form,
  setForm,
  editingId,
  saving,
  onSubmit,
  onCancel,
  companyExpenses,
  containerExpenses,
  containerOptions,
  onEdit,
  onDelete,
  onOpenContainerExpenses,
}) {
  const fieldClass =
    "w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#7c6cf0] dark:border-white/10 dark:bg-gray-900 dark:text-white";

  return (
    <div className="space-y-4">
      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-gray-800"
      >
        <div className="mb-4">
          <h3 className="text-lg font-semibold">{editingId ? "Edit expense" : "Add expense"}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Salaries, warehouse costs, and other company spending. Container port charges stay on Container Expenses.
          </p>
        </div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Category</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {CATEGORIES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setForm({ ...form, category: item.id })}
              className={`rounded-full px-3 py-1.5 text-sm ${
                form.category === item.id
                  ? "bg-[#7c6cf0] text-white"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-gray-500 dark:text-gray-400">Amount</span>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
              className={fieldClass}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-500 dark:text-gray-400">Currency</span>
            <input
              value={form.currency}
              onChange={(event) => setForm({ ...form, currency: event.target.value.toUpperCase() })}
              className={fieldClass}
              placeholder="GHS"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-500 dark:text-gray-400">Date</span>
            <input
              required
              type="date"
              value={form.expense_date}
              onChange={(event) => setForm({ ...form, expense_date: event.target.value })}
              className={fieldClass}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-500 dark:text-gray-400">Container</span>
            <select
              value={form.container}
              onChange={(event) => setForm({ ...form, container: event.target.value })}
              className={fieldClass}
            >
              <option value="">None</option>
              {containerOptions.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.container_number}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block text-gray-500 dark:text-gray-400">
              {form.category === "other" ? "Description (required)" : "Description"}
            </span>
            <input
              placeholder="What was this for?"
              required={form.category === "other"}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className={fieldClass}
            />
          </label>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#7c6cf0] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : editingId ? "Save changes" : "Add expense"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400"
            >
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-800">
        <div className="border-b border-gray-200 px-5 py-4 dark:border-white/10">
          <h3 className="font-semibold">Company expenses</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Entered by an admin for this period</p>
        </div>
        <ExpenseTable rows={companyExpenses} onEdit={onEdit} onDelete={onDelete} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-800">
        <div className="border-b border-gray-200 px-5 py-4 dark:border-white/10">
          <h3 className="font-semibold">Container expenses</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Read-only. Open a container to change port or handling costs.
          </p>
        </div>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500 dark:bg-gray-900 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2">Container</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Note</th>
            </tr>
          </thead>
          <tbody>
            {containerExpenses.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-gray-500 dark:text-gray-400" colSpan={4}>
                  No container expenses in this period.
                </td>
              </tr>
            )}
            {containerExpenses.map((row) => (
              <tr key={row.id} className="border-t border-gray-200 dark:border-white/10">
                <td className="px-4 py-3">
                  <button type="button" className="font-medium text-[#7c6cf0]" onClick={onOpenContainerExpenses}>
                    {row.container_number}
                  </button>
                </td>
                <td className="px-4 py-3">{row.expense_date}</td>
                <td className="px-4 py-3">{money(row.amount)}</td>
                <td className="px-4 py-3">{row.description || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function ExpenseTable({ rows, onEdit, onDelete }) {
  return (
    <table className="min-w-full text-sm">
      <thead className="bg-gray-50 dark:bg-gray-900 text-left text-gray-500 dark:text-gray-400">
        <tr>
          <th className="px-4 py-2">Category</th>
          <th className="px-4 py-2">Date</th>
          <th className="px-4 py-2">Amount</th>
          <th className="px-4 py-2">Description</th>
          <th className="px-4 py-2">Entered by</th>
          <th className="px-4 py-2"></th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr>
            <td className="px-4 py-4 text-gray-500 dark:text-gray-400" colSpan={6}>
              No company expenses in this period.
            </td>
          </tr>
        )}
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-gray-200 dark:border-white/10">
            <td className="px-4 py-3">{row.category_label}</td>
            <td className="px-4 py-3">{row.expense_date}</td>
            <td className="px-4 py-3">
              {money(row.amount, row.currency)}
              {row.container_number ? ` · ${row.container_number}` : ""}
            </td>
            <td className="px-4 py-3">{row.description || "—"}</td>
            <td className="px-4 py-3">{row.entered_by || "—"}</td>
            <td className="px-4 py-3 text-right">
              <button type="button" className="mr-3 text-[#7c6cf0]" onClick={() => onEdit(row)}>
                Edit
              </button>
              <button type="button" className="text-[#fb7185]" onClick={() => onDelete(row)}>
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ContainerProfitTable({ rows, page, onPage }) {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / CONTAINER_PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * CONTAINER_PAGE_SIZE;
  const visible = rows.slice(start, start + CONTAINER_PAGE_SIZE);
  const from = total === 0 ? 0 : start + 1;
  const to = Math.min(start + CONTAINER_PAGE_SIZE, total);
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 text-left text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2">Container</th>
              <th className="px-4 py-2">Invoiced GHS</th>
              <th className="px-4 py-2">Shipping fee (not in total)</th>
              <th className="px-4 py-2">Expenses</th>
              <th className="px-4 py-2">Gain</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-gray-500 dark:text-gray-400" colSpan={5}>
                  No container freight or expenses in this period.
                </td>
              </tr>
            )}
            {visible.map((row) => (
              <tr key={row.id} className="border-t border-gray-200 dark:border-white/10">
                <td className="px-4 py-3 font-medium">{row.container_number}</td>
                <td className="px-4 py-3">{money(row.fee_ghs)}</td>
                <td className="px-4 py-3">{money(row.tracking_fee, "")}</td>
                <td className="px-4 py-3">{money(row.expenses_ghs)}</td>
                <td className="px-4 py-3">
                  {row.gain_ghs === null ? "No fee yet" : money(row.gain_ghs)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm text-gray-500 dark:border-white/10 dark:text-gray-400">
          <span>
            {from}–{to} of {total}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => onPage(safePage - 1)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40 dark:border-white/10"
            >
              Previous
            </button>
            <span>
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => onPage(safePage + 1)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40 dark:border-white/10"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function pageSlice(rows, page) {
  const start = (Math.max(page, 1) - 1) * PANEL_PAGE_SIZE;
  return rows.slice(start, start + PANEL_PAGE_SIZE);
}

function PanelPage({ page, total, onPage, children }) {
  const totalPages = Math.max(1, Math.ceil(total / PANEL_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * PANEL_PAGE_SIZE + 1;
  const end = Math.min(safePage * PANEL_PAGE_SIZE, total);
  return (
    <div>
      {children}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>
            {start}–{end} of {total}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => onPage(safePage - 1)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40 dark:border-white/10"
            >
              Previous
            </button>
            <span className="px-2 py-1.5">
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => onPage(safePage + 1)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40 dark:border-white/10"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ContainerLines({ rows }) {
  return (
    <table className="min-w-full text-sm">
      <thead className="text-left text-gray-500 dark:text-gray-400">
        <tr>
          <th className="py-2 pr-3">Container</th>
          <th className="py-2 pr-3">Invoiced GHS</th>
          <th className="py-2 pr-3">Expenses</th>
          <th className="py-2 pr-3">Gain</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-gray-200 dark:border-white/10">
            <td className="py-2 pr-3">{row.container_number}</td>
            <td className="py-2 pr-3">{money(row.fee_ghs)}</td>
            <td className="py-2 pr-3">{money(row.expenses_ghs)}</td>
            <td className="py-2 pr-3">{row.gain_ghs === null ? "No fee yet" : money(row.gain_ghs)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
