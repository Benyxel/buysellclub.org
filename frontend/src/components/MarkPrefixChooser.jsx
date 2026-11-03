import React from "react";
import { markPrefixOf, MARK_PREFIXES, switchMarkPrefix } from "../utils/markIdFormat";

/**
 * FIM / BSC toggle for admin Mark ID fields.
 * Keeps typed digits when switching prefix.
 */
export default function MarkPrefixChooser({
  value,
  onChange,
  disabled = false,
  className = "mb-2 flex gap-2",
}) {
  return (
    <div className={className}>
      {MARK_PREFIXES.map((prefix) => {
        const active = markPrefixOf(value) === prefix;
        return (
          <button
            key={prefix}
            type="button"
            disabled={disabled}
            onClick={() => onChange(switchMarkPrefix(value, prefix))}
            className={`px-3 py-1.5 text-sm font-bold rounded-lg border ${
              active
                ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-900/40 dark:text-indigo-200"
                : "border-gray-300 bg-white text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
            }`}
          >
            {prefix}
          </button>
        );
      })}
    </div>
  );
}
