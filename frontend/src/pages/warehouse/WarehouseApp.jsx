/**
 * FIMW Warehouse web scanner — same flows as the mobile app,
 * with typed tracking numbers (no camera).
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Api } from "../../api";
import { apiErrorMessage } from "../../utils/apiErrorMessage";

const MARK_PREFIX = "FIM";

const CHINA_ACTIONS = [
  {
    id: "received",
    label: "Received",
    hint: "Accept into China warehouse",
    tone: "success",
  },
  {
    id: "rejected",
    label: "Reject",
    hint: "Mark as rejected (still searchable)",
    tone: "danger",
  },
  {
    id: "returned",
    label: "Return",
    hint: "Mark as returned (still searchable)",
    tone: "amber",
  },
];

const emptyDraft = () => ({
  trackingNumber: "",
  markId: MARK_PREFIX,
  fullName: "",
  containerNumber: "",
  heightCm: "",
  widthCm: "",
  lengthCm: "",
  productName: "",
  weightKg: "",
  reason: "",
});

function withFimPrefix(raw) {
  const upper = String(raw || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (!upper) return MARK_PREFIX;
  if (upper.startsWith(MARK_PREFIX)) {
    return MARK_PREFIX + upper.slice(MARK_PREFIX.length).replace(/\D/g, "");
  }
  const fimAt = upper.indexOf(MARK_PREFIX);
  if (fimAt >= 0) {
    return (
      MARK_PREFIX + upper.slice(fimAt + MARK_PREFIX.length).replace(/\D/g, "")
    );
  }
  return MARK_PREFIX + upper.replace(/\D/g, "");
}

function isUsableMarkId(mark) {
  return /^FIM\d+$/i.test(String(mark || "").trim());
}

function calcCbm(h, w, l) {
  const height = Number(String(h || "").replace(",", "."));
  const width = Number(String(w || "").replace(",", "."));
  const length = Number(String(l || "").replace(",", "."));
  if (
    ![height, width, length].every((n) => Number.isFinite(n) && n > 0)
  ) {
    return "";
  }
  return ((height * width * length) / 1000000).toFixed(3);
}

function actionLabel(warehouse, action) {
  if (warehouse === "china") {
    return CHINA_ACTIONS.find((a) => a.id === action)?.label || action;
  }
  if (action === "picked_up") return "Confirm picked up";
  return action || "—";
}

function toneClass(tone) {
  if (tone === "success") return "border-emerald-400/40 bg-emerald-500/10 text-emerald-300";
  if (tone === "danger") return "border-rose-400/40 bg-rose-500/10 text-rose-300";
  if (tone === "amber") return "border-amber-400/40 bg-amber-500/10 text-amber-300";
  if (tone === "teal") return "border-teal-400/40 bg-teal-500/10 text-teal-300";
  return "border-white/10 bg-white/5 text-slate-100";
}

function Shell({ children, title, subtitle, onBack, eyebrow, wide, actions }) {
  return (
    <div
      className={`mx-auto w-full px-6 py-8 lg:px-10 lg:py-10 ${
        wide ? "max-w-6xl" : "max-w-5xl"
      }`}
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-slate-300 hover:text-white"
            >
              ← Back
            </button>
          ) : null}
          {eyebrow ? (
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-400">
              {eyebrow}
            </p>
          ) : null}
          {title ? (
            <h1 className="text-3xl font-black tracking-tight text-slate-50 lg:text-4xl">
              {title}
            </h1>
          ) : null}
          {subtitle ? (
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-400">
              {subtitle}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function ActionCard({ title, hint, tone, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-full w-full rounded-2xl border px-5 py-6 text-left transition hover:brightness-110 ${toneClass(
        tone
      )}`}
    >
      <div className="text-xl font-extrabold">{title}</div>
      {hint ? <div className="mt-2 text-sm leading-relaxed opacity-80">{hint}</div> : null}
    </button>
  );
}

function ActionGrid({ children }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {children}
    </div>
  );
}

function Panel({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-[#121A2A] p-5 lg:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

function Field({ label, hint, children, className = "" }) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </span>
      {hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}
      {children}
    </label>
  );
}

function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={`rounded-xl bg-amber-400 px-5 py-3.5 text-sm font-black text-[#0B1220] hover:bg-amber-300 disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={`rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-slate-100 hover:bg-white/10 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#151D2E] px-3.5 py-3 text-base font-semibold text-slate-50 outline-none placeholder:text-slate-500 focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20";

export default function WarehouseApp() {
  const [view, setView] = useState("home");
  const [warehouse, setWarehouse] = useState(null);
  const [action, setAction] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [lastResult, setLastResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [containers, setContainers] = useState([]);
  const [containersLoading, setContainersLoading] = useState(false);
  const [markName, setMarkName] = useState("");
  const [markLoading, setMarkLoading] = useState(false);

  const [pickupDate, setPickupDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [pickupLog, setPickupLog] = useState(null);
  const [pickupByMark, setPickupByMark] = useState(null);

  const [exportContainers, setExportContainers] = useState([]);
  const [exportContainer, setExportContainer] = useState("");
  const [uploadFile, setUploadFile] = useState(null);

  const cbm = useMemo(
    () => calcCbm(draft.heightCm, draft.widthCm, draft.lengthCm),
    [draft.heightCm, draft.widthCm, draft.lengthCm]
  );

  const patch = useCallback((partial) => {
    setDraft((prev) => ({ ...prev, ...partial }));
  }, []);

  const goHome = () => {
    setView("home");
    setWarehouse(null);
    setAction(null);
    setDraft(emptyDraft());
    setLastResult(null);
    setError("");
    setInfo("");
  };

  const openWarehouse = (id) => {
    setWarehouse(id);
    setAction(null);
    setDraft(emptyDraft());
    setLastResult(null);
    setError("");
    setInfo("");
    setView(id === "china" ? "china-home" : "ghana-home");
  };

  const startAction = (nextAction) => {
    setAction(nextAction);
    setDraft(emptyDraft());
    setError("");
    setInfo("");
    setView("tracking");
  };

  const loadReceivingContainers = useCallback(async () => {
    setContainersLoading(true);
    try {
      const list = await Api.containers.receivingList();
      setContainers(list);
    } catch {
      setContainers([]);
    } finally {
      setContainersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === "assign" && action === "received") {
      loadReceivingContainers();
    }
  }, [view, action, loadReceivingContainers]);

  useEffect(() => {
    if (view !== "assign") return;
    const mark = String(draft.markId || "").trim();
    if (!isUsableMarkId(mark)) {
      setMarkName("");
      return;
    }
    let cancelled = false;
    setMarkLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await Api.scanner.markLookup(mark);
        if (cancelled) return;
        const name = res.data?.full_name || res.data?.name || "";
        setMarkName(name);
        patch({ fullName: name });
      } catch {
        if (!cancelled) {
          setMarkName("");
          patch({ fullName: "" });
        }
      } finally {
        if (!cancelled) setMarkLoading(false);
      }
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [view, draft.markId, patch]);

  const continueFromTracking = () => {
    const tracking = String(draft.trackingNumber || "").trim();
    if (!tracking) {
      setError("Enter a tracking number");
      return;
    }
    setError("");
    if (warehouse === "china") {
      setView("assign");
      return;
    }
    setView("submit");
  };

  const assignFormComplete = useMemo(() => {
    if (view !== "assign" || busy || markLoading || error) return false;
    if (!isUsableMarkId(draft.markId)) return false;
    if (action === "received") {
      if (!String(draft.containerNumber || "").trim()) return false;
      const cbmNum = Number(cbm);
      if (!Number.isFinite(cbmNum) || cbmNum <= 0) return false;
      const kgNum = Number(
        String(draft.weightKg || "").trim().replace(",", ".")
      );
      if (!Number.isFinite(kgNum) || kgNum <= 0) return false;
      if (!String(draft.productName || "").trim()) return false;
      return true;
    }
    return Boolean(String(draft.reason || "").trim());
  }, [
    view,
    busy,
    markLoading,
    error,
    draft.markId,
    draft.containerNumber,
    draft.weightKg,
    draft.productName,
    draft.reason,
    action,
    cbm,
  ]);

  const submitScan = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const cbmNum = Number(cbm);
      const kgRaw = String(draft.weightKg || "").trim().replace(",", ".");
      const kgNum = kgRaw ? Number(kgRaw) : NaN;
      if (warehouse === "china" && action === "received") {
        if (!Number.isFinite(cbmNum) || cbmNum <= 0) {
          setError("Enter valid package dimensions (cm)");
          setBusy(false);
          return;
        }
        if (!Number.isFinite(kgNum) || kgNum <= 0) {
          setError("Enter package weight in kg");
          setBusy(false);
          return;
        }
        if (!String(draft.productName || "").trim()) {
          setError("Enter the product name");
          setBusy(false);
          return;
        }
      }
      const payload = {
        warehouse,
        action,
        tracking_number: String(draft.trackingNumber || "").trim(),
        mark_id: String(draft.markId || "").trim() || undefined,
        full_name: String(draft.fullName || "").trim() || undefined,
        container_number:
          String(draft.containerNumber || "").trim() || undefined,
        cbm: Number.isFinite(cbmNum) && cbmNum > 0 ? cbmNum : undefined,
        kg: Number.isFinite(kgNum) && kgNum > 0 ? kgNum : undefined,
        product_name: String(draft.productName || "").trim() || undefined,
        note: String(draft.reason || "").trim() || undefined,
      };
      const res = await Api.scanner.submit(payload);
      const data = res.data || {};
      setLastResult({
        warehouse,
        action,
        trackingNumber: data.tracking_number || payload.tracking_number,
        markId: data.mark_id || payload.mark_id || "",
        fullName: data.full_name || payload.full_name || "",
        containerNumber: data.container_number || payload.container_number || "",
        previousContainerNumber: data.previous_container_number || "",
        reassigned: Boolean(data.reassigned),
        cbm: payload.cbm != null ? String(payload.cbm) : "",
        weightKg:
          data.kg != null
            ? String(data.kg)
            : payload.kg != null
              ? String(payload.kg)
              : "",
        productName: data.product_name || payload.product_name || "",
        statusDisplay: data.status_display || "",
        isRepack: Boolean(data.is_repack),
        repackMemberCount: Number(data.repack_member_count || 0),
        message: data.message || "",
      });
      setView("success");
    } catch (e) {
      setError(
        apiErrorMessage(
          e?.response?.data,
          e?.message || "Could not save this scan"
        )
      );
    } finally {
      setBusy(false);
    }
  }, [busy, cbm, draft, warehouse, action]);

  // China assign: auto-submit when required fields are filled (debounce for optional weight/product).
  useEffect(() => {
    if (!assignFormComplete) return undefined;
    const timer = setTimeout(() => {
      submitScan();
    }, 1200);
    return () => clearTimeout(timer);
  }, [
    assignFormComplete,
    submitScan,
    draft.productName,
    draft.weightKg,
    draft.reason,
    draft.markId,
    draft.containerNumber,
    draft.heightCm,
    draft.widthCm,
    draft.lengthCm,
  ]);

  // Ghana submit: lookup tracking for confirmation
  useEffect(() => {
    if (view !== "submit" || warehouse !== "ghana" || action !== "picked_up") {
      return;
    }
    const tracking = String(draft.trackingNumber || "").trim();
    if (!tracking) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await Api.scanner.trackingLookup(tracking);
        if (cancelled) return;
        patch({
          markId: res.data?.mark_id || "",
          fullName: res.data?.full_name || "",
        });
        setError("");
      } catch (e) {
        if (cancelled) return;
        patch({ markId: "", fullName: "" });
        setError(
          apiErrorMessage(
            e?.response?.data,
            e?.response?.status === 404
              ? "Tracking not found"
              : "Could not look up tracking"
          )
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [view, warehouse, action, draft.trackingNumber, patch]);

  const scanNext = useCallback(() => {
    const keepAssign = warehouse === "china";
    setDraft((prev) =>
      keepAssign
        ? {
            ...emptyDraft(),
            markId: prev.markId || MARK_PREFIX,
            fullName: prev.fullName || "",
            containerNumber: prev.containerNumber || "",
          }
        : emptyDraft()
    );
    setLastResult(null);
    setError("");
    setInfo("");
    setView("tracking");
  }, [warehouse]);

  // After success, briefly show confirmation then return to tracking.
  useEffect(() => {
    if (view !== "success" || !lastResult?.trackingNumber) return undefined;
    const timer = setTimeout(() => {
      scanNext();
    }, 1200);
    return () => clearTimeout(timer);
  }, [view, lastResult?.trackingNumber, scanNext]);

  const openExport = async () => {
    setView("export");
    setError("");
    setInfo("");
    try {
      const list = await Api.containers.exportList();
      setExportContainers(list);
    } catch {
      setExportContainers([]);
    }
  };

  const doExport = async () => {
    if (!exportContainer) {
      setError("Select a container");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await Api.scanner.downloadContainerExport(exportContainer);
      setInfo("Excel downloaded — open it with Excel.");
    } catch (e) {
      setError(apiErrorMessage(e?.response?.data, "Export failed"));
    } finally {
      setBusy(false);
    }
  };

  const openUpload = async () => {
    setView("upload");
    setUploadFile(null);
    setError("");
    setInfo("");
    await loadReceivingContainers();
  };

  const doUpload = async () => {
    if (!draft.containerNumber) {
      setError("Select a container");
      return;
    }
    if (!uploadFile) {
      setError("Choose an Excel file (.xlsx)");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await Api.scanner.uploadChinaExcel({
        containerNumber: draft.containerNumber,
        file: uploadFile,
      });
      setInfo("Excel uploaded for this container.");
      setUploadFile(null);
    } catch (e) {
      setError(apiErrorMessage(e?.response?.data, "Upload failed"));
    } finally {
      setBusy(false);
    }
  };

  const openPickupLog = async () => {
    setView("pickup-log");
    setError("");
  };

  useEffect(() => {
    if (view !== "pickup-log") return;
    let cancelled = false;
    (async () => {
      setBusy(true);
      try {
        const [logRes, byMarkRes] = await Promise.all([
          Api.scanner.ghanaPickups({ date: pickupDate }),
          Api.scanner.ghanaPickupsByMark({ date: pickupDate }),
        ]);
        if (cancelled) return;
        setPickupLog(logRes.data || null);
        setPickupByMark(byMarkRes.data || null);
      } catch (e) {
        if (!cancelled) {
          setPickupLog(null);
          setPickupByMark(null);
          setError(apiErrorMessage(e?.response?.data, "Could not load pickup log"));
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [view, pickupDate]);

  return (
    <div className="min-h-screen bg-[#0B1220] text-slate-100">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0B1220]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 lg:px-10">
          <button type="button" onClick={goHome} className="text-left">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-400">
              FIMW
            </div>
            <div className="text-base font-extrabold text-slate-50">
              Warehouse scanner
            </div>
          </button>
          <div className="flex items-center gap-3">
            {warehouse ? (
              <span className="hidden rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold capitalize text-slate-300 sm:inline">
                {warehouse} warehouse
                {action ? ` · ${actionLabel(warehouse, action)}` : ""}
              </span>
            ) : null}
            <span className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-400">
              Desktop · type tracking
            </span>
          </div>
        </div>
      </header>

      {view === "home" ? (
        <Shell
          title="Where are you scanning?"
          subtitle="China warehouse for receiving. Ghana warehouse for customer pickup."
        >
          <ActionGrid>
            <ActionCard
              title="China warehouse"
              hint="Receive, reject, or return packages"
              tone="amber"
              onClick={() => openWarehouse("china")}
            />
            <ActionCard
              title="Ghana warehouse"
              hint="Confirm pickup · sets tracking to Pick up"
              tone="teal"
              onClick={() => openWarehouse("ghana")}
            />
          </ActionGrid>
        </Shell>
      ) : null}

      {view === "china-home" ? (
        <Shell
          eyebrow="China warehouse"
          title="Choose action"
          subtitle="Select package status, then enter the tracking number."
          onBack={goHome}
        >
          <ActionGrid>
            {CHINA_ACTIONS.map((item) => (
              <ActionCard
                key={item.id}
                title={item.label}
                hint={item.hint}
                tone={item.tone}
                onClick={() => startAction(item.id)}
              />
            ))}
            <ActionCard
              title="Export container"
              hint="Download trackings grouped by Mark ID (Excel)"
              tone="amber"
              onClick={openExport}
            />
            <ActionCard
              title="Upload Excel"
              hint="Assign an Excel sheet to a container"
              tone="amber"
              onClick={openUpload}
            />
          </ActionGrid>
        </Shell>
      ) : null}

      {view === "ghana-home" ? (
        <Shell
          eyebrow="Ghana warehouse"
          title="Pickup"
          subtitle="Confirm customer pickup or review today’s log."
          onBack={goHome}
        >
          <ActionGrid>
            <ActionCard
              title="Confirm picked up"
              hint="Type tracking or sack barcode, then confirm"
              tone="teal"
              onClick={() => startAction("picked_up")}
            />
            <ActionCard
              title="Pickup log"
              hint="Daily pickup activity by Mark ID"
              tone="teal"
              onClick={openPickupLog}
            />
          </ActionGrid>
        </Shell>
      ) : null}

      {view === "tracking" ? (
        <Shell
          eyebrow={`${warehouse === "china" ? "China" : "Ghana"} · ${actionLabel(
            warehouse,
            action
          )}`}
          title="Enter tracking"
          subtitle="Type or paste the package tracking number."
          onBack={() =>
            setView(warehouse === "china" ? "china-home" : "ghana-home")
          }
        >
          <Panel className="mx-auto max-w-2xl">
            {error ? (
              <div className="mb-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300">
                {error}
              </div>
            ) : null}
            <Field label="Tracking number">
              <input
                className={inputClass}
                value={draft.trackingNumber}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                placeholder="Paste or type tracking #"
                onChange={(e) => {
                  patch({ trackingNumber: e.target.value.trim() });
                  setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") continueFromTracking();
                }}
              />
            </Field>
            <div className="mt-5 flex justify-end">
              <PrimaryButton onClick={continueFromTracking} className="min-w-[160px]">
                Continue
              </PrimaryButton>
            </div>
          </Panel>
        </Shell>
      ) : null}

      {view === "assign" ? (
        <Shell
          eyebrow={`China · ${actionLabel(warehouse, action)} · ${draft.trackingNumber}`}
          title={action === "received" ? "Container & Mark ID" : "Mark ID"}
          subtitle={
            action === "received"
              ? "Fill every field — saves automatically when complete."
              : "Enter Mark ID and reason — saves automatically when complete."
          }
          onBack={() => setView("tracking")}
        >
          {error ? (
            <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300">
              {error}
            </div>
          ) : null}

          <div
            className={`grid grid-cols-1 gap-5 ${
              action === "received" ? "lg:grid-cols-2" : "lg:grid-cols-1 lg:max-w-2xl"
            }`}
          >
            <Panel className="space-y-4">
              {action === "received" ? (
                <Field label="Container (preparing / receiving / loading)">
                  <select
                    className={inputClass}
                    value={draft.containerNumber}
                    disabled={containersLoading}
                    onChange={(e) => {
                      patch({ containerNumber: e.target.value });
                      setError("");
                    }}
                  >
                    <option value="">
                      {containersLoading ? "Loading…" : "Select container…"}
                    </option>
                    {containers.map((c) => (
                      <option
                        key={c.id || c.container_number}
                        value={c.container_number}
                      >
                        {c.container_number}
                        {c.status_display || c.status
                          ? ` · ${String(c.status_display || c.status).replaceAll("_", " ")}`
                          : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500">
                    {containers.length} container
                    {containers.length === 1 ? "" : "s"} available
                  </p>
                </Field>
              ) : null}

              <Field
                label="Mark ID"
                hint="Type digits only — FIM is added automatically"
              >
                <input
                  className={inputClass}
                  value={draft.markId}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="FIM123"
                  disabled={busy}
                  onChange={(e) => {
                    patch({ markId: withFimPrefix(e.target.value) });
                    setError("");
                  }}
                />
                {markLoading ? (
                  <p className="text-xs text-slate-400">Looking up name…</p>
                ) : markName ? (
                  <p className="text-sm font-semibold text-emerald-300">
                    {markName}
                  </p>
                ) : isUsableMarkId(draft.markId) ? (
                  <p className="text-xs text-slate-500">No user for this mark</p>
                ) : null}
              </Field>

              {action !== "received" ? (
                <Field label="Reason" hint="Required for reject / return">
                  <textarea
                    className={`${inputClass} min-h-[120px] resize-y`}
                    value={draft.reason}
                    placeholder="Why was this rejected or returned?"
                    onChange={(e) => {
                      patch({ reason: e.target.value });
                      setError("");
                    }}
                  />
                </Field>
              ) : null}
            </Panel>

            {action === "received" ? (
              <Panel className="space-y-4">
                <Field
                  label="Package dimensions (cm)"
                  hint="Height × Width × Length → CBM"
                >
                  <div className="grid grid-cols-3 gap-3">
                    {["heightCm", "widthCm", "lengthCm"].map((key, i) => (
                      <input
                        key={key}
                        className={inputClass}
                        inputMode="decimal"
                        placeholder={["H", "W", "L"][i]}
                        value={draft[key]}
                        disabled={busy}
                        onChange={(e) => {
                          patch({
                            [key]: String(e.target.value || "").replace(
                              /[^0-9.,]/g,
                              ""
                            ),
                          });
                          setError("");
                        }}
                      />
                    ))}
                  </div>
                </Field>
                <div className="rounded-xl border border-white/10 bg-[#151D2E] px-4 py-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    CBM (auto)
                  </div>
                  <div className="mt-1 text-3xl font-black text-amber-300">
                    {cbm || "—"}
                  </div>
                </div>
                <Field label="Weight (kg)">
                  <input
                    className={inputClass}
                    inputMode="decimal"
                    value={draft.weightKg}
                    placeholder="e.g. 12.5"
                    disabled={busy}
                    onChange={(e) => {
                      patch({
                        weightKg: String(e.target.value || "").replace(
                          /[^0-9.,]/g,
                          ""
                        ),
                      });
                      setError("");
                    }}
                  />
                </Field>
                <Field label="Product name">
                  <input
                    className={inputClass}
                    value={draft.productName}
                    placeholder="e.g. Shoes"
                    disabled={busy}
                    onChange={(e) => {
                      patch({ productName: e.target.value });
                      setError("");
                    }}
                  />
                </Field>
              </Panel>
            ) : null}
          </div>

          {assignFormComplete || busy ? (
            <div className="flex items-center justify-end gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">
              {busy ? "Saving…" : "All set — saving automatically…"}
            </div>
          ) : null}
        </Shell>
      ) : null}

      {view === "submit" ? (
        <Shell
          eyebrow={`${warehouse === "china" ? "China" : "Ghana"} · Review`}
          title="Submit scan"
          subtitle="Confirm details, then save."
          onBack={() =>
            setView(warehouse === "china" ? "assign" : "tracking")
          }
        >
          <div className="mx-auto grid max-w-3xl gap-5">
            {error ? (
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300">
                {error}
              </div>
            ) : null}
            <Panel>
              <div className="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
                <Row label="Action" value={actionLabel(warehouse, action)} />
                <Row label="Tracking" value={draft.trackingNumber} />
                {draft.markId ? (
                  <Row label="Mark ID" value={draft.markId} />
                ) : null}
                {draft.fullName ? (
                  <Row label="Customer" value={draft.fullName} accent />
                ) : null}
                {draft.containerNumber ? (
                  <Row label="Container" value={draft.containerNumber} />
                ) : null}
                {cbm ? <Row label="CBM" value={cbm} /> : null}
                {draft.weightKg ? (
                  <Row label="Weight (kg)" value={draft.weightKg} />
                ) : null}
                {draft.productName ? (
                  <Row label="Product" value={draft.productName} />
                ) : null}
                {draft.reason ? (
                  <Row label="Reason" value={draft.reason} />
                ) : null}
              </div>
            </Panel>
            <div className="flex justify-end">
              <PrimaryButton
                disabled={busy}
                onClick={submitScan}
                className="min-w-[160px]"
              >
                {busy ? "Saving…" : "Submit"}
              </PrimaryButton>
            </div>
          </div>
        </Shell>
      ) : null}

      {view === "success" && lastResult ? (
        <Shell eyebrow="Saved" title="Scan recorded">
          <div className="mx-auto grid max-w-3xl gap-5">
            <Panel>
              <div className="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
                <Row
                  label="Action"
                  value={actionLabel(lastResult.warehouse, lastResult.action)}
                  accent
                />
                <Row label="Tracking" value={lastResult.trackingNumber} />
                {lastResult.markId ? (
                  <Row label="Mark ID" value={lastResult.markId} />
                ) : null}
                {lastResult.fullName ? (
                  <Row label="Customer" value={lastResult.fullName} accent />
                ) : null}
                {lastResult.containerNumber ? (
                  <Row label="Container" value={lastResult.containerNumber} />
                ) : null}
                {lastResult.reassigned && lastResult.previousContainerNumber ? (
                  <Row
                    label="Moved from"
                    value={lastResult.previousContainerNumber}
                    accent
                  />
                ) : null}
                {lastResult.cbm ? (
                  <Row label="CBM" value={lastResult.cbm} />
                ) : null}
                {lastResult.weightKg ? (
                  <Row label="Weight (kg)" value={lastResult.weightKg} />
                ) : null}
                {lastResult.productName ? (
                  <Row label="Product" value={lastResult.productName} />
                ) : null}
                {lastResult.statusDisplay ? (
                  <Row label="Status" value={lastResult.statusDisplay} accent />
                ) : null}
              </div>
            </Panel>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-emerald-300">
                Returning to tracking…
              </p>
              <SecondaryButton
                onClick={() =>
                  setView(warehouse === "china" ? "china-home" : "ghana-home")
                }
              >
                Done · back to actions
              </SecondaryButton>
            </div>
          </div>
        </Shell>
      ) : null}

      {view === "export" ? (
        <Shell
          eyebrow="China warehouse"
          title="Export container"
          subtitle="Download trackings grouped by Mark ID."
          onBack={() => setView("china-home")}
        >
          <Panel className="mx-auto max-w-2xl space-y-4">
            {error ? (
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300">
                {error}
              </div>
            ) : null}
            {info ? (
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-300">
                {info}
              </div>
            ) : null}
            <Field label="Container">
              <select
                className={inputClass}
                value={exportContainer}
                onChange={(e) => setExportContainer(e.target.value)}
              >
                <option value="">Select container…</option>
                {exportContainers.map((c) => (
                  <option
                    key={c.id || c.container_number}
                    value={c.container_number}
                  >
                    {c.container_number}
                    {c.status_display || c.status
                      ? ` · ${String(c.status_display || c.status).replaceAll("_", " ")}`
                      : ""}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex justify-end">
              <PrimaryButton
                disabled={busy}
                onClick={doExport}
                className="min-w-[180px]"
              >
                {busy ? "Exporting…" : "Export to Excel"}
              </PrimaryButton>
            </div>
          </Panel>
        </Shell>
      ) : null}

      {view === "upload" ? (
        <Shell
          eyebrow="China warehouse"
          title="Upload Excel"
          subtitle="Choose the container, then upload the warehouse Excel file."
          onBack={() => setView("china-home")}
        >
          <Panel className="mx-auto max-w-2xl space-y-4">
            {error ? (
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300">
                {error}
              </div>
            ) : null}
            {info ? (
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-300">
                {info}
              </div>
            ) : null}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Container">
                <select
                  className={inputClass}
                  value={draft.containerNumber}
                  disabled={containersLoading}
                  onChange={(e) => patch({ containerNumber: e.target.value })}
                >
                  <option value="">
                    {containersLoading ? "Loading…" : "Select container…"}
                  </option>
                  {containers.map((c) => (
                    <option
                      key={c.id || c.container_number}
                      value={c.container_number}
                    >
                      {c.container_number}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Excel file">
                <input
                  type="file"
                  accept=".xlsx,.xls,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-400 file:px-3 file:py-2 file:text-sm file:font-bold file:text-[#0B1220]"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
                {uploadFile ? (
                  <p className="text-xs text-slate-400">{uploadFile.name}</p>
                ) : null}
              </Field>
            </div>
            <div className="flex justify-end">
              <PrimaryButton
                disabled={busy}
                onClick={doUpload}
                className="min-w-[200px]"
              >
                {busy ? "Uploading…" : "Upload to container"}
              </PrimaryButton>
            </div>
          </Panel>
        </Shell>
      ) : null}

      {view === "pickup-log" ? (
        <Shell
          wide
          eyebrow="Ghana warehouse"
          title="Pickup log"
          subtitle="Daily pickup activity."
          onBack={() => setView("ghana-home")}
          actions={
            <Field label="Date" className="w-44">
              <input
                type="date"
                className={inputClass}
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
              />
            </Field>
          }
        >
          {error ? (
            <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300">
              {error}
            </div>
          ) : null}
          {busy ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
              <Panel className="xl:col-span-1">
                {pickupLog?.summary ? (
                  <div className="mb-5">
                    <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                      Pickups today
                    </div>
                    <div className="mt-1 text-4xl font-black text-amber-300">
                      {String(
                        pickupLog.summary.total ??
                          pickupLog.summary.count ??
                          pickupLog.results?.length ??
                          "—"
                      )}
                    </div>
                  </div>
                ) : null}
                <h3 className="mb-3 text-sm font-bold text-slate-300">
                  By Mark ID
                </h3>
                {(pickupByMark?.results || pickupByMark?.marks || []).length ===
                0 ? (
                  <p className="text-sm text-slate-500">
                    No pickups for this day.
                  </p>
                ) : (
                  <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                    {(pickupByMark?.results || pickupByMark?.marks || []).map(
                      (row, i) => (
                        <div
                          key={row.mark_id || i}
                          className="rounded-xl border border-white/10 bg-[#151D2E] px-3 py-2.5 text-sm"
                        >
                          <div className="font-extrabold text-amber-300">
                            {row.mark_id || "—"}
                          </div>
                          <div className="text-slate-300">
                            {row.full_name || row.customer_name || "—"}
                            {" · "}
                            {row.count ?? row.total ?? row.packages ?? 0} pkg
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </Panel>
              <Panel className="xl:col-span-2">
                <h3 className="mb-3 text-sm font-bold text-slate-300">
                  Activity
                </h3>
                {(pickupLog?.results || []).length === 0 ? (
                  <p className="text-sm text-slate-500">No activity.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.1em] text-slate-500">
                          <th className="px-3 py-2 font-bold">Tracking</th>
                          <th className="px-3 py-2 font-bold">Mark ID</th>
                          <th className="px-3 py-2 font-bold">Customer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(pickupLog?.results || []).slice(0, 100).map(
                          (row, i) => (
                            <tr
                              key={row.id || row.tracking_number || i}
                              className="border-b border-white/5"
                            >
                              <td className="px-3 py-2.5 font-mono font-bold text-slate-100">
                                {row.tracking_number || "—"}
                              </td>
                              <td className="px-3 py-2.5 text-amber-300">
                                {row.mark_id || "—"}
                              </td>
                              <td className="px-3 py-2.5 text-slate-300">
                                {row.full_name || "—"}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </div>
          )}
        </Shell>
      ) : null}
    </div>
  );
}

function Row({ label, value, accent }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/5 py-2.5 last:border-0">
      <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
        {label}
      </span>
      <span
        className={`max-w-[70%] text-right text-sm font-bold ${
          accent ? "text-emerald-300" : "text-slate-100"
        }`}
      >
        {value || "—"}
      </span>
    </div>
  );
}
