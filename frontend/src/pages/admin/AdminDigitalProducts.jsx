import React, { useEffect, useMemo, useRef, useState } from "react";
import { Api } from "../../api";
import { toast } from "../../utils/toast";
import { FaEdit, FaFilePdf, FaImage, FaPlus, FaSave, FaTimes, FaUpload } from "react-icons/fa";

const resolveAssetUrl = (rawUrl) => {
  const url = String(rawUrl || "").trim();
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = String(import.meta.env?.VITE_API_BASE_URL || "").replace(/\/+$/, "");
  if (base && url.startsWith("/")) return `${base}${url}`;
  return url;
};

const emptyForm = {
  title: "",
  slug: "",
  description: "",
  price: "",
  sale_enabled: false,
  sale_price: "",
  discount_percent: "",
  is_active: true,
  file_url: "",
  thumbnail_url: "",
};

const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function AdminDigitalProducts() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const pdfInputRef = useRef(null);
  const thumbInputRef = useRef(null);

  const canSubmit = useMemo(() => {
    if (!String(form.title || "").trim()) return false;
    if (!String(form.slug || "").trim()) return false;
    if (!String(form.price || "").trim()) return false;
    if (!String(form.file_url || "").trim()) return false;
    if (form.sale_enabled) {
      const sp = Number(form.sale_price || 0);
      const dp = Number(form.discount_percent || 0);
      if (!(sp > 0) && !(dp > 0)) return false;
    }
    return true;
  }, [form]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await Api.digitalStore.admin.listProducts();
      const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
      setItems(list);
    } catch (e) {
      toast.error(
        e?.response?.data?.detail ||
          e?.response?.data?.error ||
          "Could not load digital products."
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setSlugManuallyEdited(false);
    setShowForm(true);
  };

  const openEdit = (x) => {
    setEditing(x);
    setForm({
      title: x.title || x.name || "",
      slug: x.slug || "",
      description: x.description || "",
      price: x.price ?? "",
      sale_enabled: !!x.sale_enabled,
      sale_price: x.sale_price ?? "",
      discount_percent: x.discount_percent ?? "",
      is_active: x.is_active !== false,
      file_url: x.file_url || x.file || "",
      thumbnail_url: x.thumbnail_url || x.thumbnail || "",
    });
    setSlugManuallyEdited(true);
    setShowForm(true);
  };

  const submit = async () => {
    if (!canSubmit) {
      toast.error("Please fill required fields (title, slug, price, file).");
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        title: String(form.title || "").trim(),
        slug: String(form.slug || "").trim(),
        description: String(form.description || "").trim(),
        price: Number(form.price),
        sale_enabled: !!form.sale_enabled,
        sale_price: form.sale_enabled && String(form.sale_price || "").trim() ? Number(form.sale_price) : null,
        discount_percent:
          form.sale_enabled && String(form.discount_percent || "").trim()
            ? Number(form.discount_percent)
            : null,
        is_active: !!form.is_active,
        file_url: String(form.file_url || "").trim(),
        thumbnail_url: String(form.thumbnail_url || "").trim() || null,
      };

      if (editing?.id) {
        await Api.digitalStore.admin.updateProduct(editing.id, payload);
        toast.success("Digital product updated.");
      } else {
        await Api.digitalStore.admin.createProduct(payload);
        toast.success("Digital product created.");
      }
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
      await load();
    } catch (e) {
      toast.error(
        e?.response?.data?.detail ||
          e?.response?.data?.error ||
          "Save failed."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const uploadPdf = async (file) => {
    try {
      setUploadingFile(true);
      // Upload a real PDF file to backend media storage
      const res = await Api.uploadFile(file, "digital_product");
      const url = res.data?.url || res.data?.filePath || res.data?.file_url || res.data?.file;
      if (!url) {
        toast.error("Upload did not return a PDF URL.");
        return;
      }
      setForm((f) => ({ ...f, file_url: url }));
      toast.success("PDF uploaded.");
    } catch (e) {
      toast.error(
        e?.response?.data?.detail ||
          e?.response?.data?.error ||
          "PDF upload failed."
      );
    } finally {
      setUploadingFile(false);
    }
  };

  const uploadThumb = async (file) => {
    try {
      setUploadingThumb(true);
      // Use the same working upload type as shop products (image only).
      const res = await Api.uploadFile(file, "product");
      const url = res.data?.url || res.data?.file_url || res.data?.file;
      if (!url) {
        toast.error("Upload did not return an image URL.");
        return;
      }
      setForm((f) => ({ ...f, thumbnail_url: url }));
      toast.success("Thumbnail uploaded.");
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.response?.data?.error || "Upload failed.");
    } finally {
      setUploadingThumb(false);
    }
  };

  const removeProduct = async (id) => {
    if (!id) return;
    const ok = window.confirm("Delete this digital product? This cannot be undone.");
    if (!ok) return;
    try {
      setDeletingId(id);
      await Api.digitalStore.admin.deleteProduct(id);
      toast.success("Digital product deleted.");
      await load();
    } catch (e) {
      toast.error(
        e?.response?.data?.detail || e?.response?.data?.error || "Delete failed."
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Digital products
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Upload a PDF and thumbnail, then set price and optional sale/discount.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95"
        >
          <FaPlus />
          Add digital product
        </button>
      </div>

      {showForm ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-gray-900 dark:text-white">
              {editing ? "Edit digital product" : "New digital product"}
            </p>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
                setForm(emptyForm);
              }}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Close"
            >
              <FaTimes />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Title
              </label>
              <input
                value={form.title}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => ({
                    ...f,
                    title: v,
                    slug: slugManuallyEdited ? f.slug : slugify(v),
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Slug
              </label>
              <input
                value={form.slug}
                onChange={(e) => {
                  setSlugManuallyEdited(true);
                  setForm((f) => ({ ...f, slug: slugify(e.target.value) }));
                }}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Price (GHS)
              </label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <FaFilePdf />
                  PDF file
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Upload the PDF customers will download after payment.
                </p>
                <div className="mt-3 flex gap-2">
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadPdf(f);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => pdfInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-60 dark:bg-white dark:text-gray-900"
                  >
                    <FaUpload />
                    {uploadingFile ? "Uploading…" : "Upload PDF"}
                  </button>
                  <input
                    value={form.file_url}
                    onChange={(e) => setForm((f) => ({ ...f, file_url: e.target.value }))}
                    placeholder="or paste PDF URL"
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <FaImage />
                  Thumbnail
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Square image recommended.
                </p>
                {String(form.thumbnail_url || "").trim() ? (
                  <div className="mt-3 flex items-center gap-3">
                    <img
                      src={resolveAssetUrl(form.thumbnail_url)}
                      alt="Thumbnail preview"
                      className="h-14 w-14 rounded-xl object-cover border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                        {form.thumbnail_url}
                      </p>
                    </div>
                  </div>
                ) : null}
                <div className="mt-3 flex gap-2">
                  <input
                    ref={thumbInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadThumb(f);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => thumbInputRef.current?.click()}
                    disabled={uploadingThumb}
                    className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-60 dark:bg-white dark:text-gray-900"
                  >
                    <FaUpload />
                    {uploadingThumb ? "Uploading…" : "Upload image"}
                  </button>
                  <input
                    value={form.thumbnail_url}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, thumbnail_url: e.target.value }))
                    }
                    placeholder="or paste image URL"
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="sm:col-span-2 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Sale / discount
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Enable a sale and set either a sale price or a discount percent.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={form.sale_enabled}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, sale_enabled: e.target.checked }))
                    }
                  />
                  Enabled
                </label>
              </div>
              {form.sale_enabled ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Sale price (GHS)
                    </label>
                    <input
                      type="number"
                      value={form.sale_price}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, sale_price: e.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Discount percent (%)
                    </label>
                    <input
                      type="number"
                      value={form.discount_percent}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          discount_percent: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
                setForm(emptyForm);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-950/40"
            >
              <FaTimes />
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !canSubmit}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
            >
              <FaSave />
              {submitting ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-700 flex items-center justify-between">
          <p className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            All digital products
          </p>
          <button
            type="button"
            onClick={load}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-gray-600 dark:text-gray-300">
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 text-sm text-gray-600 dark:text-gray-300">
            No digital products yet.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {items.map((x) => (
              <li key={x.id} className="p-5 flex items-start justify-between gap-4">
                <div className="min-w-0 flex items-start gap-3">
                  {String(x.thumbnail_url || "").trim() ? (
                    <img
                      src={resolveAssetUrl(x.thumbnail_url)}
                      alt={x.title || "Thumbnail"}
                      className="h-12 w-12 rounded-xl object-cover border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-gray-400 flex-shrink-0">
                      <FaImage />
                    </div>
                  )}
                  <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">
                    {x.title || x.name}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                    /{x.slug}
                  </p>
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                    ₵{Number(x.sale_price || x.price || 0).toFixed(2)}
                    {x.sale_enabled && x.price ? (
                      <span className="ml-2 text-xs text-gray-500 line-through">
                        ₵{Number(x.price || 0).toFixed(2)}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {(x.paid_purchases_count ?? 0)} downloads
                  </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(x)}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-950/40"
                  >
                    <FaEdit />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => removeProduct(x.id)}
                    disabled={deletingId === x.id}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900/40 dark:bg-gray-900 dark:text-red-300 dark:hover:bg-red-950/30"
                  >
                    {deletingId === x.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

