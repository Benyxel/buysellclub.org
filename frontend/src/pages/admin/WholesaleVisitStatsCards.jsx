import React, { useEffect, useState } from "react";
import { FaEye, FaUsers } from "react-icons/fa";
import { getWholesaleVisitStats } from "../../api";

/**
 * Admin banner: unique visitors & page views for /Wholesale (last N days).
 */
const WholesaleVisitStatsCards = ({ days = 30 }) => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await getWholesaleVisitStats({ days });
        if (!cancelled) setStats(response.data || null);
      } catch {
        if (!cancelled) setStats(null);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [days]);

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <div className="rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/20 p-3">
        <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
          <FaUsers className="text-teal-600" /> Unique visitors
        </p>
        <p className="text-xl font-bold text-teal-800 dark:text-teal-200 mt-1">
          {Number(stats.unique_visitors || 0).toLocaleString()}
        </p>
        <p className="text-[11px] text-gray-500">Last {stats.days || days} days</p>
      </div>
      <div className="rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/20 p-3">
        <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
          <FaEye className="text-teal-600" /> Page views
        </p>
        <p className="text-xl font-bold text-teal-800 dark:text-teal-200 mt-1">
          {Number(stats.page_views || 0).toLocaleString()}
        </p>
        <p className="text-[11px] text-gray-500">Catalog + products</p>
      </div>
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
        <p className="text-xs text-gray-500">Catalog page visitors</p>
        <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
          {Number(stats.catalog_unique_visitors || 0).toLocaleString()}
        </p>
        <p className="text-[11px] text-gray-500">
          {Number(stats.catalog_page_views || 0).toLocaleString()} views
        </p>
      </div>
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
        <p className="text-xs text-gray-500">Product page visitors</p>
        <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
          {Number(stats.product_unique_visitors || 0).toLocaleString()}
        </p>
        <p className="text-[11px] text-gray-500">
          {Number(stats.product_page_views || 0).toLocaleString()} views
        </p>
      </div>
    </div>
  );
};

export default WholesaleVisitStatsCards;
