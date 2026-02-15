const STORAGE_KEY = "quickTrackingNotes";

export const normalizeQuickTrackingQuery = (value) =>
  (value || "").toString().toLowerCase().trim();

export const loadQuickTrackingNotes = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to load quick tracking notes:", error);
    return [];
  }
};

export const saveQuickTrackingNotes = (notes) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch (error) {
    console.error("Failed to save quick tracking notes:", error);
  }
};
