import React, { useEffect, useState } from "react";
import { FaCalculator } from "react-icons/fa";
import API from "../api";

const CBMCalculator = () => {
  const [result, setResult] = useState(null);
  const [rates, setRates] = useState(null);
  const [exchangeRate, setExchangeRate] = useState(16.1); // Default fallback rate
  const [type, setType] = useState("normal"); // normal | special
  const [wholeInput, setWholeInput] = useState(0);
  const [fractionInput, setFractionInput] = useState(0);
  const [wholeWarning, setWholeWarning] = useState("");
  const [fractionWarning, setFractionWarning] = useState("");

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const resp = await API.get("/buysellapi/shipping-rates/");
        if (resp?.data) setRates(resp.data);
      } catch (err) {
        // ignore - component will use fallback rates
        console.error("Failed to load shipping rates", err?.response || err);
      }
    };
    fetchRates();
  }, []);

  // Fetch current USD to GHS exchange rate from backend
  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const resp = await API.get("/buysellapi/currency-rate/");
        if (resp?.data && resp.data.usd_to_ghs) {
          setExchangeRate(Number(resp.data.usd_to_ghs));
        }
      } catch (err) {
        // Use default fallback rate if API fails
        console.error("Failed to load exchange rate, using default:", err?.response || err);
        // Keep the default 16.1 if API fails
      }
    };
    fetchExchangeRate();
  }, []);

  // dimensions removed; calculator now uses the explicit whole/fraction fields

  const handleCalculateFromFields = (e) => {
    e && e.preventDefault && e.preventDefault();
    const whole = Math.max(0, Math.floor(Number(wholeInput) || 0));
    let frac = Number(fractionInput) || 0;
    if (frac < 0) frac = 0;
    if (frac >= 1) frac = +(frac % 1).toFixed(4);

    const r = rates || {
      normal_goods_rate: 250,
      normal_goods_rate_lt1: 250,
      special_goods_rate: 300,
      special_goods_rate_lt1: 300,
    };

    const perCBM =
      type === "normal"
        ? parseFloat(r.normal_goods_rate)
        : parseFloat(r.special_goods_rate);
    const lt1 =
      type === "normal"
        ? parseFloat(r.normal_goods_rate_lt1)
        : parseFloat(r.special_goods_rate_lt1);

    const wholeCost = whole * perCBM;
    const fracCostUsingLt1 = frac * lt1; // fraction multiplied by lt1 rate
    const fracCostProRata = frac * perCBM;
    const totalUsingLt1ForFraction = wholeCost + fracCostUsingLt1;
    const totalProRata = wholeCost + fracCostProRata;

    // Default billing: whole CBM uses per-CBM rate; fractional part uses admin lt1 rate (fraction * lt1).
    // So total = whole * perCBM + fraction * lt1.
    const defaultTotal = totalUsingLt1ForFraction;

    setResult({
      source: "fields",
      cbm: (whole + frac).toFixed(4),
      whole,
      fraction: frac.toFixed(4),
      perCBM: perCBM.toFixed(2),
      lt1: lt1.toFixed(2),
      totalUsingLt1ForFraction: totalUsingLt1ForFraction.toFixed(2),
      totalProRata: totalProRata.toFixed(2),
      total: defaultTotal.toFixed(2),
    });
  };

  // Derived alternate total value for display (works for both dimensions and fields sources)
  const altTotal = result
    ? result.totalProRata ?? result.totalUsingLt1ForFraction ?? result.total
    : null;

  // GHS values (uses exchange rate from backend) and direction (increase/decrease)
  const ghs = result ? (Number(result.total) * exchangeRate).toFixed(2) : null;
  const altGhs = altTotal ? (Number(altTotal) * exchangeRate).toFixed(2) : null;
  const altIsHigher = ghs && altGhs ? Number(altGhs) > Number(ghs) : false;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
  

      <form onSubmit={handleCalculateFromFields} className="space-y-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Shipping Type:</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
          >
            <option value="normal">Normal Goods</option>
            <option value="special">Special Goods</option>
          </select>
          <div className="ml-auto text-sm text-gray-600 dark:text-gray-300">
            {rates ? (
              <>
                {/* Mobile: show rates in ascending order (stacked). Desktop: show original order inline */}
                <div className="flex flex-col md:hidden">
                  {(() => {
                    const per =
                      type === "normal"
                        ? Number(rates.normal_goods_rate)
                        : Number(rates.special_goods_rate);
                    const lt1 =
                      type === "normal"
                        ? Number(rates.normal_goods_rate_lt1)
                        : Number(rates.special_goods_rate_lt1);
                    const items = [
                      { label: `Rate: $${per.toFixed(2)} /CBM`, value: per },
                      { label: `Below-1: $${lt1.toFixed(2)}`, value: lt1 },
                    ];
                    items.sort((a, b) => a.value - b.value);
                    return items.map((it, idx) => (
                      <span key={idx} className={idx > 0 ? "mt-1" : ""}>
                        {it.label}
                      </span>
                    ));
                  })()}
                </div>
                <div className="hidden md:flex items-center">
                  Rate: $
                  {type === "normal"
                    ? Number(rates.normal_goods_rate).toFixed(2)
                    : Number(rates.special_goods_rate).toFixed(2)}{" "}
                  /CBM
                  <span className="mx-2">·</span>
                  Below-1: $
                  {type === "normal"
                    ? Number(rates.normal_goods_rate_lt1).toFixed(2)
                    : Number(rates.special_goods_rate_lt1).toFixed(2)}
                </div>
              </>
            ) : (
              <span>Loading rates...</span>
            )}
          </div>
        </div>

        {/* Quick fields: whole CBM and fractional CBM (<1) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Whole CBM (integer)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={wholeInput}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") {
                  setWholeInput("");
                  setWholeWarning("");
                  return;
                }
                const num = Number(raw);
                if (!Number.isFinite(num)) return;
                // If user typed a float, prompt them to use the fraction field and only keep the integer part
                if (num % 1 !== 0) {
                  setWholeWarning(
                    "Please use the 'Below 1 CBM' field for decimals. The integer part has been kept."
                  );
                } else {
                  setWholeWarning("");
                }
                setWholeInput(Math.max(0, Math.floor(num)));
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
            {wholeWarning && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                {wholeWarning}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Below 1 CBM (fraction)
            </label>
            <input
              type="number"
              min="0"
              max="0.9999"
              step="0.0001"
              value={fractionInput}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") {
                  setFractionInput("");
                  setFractionWarning("");
                  return;
                }
                const num = Number(raw);
                if (!Number.isFinite(num)) return;
                // Prevent accepting whole numbers >= 1 in the fraction field
                if (num >= 1) {
                  // Keep only the fractional part (e.g. 1.25 -> 0.25). Do not auto-increment whole field.
                  const fracOnly = +(num % 1).toFixed(4);
                  setFractionInput(fracOnly === 0 ? 0 : fracOnly);
                  setFractionWarning(
                    "Please use the 'Whole CBM' field for whole numbers. The fractional part has been kept."
                  );
                } else {
                  setFractionWarning("");
                  setFractionInput(num);
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
            {fractionWarning && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                {fractionWarning}
              </p>
            )}
          </div>
          <div className="flex items-end">
            <button
              onClick={handleCalculateFromFields}
              className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Calculate from fields
            </button>
          </div>
        </div>
      </form>

      {result && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-3">
            Calculation Results
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">CBM:</span>
              <span className="font-semibold text-gray-800 dark:text-white">
                {result.cbm} m³
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">
                Whole CBM (integer):
              </span>
              <span className="font-semibold text-gray-800 dark:text-white">
                {result.whole} m³
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">
                CBM &lt; 1 (remainder):
              </span>
              <span className="font-semibold text-gray-800 dark:text-white">
                {result.fraction} m³
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">
                Shipping Fee (USD):
              </span>
              <span className="font-semibold text-gray-800 dark:text-white">
                ${result.total}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">
                Shipping Fee (GHS &approx;):
              </span>
              <span className="font-semibold text-gray-800 dark:text-white">
                ₵{(Number(result.total) * exchangeRate).toFixed(2)}
              </span>
            </div>
            <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <div>
                  The admin provides two rates:
                  <span className="font-semibold">
                    {" "}
                    ${result.perCBM} /CBM
                  </span>{" "}
                  for whole CBM and
                  <span className="font-semibold"> ${result.lt1} </span> for
                  below-1 CBM.
                </div>
                <div className="mt-2">
                  Calculation formula:{" "}
                  <span className="font-semibold">
                    (whole CBM × {result.perCBM}) + (fractional CBM ×{" "}
                    {result.lt1})
                  </span>
                </div>
                <div className="mt-2">
                  Cost in Cedis:{" "}
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    ₵{ghs}
                  </span>
                  {" "}(Rate: 1 USD = {exchangeRate.toFixed(2)} GHS). Cost in cedis may increase or reduce based on dollar rate
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CBMCalculator;
