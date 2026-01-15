import { useState, useEffect } from 'react';

/**
 * Custom hook to persist pagination state across page refreshes and component remounts
 * @param {string} storageKey - Unique key for localStorage (e.g., 'tracking-management-page')
 * @param {number} defaultPage - Default page number (default: 1)
 * @returns {[number, function]} - [currentPage, setCurrentPage]
 */
export const usePersistedPagination = (storageKey, defaultPage = 1) => {
  const [currentPage, setCurrentPageState] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const page = parseInt(saved, 10);
        return isNaN(page) || page < 1 ? defaultPage : page;
      }
    } catch (error) {
      console.error(`Failed to load pagination state for ${storageKey}:`, error);
    }
    return defaultPage;
  });

  // Save to localStorage whenever page changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, currentPage.toString());
    } catch (error) {
      console.error(`Failed to save pagination state for ${storageKey}:`, error);
    }
  }, [currentPage, storageKey]);

  const setCurrentPage = (pageOrUpdater) => {
    setCurrentPageState((prev) => {
      const newPage = typeof pageOrUpdater === 'function' 
        ? pageOrUpdater(prev) 
        : pageOrUpdater;
      return newPage;
    });
  };

  return [currentPage, setCurrentPage];
};

export default usePersistedPagination;

