import React, { useCallback, useEffect, useState } from "react";
import { Api } from "../../api";
import { apiErrorMessage } from "../../utils/apiErrorMessage";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-[#151D2E] px-2.5 py-2 text-sm font-semibold text-slate-50 outline-none placeholder:text-slate-500 focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20";

function emptyEdit() {
  return {
    tracking_number: "",
    mark_id: "",
    package_kg: "",
    package_size: "",
    package_cbm: "",
    product_name: "",
  };
}

function calcCbmFromSize(size) {
  const parts = String(size || "")
    .replace(/[xX×]/g, "*")
    .split("*")
    .map((p) => Number(String(p).trim().replace(",", ".")))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (parts.length !== 3) return "";
  const raw = (parts[0] * parts[1] * parts[2]) / 1000000;
  if (!Number.isFinite(raw) || raw <= 0) return "";
  return Math.max(raw, 0.001).toFixed(3);
}

export default function WarehouseReceivedPackages({ onBack }) {
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [edit, setEdit] = useState(emptyEdit());
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await Api.scanner.warehouseReceivedList({
        page,
        page_size: 50,
        q: search,
      });
      const data = res.data || {};
      setRows(Array.isArray(data.results) ? data.results : []);
      setCount(Number(data.count) || 0);
    } catch (e) {
      setRows([]);
      setCount(0);
      setError(apiErrorMessage(e?.response?.data, "Could not load received packages"));
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = (row) => {
    setEditingId(row.id);
    setEdit({
      tracking_number: row.tracking_number || "",
      mark_id: row.mark_id || "",
      package_kg: row.package_kg || "",
      package_size: row.package_size || "",
      package_cbm: row.package_cbm || "",
      product_name: row.product_name || "",
    });
    setError("");
    setInfo("");
  };

  const patchEdit = (partial) => {
    setEdit((prev) => {
      const next = { ...prev, ...partial };
      if (Object.prototype.hasOwnProperty.call(partial, "package_size")) {
        const cbm = calcCbmFromSize(next.package_size);
        if (cbm) next.package_cbm = cbm;
      }
      return next;
    });
  };

  const saveEdit = async (id) => {
    setBusyId(id);
    setError("");
    try {
      await Api.scanner.warehouseReceivedUpdate(id, {
        tracking_number: edit.tracking_number.trim(),
        mark_id: edit.mark_id.trim(),
        package_kg: edit.package_kg,
        package_size: edit.package_size.trim(),
        package_cbm: edit.package_cbm,
        product_name: edit.product_name.trim(),
      });
      setEditingId(null);
      setInfo("Saved — Quick Tracking and Excel/Sheets will use this update.");
      await load();
    } catch (e) {
      setError(apiErrorMessage(e?.response?.data, "Could not save changes"));
    } finally {
      setBusyId(null);
    }
  };

  const removeRow = async (row) => {
    const ok = window.confirm(
      `Delete received package ${row.tracking_number || row.id}? This also removes it from Quick Tracking and Excel.`
    );
    if (!ok) return;
    setBusyId(row.id);
    setError("");
    try {
      await Api.scanner.warehouseReceivedDelete(row.id);
      setInfo("Deleted — Quick Tracking and Excel/Sheets will refresh for that container.");
      if (editingId === row.id) setEditingId(null);
      await load();
    } catch (e) {
      setError(apiErrorMessage(e?.response?.data, "Could not delete this package"));
    } finally {
      setBusyId(null);
    }
  };

  const pages = Math.max(1, Math.ceil(count / 50));

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10 lg:py-10">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm font-semibold text-slate-400 hover:text-amber-300"
      >
        ← Back
      </button>
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-400">
        China warehouse
      </p>
      <h1 className="mt-1 text-2xl font-extrabold text-slate-50">Received packages</h1>
      <p className="mt-2 max-w-3xl text-sm text-slate-400">
        Edit or delete goods submitted from this scanner. Changes update the same
        records as admin Quick Tracking and the container Excel / Google Sheet.
        Those pages keep their current layout.
      </p>

      <form
        className="mt-5 flex flex-wrap gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSearch(q.trim());
        }}
      >
        <input
          className={`${inputClass} max-w-md`}
          value={q}
          placeholder="Search tracking, mark, product, size, container"
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-[#0B1220]"
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => load()}
          className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200"
        >
          Refresh
        </button>
      </form>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300">
          {error}
        </div>
      ) : null}
      {info ? (
        <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-300">
          {info}
        </div>
      ) : null}

      <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/5 text-xs font-bold uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-3">Tracking number</th>
              <th className="px-3 py-3">Weight</th>
              <th className="px-3 py-3">Product</th>
              <th className="px-3 py-3">Size</th>
              <th className="px-3 py-3">CBM</th>
              <th className="px-3 py-3">Mark ID</th>
              <th className="px-3 py-3">Container</th>
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-6 text-slate-400" colSpan={8}>
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-slate-400" colSpan={8}>
                  No received packages yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const isEdit = editingId === row.id;
                const busy = busyId === row.id;
                return (
                  <tr key={row.id} className="border-t border-white/10">
                    <td className="px-3 py-2 font-mono text-slate-100">
                      {isEdit ? (
                        <input
                          className={inputClass}
                          value={edit.tracking_number}
                          onChange={(e) =>
                            patchEdit({ tracking_number: e.target.value })
                          }
                        />
                      ) : (
                        row.tracking_number || "—"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {isEdit ? (
                        <input
                          className={inputClass}
                          value={edit.package_kg}
                          onChange={(e) =>
                            patchEdit({
                              package_kg: e.target.value.replace(/[^0-9.,]/g, ""),
                            })
                          }
                        />
                      ) : (
                        row.package_kg || "—"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {isEdit ? (
                        <input
                          className={inputClass}
                          value={edit.product_name}
                          onChange={(e) =>
                            patchEdit({ product_name: e.target.value })
                          }
                        />
                      ) : (
                        row.product_name || "—"
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono">
                      {isEdit ? (
                        <input
                          className={inputClass}
                          value={edit.package_size}
                          placeholder="10*10*20"
                          onChange={(e) =>
                            patchEdit({ package_size: e.target.value })
                          }
                        />
                      ) : (
                        row.package_size || "—"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {isEdit ? (
                        <input
                          className={inputClass}
                          value={edit.package_cbm}
                          onChange={(e) =>
                            patchEdit({
                              package_cbm: e.target.value.replace(/[^0-9.,]/g, ""),
                            })
                          }
                        />
                      ) : (
                        row.package_cbm || "—"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {isEdit ? (
                        <input
                          className={inputClass}
                          value={edit.mark_id}
                          onChange={(e) =>
                            patchEdit({ mark_id: e.target.value.toUpperCase() })
                          }
                        />
                      ) : (
                        row.mark_id || "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-400">
                      {row.container_number || "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-2">
                        {isEdit ? (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => saveEdit(row.id)}
                              className="rounded-lg bg-amber-400 px-2.5 py-1 text-xs font-bold text-[#0B1220] disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setEditingId(null)}
                              className="rounded-lg border border-white/15 px-2.5 py-1 text-xs font-semibold text-slate-300"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => startEdit(row)}
                              className="rounded-lg border border-amber-400/40 px-2.5 py-1 text-xs font-semibold text-amber-300"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => removeRow(row)}
                              className="rounded-lg border border-rose-400/40 px-2.5 py-1 text-xs font-semibold text-rose-300"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
        <span>
          Page {page} of {pages} · {count} package{count === 1 ? "" : "s"}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-white/15 px-3 py-1 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= pages || loading}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-white/15 px-3 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
