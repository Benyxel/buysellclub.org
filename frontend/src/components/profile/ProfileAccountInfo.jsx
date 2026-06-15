import React from "react";
import { FaEdit, FaSave, FaTimes } from "react-icons/fa";

export default function ProfileAccountInfo({
  userInfo,
  setUserInfo,
  isEditing,
  setIsEditing,
  onSave,
  onCancel,
}) {
  return (
    <div className="border-b border-gray-200 pb-6 dark:border-gray-700">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 sm:mb-6">
        <h3 className="text-base font-medium text-gray-900 dark:text-white sm:text-lg">
          Profile information
        </h3>
        {!isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm text-white transition-colors hover:bg-primary/90 sm:gap-2 sm:px-4 sm:py-2 sm:text-base"
          >
            <FaEdit className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            Edit profile
          </button>
        ) : (
          <div className="flex gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onSave}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm text-white transition-colors hover:bg-primary/90 sm:gap-2 sm:px-4 sm:py-2 sm:text-base"
            >
              <FaSave className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              Save
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-1.5 rounded-lg bg-gray-200 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-300 sm:gap-2 sm:px-4 sm:py-2 sm:text-base"
            >
              <FaTimes className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Full name
          </label>
          {isEditing ? (
            <input
              type="text"
              value={userInfo.name}
              onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          ) : (
            <p className="text-gray-900 dark:text-white">{userInfo.name}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email
          </label>
          {isEditing ? (
            <input
              type="email"
              value={userInfo.email}
              onChange={(e) => setUserInfo({ ...userInfo, email: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          ) : (
            <p className="text-gray-900 dark:text-white">{userInfo.email}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Phone
          </label>
          {isEditing ? (
            <input
              type="tel"
              value={userInfo.phone}
              onChange={(e) => setUserInfo({ ...userInfo, phone: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          ) : (
            <p className="text-gray-900 dark:text-white">{userInfo.phone}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Address
          </label>
          {isEditing ? (
            <textarea
              value={userInfo.address}
              onChange={(e) => setUserInfo({ ...userInfo, address: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              rows="3"
            />
          ) : (
            <p className="text-gray-900 dark:text-white">{userInfo.address}</p>
          )}
        </div>
      </div>
    </div>
  );
}
