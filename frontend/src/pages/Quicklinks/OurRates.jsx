import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaPlaneDeparture,
  FaPlane,
  FaShip,
  FaClock,
  FaInfoCircle,
  FaArrowRight,
  FaBolt,
  FaShieldAlt,
  FaGlobe,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { Api } from "../../api";
import airImg from "../../assets/air.jpg";
import seaImg from "../../assets/sea.jpg";

const OurRates = () => {
  const [airServices, setAirServices] = useState([]);
  const [airLoading, setAirLoading] = useState(true);
  const [airError, setAirError] = useState("");

  const [seaRate, setSeaRate] = useState(null);
  const [seaLoading, setSeaLoading] = useState(true);
  const [seaError, setSeaError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchRates = async () => {
      setAirLoading(true);
      setSeaLoading(true);
      setAirError("");
      setSeaError("");

      const [airResult, seaResult] = await Promise.allSettled([
        Api.airAdServices.publicList(),
        Api.shipping.adRate(),
      ]);

      if (!isMounted) return;

      if (airResult.status === "fulfilled") {
        setAirServices(airResult.value?.data || []);
      } else {
        setAirError("Unable to load air ad services right now.");
      }
      setAirLoading(false);

      if (seaResult.status === "fulfilled") {
        setSeaRate(seaResult.value?.data || null);
      } else {
        setSeaError("Unable to load sea shipping rates right now.");
      }
      setSeaLoading(false);
    };

    fetchRates();
    return () => {
      isMounted = false;
    };
  }, []);


  const formatMoney = (value, currency) => {
    if (value === null || value === undefined || value === "") return "--";
    const numberValue = Number(value);
    if (Number.isNaN(numberValue)) return `${currency} ${value}`;
    return `${currency} ${numberValue.toFixed(2)}`;
  };

  const getAirUnitLabel = (serviceName = "") => {
    const name = serviceName.toLowerCase();
    if (name.includes("phone") || name.includes("mobile")) {
      return "per phone";
    }
    return "per kg";
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-white">
      {/* Hero: split Air | Sea image cards */}
      <section className="relative overflow-hidden">
        <div className="flex flex-col lg:flex-row min-h-[85vh] lg:min-h-[92vh]">
          {/* Air card */}
          <a
            href="#air-rates"
            className="group relative flex-1 min-h-[50vh] lg:min-h-full overflow-hidden border-b lg:border-b-0 lg:border-r border-white/10"
          >
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
              style={{ backgroundImage: `url(${airImg})` }}
            />
            <div className="absolute inset-0 bg-black/20" aria-hidden />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
            <div className="absolute inset-0 flex flex-col justify-end p-10 md:p-14 lg:p-16">
              <span className="text-sm font-semibold uppercase tracking-[0.2em] text-pink-300/90 mb-3">
                Our Rates
              </span>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white drop-shadow-lg">
                Air Shipping
              </h2>
              <p className="mt-3 text-white/80 text-base md:text-lg max-w-md">
                Fast delivery, flexible service options. Per kg and per phone rates.
              </p>
              <span className="mt-5 inline-flex items-center gap-2 text-pink-300 font-semibold text-base md:text-lg">
                View rates <FaArrowRight className="text-sm transition-transform group-hover:translate-x-1" />
              </span>
            </div>
            <div className="absolute top-8 right-8 rounded-full bg-white/10 backdrop-blur-md px-6 py-3 flex items-center gap-3 border border-white/20">
              <FaPlaneDeparture className="text-pink-400 text-xl" />
              <span className="text-base font-medium text-white">Air</span>
            </div>
          </a>
          {/* Sea card */}
          <a
            href="#sea-rates"
            className="group relative flex-1 min-h-[50vh] lg:min-h-full overflow-hidden"
          >
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
              style={{ backgroundImage: `url(${seaImg})` }}
            />
            <div className="absolute inset-0 bg-black/20" aria-hidden />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
            <div className="absolute inset-0 flex flex-col justify-end p-10 md:p-14 lg:p-16">
              <span className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300/90 mb-3">
                Our Rates
              </span>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white drop-shadow-lg">
                Sea Shipping
              </h2>
              <p className="mt-3 text-white/80 text-base md:text-lg max-w-md">
                Best value, CBM-based pricing. Normal & special goods.
              </p>
              <span className="mt-5 inline-flex items-center gap-2 text-sky-300 font-semibold text-base md:text-lg">
                View rates <FaArrowRight className="text-sm transition-transform group-hover:translate-x-1" />
              </span>
            </div>
            <div className="absolute top-8 right-8 rounded-full bg-white/10 backdrop-blur-md px-6 py-3 flex items-center gap-3 border border-white/20">
              <FaShip className="text-sky-400 text-xl" />
              <span className="text-base font-medium text-white">Sea</span>
            </div>
          </a>
        </div>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white/60 text-xs">
          <FaInfoCircle /> Rates can change based on market conditions.
        </div>
      </section>

      {/* Feature strip: glass cards */}
      <section className="relative z-10 -mt-16 px-4">
        <div className="container mx-auto grid gap-4 sm:grid-cols-3 max-w-5xl">
          <div className="rounded-2xl bg-white/80 dark:bg-gray-900/60 backdrop-blur-xl border border-gray-200 dark:border-gray-700/50 p-6 text-center shadow-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-pink-500/10 dark:bg-white/10 dark:border-white/20">
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-pink-500/20 flex items-center justify-center border border-pink-400/30">
              <FaBolt className="text-pink-500 dark:text-pink-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Quick updates</h3>
            <p className="text-sm text-gray-600 dark:text-white/70 mt-2">Clear timelines and consistent status updates.</p>
          </div>
          <div className="rounded-2xl bg-white/80 dark:bg-gray-900/60 backdrop-blur-xl border border-gray-200 dark:border-gray-700/50 p-6 text-center shadow-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-sky-500/10 dark:bg-white/10 dark:border-white/20">
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-sky-500/20 flex items-center justify-center border border-sky-400/30">
              <FaShieldAlt className="text-sky-500 dark:text-sky-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Secure handling</h3>
            <p className="text-sm text-gray-600 dark:text-white/70 mt-2">Reliable care for your goods from start to finish.</p>
          </div>
          <div className="rounded-2xl bg-white/80 dark:bg-gray-900/60 backdrop-blur-xl border border-gray-200 dark:border-gray-700/50 p-6 text-center shadow-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-amber-500/10 dark:bg-white/10 dark:border-white/20">
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-400/30">
              <FaGlobe className="text-amber-500 dark:text-amber-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Global reach</h3>
            <p className="text-sm text-gray-600 dark:text-white/70 mt-2">Shipping solutions built for international trade.</p>
          </div>
        </div>
      </section>

      {/* Air section: full-bleed air.jpg + glass card */}
      <section id="air-rates" className="relative min-h-[80vh] flex items-center py-20 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-fixed"
          style={{ backgroundImage: `url(${airImg})` }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-black/20" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-black/85" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-300/90 dark:text-pink-300/90">Rates</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mt-2 drop-shadow-lg">
              Air Services
            </h2>
            <p className="text-white/90 dark:text-white/70 mt-3 max-w-xl mx-auto drop-shadow-sm">
              Choose your service type and view delivery time and pricing.
            </p>
          </div>

          {airLoading ? (
            <div className="rounded-2xl bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-gray-200 dark:border-white/20 p-8 text-center text-gray-600 dark:text-white/80 max-w-2xl mx-auto">
              Loading air ad services...
            </div>
          ) : airError ? (
            <div className="rounded-2xl bg-red-50 dark:bg-red-500/20 backdrop-blur-xl border border-red-200 dark:border-red-400/30 p-6 text-red-700 dark:text-red-200 max-w-2xl mx-auto">
              {airError}
            </div>
          ) : airServices.length === 0 ? (
            <div className="rounded-2xl bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-gray-200 dark:border-white/20 p-8 text-center text-gray-600 dark:text-white/80 max-w-2xl mx-auto">
              No air ad services are available right now.
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <div className="rounded-3xl bg-white/80 dark:bg-white/10 backdrop-blur-2xl border border-gray-200 dark:border-white/20 shadow-2xl overflow-hidden chrome-border-animation dark:bg-gray-900/40">
                <div className="p-6 md:p-8 border-b border-gray-200 dark:border-white/10">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                        Air Services
                      </h3>
                      <p className="text-base text-gray-500 dark:text-white/60 mt-1">Pricing with delivery timelines</p>
                    </div>
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-pink-700 dark:text-pink-300 bg-pink-100 dark:bg-pink-500/20 border border-pink-200 dark:border-pink-400/30 px-5 py-2.5 rounded-full">
                      <FaPlane className="text-pink-500 dark:text-pink-400 text-lg" /> Air
                    </span>
                  </div>
                </div>
                <div className="p-6 md:p-8">
                  <div className="hidden md:grid grid-cols-[2fr_1.2fr_1fr_1fr] gap-4 text-sm uppercase tracking-wide text-gray-500 dark:text-white/50 pb-4 border-b border-gray-200 dark:border-white/10">
                    <span>Service</span>
                    <span>Delivery</span>
                    <span>Currency</span>
                    <span className="text-right">Price / unit</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {airServices.map((service) => {
                      const unitLabel = getAirUnitLabel(service.name);
                      return (
                        <div
                          key={service.id || `${service.name}-${service.days_text}`}
                          className="rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 p-5 md:px-6 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                        >
                          <div className="grid gap-3 md:grid-cols-[2fr_1.2fr_1fr_1fr] md:items-center">
                            <div>
                              <h4 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">{service.name}</h4>
                              <p className="text-sm text-gray-500 dark:text-white/50 mt-1 md:hidden">{service.days_text}</p>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600 dark:text-white/70 text-sm md:text-base">
                              <FaClock className="text-pink-500 dark:text-pink-400 shrink-0 text-base" />
                              <span>{service.days_text}</span>
                            </div>
                            <div>
                              <span className="text-sm font-semibold text-pink-700 dark:text-pink-300 bg-pink-100 dark:bg-pink-500/20 border border-pink-200 dark:border-pink-400/30 px-3 py-1.5 rounded-full">
                                {service.currency}
                              </span>
                            </div>
                            <div className="flex items-baseline gap-2 md:justify-end">
                              <p className="text-xl font-bold text-gray-900 dark:text-white">
                                {formatMoney(service.price, service.currency)}
                              </p>
                              <span className="text-sm text-gray-500 dark:text-white/50">{unitLabel}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="px-6 md:px-8 pb-6 flex flex-wrap justify-center gap-3">
                  <span className="inline-flex items-center gap-2 bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/20 text-gray-800 dark:text-white/90 px-5 py-2.5 rounded-full text-base">
                    <FaBolt className="text-pink-500 dark:text-pink-400" /> Fast delivery
                  </span>
                  <span className="inline-flex items-center gap-2 bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/20 text-gray-800 dark:text-white/90 px-5 py-2.5 rounded-full text-base">
                    <FaShieldAlt className="text-sky-500 dark:text-sky-400" /> Secure handling
                  </span>
                  <span className="inline-flex items-center gap-2 bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/20 text-gray-800 dark:text-white/90 px-5 py-2.5 rounded-full text-base">
                    <FaClock className="text-pink-500 dark:text-pink-400" /> Clear timelines
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Sea section: full-bleed sea.jpg + glass card */}
      <section id="sea-rates" className="relative min-h-[80vh] flex items-center py-20 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-fixed"
          style={{ backgroundImage: `url(${seaImg})` }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-black/20" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-black/85" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300/90">Rates</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mt-2 drop-shadow-lg">
              Sea Shipping Rates
            </h2>
            <p className="text-white/90 dark:text-white/70 mt-3 max-w-xl mx-auto drop-shadow-sm">
              Sea shipping rates are calculated per CBM and change based on cargo type.
            </p>
          </div>

          {seaLoading ? (
            <div className="rounded-2xl bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-gray-200 dark:border-white/20 p-8 text-center text-gray-600 dark:text-white/80 max-w-2xl mx-auto">
              Loading sea shipping rates...
            </div>
          ) : seaError ? (
            <div className="rounded-2xl bg-red-50 dark:bg-red-500/20 backdrop-blur-xl border border-red-200 dark:border-red-400/30 p-6 text-red-700 dark:text-red-200 max-w-2xl mx-auto">
              {seaError}
            </div>
          ) : !seaRate ? (
            <div className="rounded-2xl bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-gray-200 dark:border-white/20 p-8 text-center text-gray-600 dark:text-white/80 max-w-2xl mx-auto">
              No active sea shipping rate is available right now.
            </div>
          ) : (
            <div className="max-w-2xl mx-auto">
              <div className="rounded-3xl bg-white/80 dark:bg-white/10 backdrop-blur-2xl border border-gray-200 dark:border-white/20 shadow-2xl overflow-hidden chrome-border-animation dark:bg-gray-900/40">
                <div className="p-6 md:p-8 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Sea Shipping</h3>
                    <p className="text-sm text-gray-500 dark:text-white/60 mt-1">Container rates per CBM</p>
                  </div>
                  <span className="inline-flex items-center gap-2 text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-500/20 border border-sky-200 dark:border-sky-400/30 px-4 py-2 rounded-full">
                    <FaShip className="text-sky-500 dark:text-sky-400" /> Sea
                  </span>
                </div>
                <div className="p-6 md:p-8 space-y-8">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Normal Goods</h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 p-5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-white/50">Per CBM</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                          {formatMoney(seaRate.normal_goods_rate, "$")}
                        </p>
                      </div>
                      <div className="rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 p-5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-white/50">Less than 1 CBM</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                          {formatMoney(seaRate.normal_goods_rate_lt1, "$")}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Special Goods</h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 p-5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-white/50">Per CBM</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                          {formatMoney(seaRate.special_goods_rate, "$")}
                        </p>
                      </div>
                      <div className="rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 p-5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-white/50">Less than 1 CBM</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                          {formatMoney(seaRate.special_goods_rate_lt1, "$")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CTA strip */}
      <section className="relative z-10 px-4 pb-16 -mt-8">
        <div className="container mx-auto max-w-4xl">
          <div className="rounded-3xl bg-white/80 dark:bg-gray-900/60 backdrop-blur-xl border border-gray-200 dark:border-white/20 p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-2xl dark:bg-white/10">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Need help choosing the right option?
              </h3>
              <p className="text-gray-600 dark:text-white/70 mt-1">
                Talk to our team for guidance on your shipment.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                to="/Fofoofo-address-generator"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white px-6 py-3 font-semibold transition shrink-0"
              >
                <FaMapMarkerAlt className="text-sm" />
                Generate Address
              </Link>
              <a
                href="/Contact"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-white px-6 py-3 font-semibold hover:opacity-90 transition shrink-0"
              >
                Contact support
                <FaArrowRight className="text-sm" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default OurRates;
