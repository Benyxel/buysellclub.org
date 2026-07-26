import React, { useCallback, useEffect, useState } from "react";
import {
  FaBullhorn,
  FaEdit,
  FaPlus,
  FaSpinner,
  FaTrash,
  FaUpload,
} from "react-icons/fa";
import API from "../../api";
import { toast } from "../../utils/toast";
import { resolveMediaUrl } from "../../utils/resolveMediaUrl";

const emptyForm = {
  title: "",
  link_url: "",
  sort_order: "0",
  is_active: true,
};

export default function HomeAnnouncementManagement() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [appFile, setAppFile] = useState(null);
  const [webFile, setWebFile] = useState(null);
  const [appPreview, setAppPreview] = useState("");
  const [webPreview, setWebPreview] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/buysellapi/admin/home-announcements/");
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load announcements");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(emptyForm);
    setAppFile(null);
    setWebFile(null);
    setAppPreview("");
    setWebPreview("");
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setAppFile(null);
    setWebFile(null);
    setAppPreview("");
    setWebPreview("");
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      title: item.title || "",
      link_url: item.link_url || "",
      sort_order: String(item.sort_order ?? 0),
      is_active: item.is_active !== false,
    });
    setAppFile(null);
    setWebFile(null);
    setAppPreview(resolveMediaUrl(item.image_url || item.image) || "");
    setWebPreview(resolveMediaUrl(item.image_web_url || item.image_web) || "");
    setShowModal(true);
  };

  const pickImage = (setterFile, setterPreview) => (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      toast.error("Please choose an image file (JPG, PNG, WebP, GIF)");
      return;
    }
    if (selected.size > 12 * 1024 * 1024) {
      toast.error("Image must be under 12MB");
      return;
    }
    setterFile(selected);
    setterPreview(URL.createObjectURL(selected));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editing && !appFile) {
      toast.error("Upload the app flyer image (1200×675)");
      return;
    }
    setSaving(true);
    try {
      const body = new FormData();
      body.append("title", form.title.trim());
      body.append("link_url", form.link_url.trim());
      body.append("sort_order", String(form.sort_order || 0));
      body.append("is_active", form.is_active ? "true" : "false");
      if (appFile) body.append("image", appFile);
      if (webFile) body.append("image_web", webFile);

      if (editing) {
        await API.patch(
          `/buysellapi/admin/home-announcements/${editing.id}/`,
          body
        );
        toast.success("Announcement updated");
      } else {
        await API.post("/buysellapi/admin/home-announcements/", body);
        toast.success("Announcement created");
      }
      resetModal();
      load();
    } catch (err) {
      const msg =
        err?.response?.data?.image?.[0] ||
        err?.response?.data?.image_web?.[0] ||
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.message ||
        "Could not save announcement";
      toast.error(typeof msg === "string" ? msg : "Could not save announcement");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item) => {
    try {
      const body = new FormData();
      body.append("is_active", item.is_active ? "false" : "true");
      await API.patch(`/buysellapi/admin/home-announcements/${item.id}/`, body);
      load();
    } catch {
      toast.error("Could not update status");
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm("Delete this announcement flyer?")) return;
    try {
      await API.delete(`/buysellapi/admin/home-announcements/${item.id}/`);
      toast.success("Deleted");
      load();
    } catch {
      toast.error("Could not delete");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <FaBullhorn className="text-rose-500" />
            Home announcements
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
            Upload separate flyer designs for the mobile app and the website.
            App: 1200×675 (16:9). Website: 1600×480 (wide banner).
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-500"
        >
          <FaPlus />
          Add flyer
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <FaSpinner className="animate-spin text-2xl" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-800/40 px-6 py-14 text-center">
          <FaUpload className="mx-auto text-3xl text-gray-400 mb-3" />
          <p className="font-semibold text-gray-700 dark:text-gray-200">
            No announcements yet
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Upload app + website flyer designs to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const appSrc = resolveMediaUrl(item.image_url || item.image);
            const webSrc = resolveMediaUrl(item.image_web_url || item.image_web);
            return (
              <div
                key={item.id}
                className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm"
              >
                <div className="grid grid-cols-2 gap-px bg-gray-200 dark:bg-gray-700">
                  <div className="aspect-[16/9] bg-gray-100 dark:bg-gray-900">
                    {appSrc ? (
                      <img
                        src={appSrc}
                        alt="App flyer"
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                    <p className="bg-black/55 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                      App
                    </p>
                  </div>
                  <div className="aspect-[10/3] bg-gray-100 dark:bg-gray-900">
                    {webSrc ? (
                      <img
                        src={webSrc}
                        alt="Website flyer"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-2 text-center text-[11px] text-gray-400">
                        No website image
                      </div>
                    )}
                    <p className="bg-black/55 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                      Website
                    </p>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">
                        {item.title || `Flyer #${item.id}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        Order {item.sort_order ?? 0}
                        {item.link_url ? " · has link" : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleActive(item)}
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                        item.is_active
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {item.is_active ? "Active" : "Hidden"}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <FaEdit />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 dark:border-rose-800 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 shadow-xl">
            <div className="border-b border-gray-100 dark:border-gray-800 px-5 py-4 sticky top-0 bg-white dark:bg-gray-900">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editing ? "Edit announcement" : "New announcement flyer"}
              </h3>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Title (admin only)
                </span>
                <input
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm"
                  value={form.title}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="e.g. March promo flyer"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  App flyer {editing ? "(optional replace)" : "*"} — 1200×675
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={pickImage(setAppFile, setAppPreview)}
                  className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-rose-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-rose-700"
                />
                {appPreview ? (
                  <img
                    src={appPreview}
                    alt="App preview"
                    className="mt-2 aspect-[16/9] w-full rounded-xl object-cover border border-gray-200 dark:border-gray-700"
                  />
                ) : null}
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Website flyer (optional) — 1600×480
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={pickImage(setWebFile, setWebPreview)}
                  className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-sky-700"
                />
                {webPreview ? (
                  <img
                    src={webPreview}
                    alt="Website preview"
                    className="mt-2 aspect-[10/3] w-full rounded-xl object-cover border border-gray-200 dark:border-gray-700"
                  />
                ) : null}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Wide banner that fills the site content width. If omitted, the
                  site falls back to the app image.
                </p>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Optional link URL
                </span>
                <input
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm"
                  value={form.link_url}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, link_url: e.target.value }))
                  }
                  placeholder="https://…"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    Sort order
                  </span>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm"
                    value={form.sort_order}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        sort_order: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="flex items-end gap-2 pb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        is_active: e.target.checked,
                      }))
                    }
                  />
                  Active on app &amp; site
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetModal}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-60"
                >
                  {saving ? <FaSpinner className="animate-spin" /> : null}
                  {editing ? "Save changes" : "Upload flyer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
