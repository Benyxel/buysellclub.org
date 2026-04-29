import React, { useMemo } from "react";
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
} from "libphonenumber-js";

function toDigitsOnly(s) {
  return String(s || "").replace(/[^\d]/g, "");
}

function buildE164({ country, nationalNumber }) {
  const digits = toDigitsOnly(nationalNumber);
  if (!digits) return "";
  const parsed = parsePhoneNumberFromString(digits, country);
  if (!parsed) return "";
  return parsed.number || "";
}

/**
 * Country + phone input with per-country validation.
 *
 * Controlled via `value`:
 *   { country: 'GH', nationalNumber: '0551234567', e164: '+233551234567', isValid: true }
 */
export default function CountryPhoneInput({
  value,
  onChange,
  disabled = false,
  label,
  required = false,
  className = "",
}) {
  const countries = useMemo(() => {
    const names = typeof Intl !== "undefined" && Intl.DisplayNames
      ? new Intl.DisplayNames(["en"], { type: "region" })
      : null;
    const list = getCountries().map((c) => {
      const name = names ? names.of(c) : c;
      const code = getCountryCallingCode(c);
      return { id: c, name: name || c, callingCode: `+${code}` };
    });
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, []);

  const country = value?.country || "GH";
  const nationalNumber = value?.nationalNumber || "";

  const handleCountryChange = (nextCountry) => {
    const nextE164 = buildE164({ country: nextCountry, nationalNumber });
    const parsed = nextE164 ? parsePhoneNumberFromString(nextE164) : null;
    const nextValid = !!(parsed && parsed.isValid());
    onChange?.({
      country: nextCountry,
      nationalNumber,
      e164: nextE164,
      isValid: nextValid,
    });
  };

  const handleNationalChange = (nextNational) => {
    const cleaned = toDigitsOnly(nextNational);
    const nextE164 = buildE164({ country, nationalNumber: cleaned });
    const parsed = nextE164 ? parsePhoneNumberFromString(nextE164) : null;
    const nextValid = !!(parsed && parsed.isValid());
    onChange?.({
      country,
      nationalNumber: cleaned,
      e164: nextE164,
      isValid: nextValid,
    });
  };

  const validationText =
    nationalNumber && value?.e164 && value?.isValid === false
      ? "Invalid phone number for selected country."
      : "";

  return (
    <div className={className}>
      {label ? (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label} {required ? <span className="text-red-500">*</span> : null}
        </label>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,220px)_1fr] gap-2">
        <select
          value={country}
          onChange={(e) => handleCountryChange(e.target.value)}
          disabled={disabled}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary"
        >
          {countries.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.callingCode})
            </option>
          ))}
        </select>

        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={nationalNumber}
          onChange={(e) => handleNationalChange(e.target.value)}
          disabled={disabled}
          placeholder="Phone number"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary"
        />
      </div>

      {validationText ? (
        <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
          {validationText}
        </p>
      ) : null}
    </div>
  );
}

