import React, { useContext, useState, useEffect } from "react";
import {
  FaShoppingCart,
  FaUser,
  FaUsers,
  FaHome,
  FaStore,
  FaImages,
  FaHandsHelping,
  FaHandshake,
  FaInfoCircle,
  FaPhoneAlt,
  FaRoute,
  FaTruck,
  FaMapMarkerAlt,
  FaShippingFast,
  FaWallet,
  FaHeart,
  FaBoxOpen,
  FaBell,
  FaCrown,
  FaCompass,
  FaLink,
  FaTelegramPlane,
  FaTrophy,
  FaVideo,
  FaDownload,
  FaFilePdf,
  FaFileInvoiceDollar,
  FaLock,
  FaGraduationCap,
} from "react-icons/fa";
import { IoMdArrowDropdown, IoMdMenu } from "react-icons/io";
import DarkMode from "./DarkMode";
import { Link, NavLink } from "react-router-dom";
import { IoClose } from "react-icons/io5";
import { ShopContext } from "../context/ShopContext";
import API, { Api } from "../api";
import buysellogo from "../assets/buysellogo.png";
import buysellogod from "../assets/buysellogod.png";
import NavbarFifaBall from "./NavbarFifaBall";

const MenuLinks = [
  { name: "Home", href: "/" },
  { name: "Shop", href: "/Shop" },
  { name: "Digital Store", href: "/DigitalStore" },
  { name: "Gallery", href: "/Gallery" },
  { name: "Services", href: "/Services" },
  { name: "About", href: "/About" },
  { name: "Contact", href: "/Contact" },
];

const Quicklinks = [
  { name: "Buy4Me", href: "/Buy4me" },
  { name: "Shipping Addresses", href: "/Shipping" },
  { name: "Tracking", href: "/tracking" },
  { name: "Quick Tracking", href: "/QuickTracking" },
  { name: "Delivery", href: "/Delivery" },
  { name: "Training", href: "/Training" },
  { name: "Digital Store", href: "/DigitalStore" },
  { name: "Our Rates", href: "/OurRates" },
  { name: "Alipay Payment", href: "/AlipayPayment" },
];

// Static links that don't change based on auth status
const StaticUserLinks = [
  { name: "My Profile", href: "/Profile" },
  { name: "Orders", href: "/Orders" },
  { name: "Favorites", href: "/Favorites" },
];

/** Mobile drawer submenu rows (same hover as Q-Links / Account) */
const MOBILE_SUBMENU_ROW =
  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-pink-50 dark:text-gray-100 dark:hover:bg-pink-950";
const MOBILE_SUBMENU_ICON =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-200 text-gray-800 shadow-sm dark:bg-gray-700 dark:text-gray-100";

/** Static rows in Membership tab — same hover surface as Q-Links / Account */
const MOBILE_MEMBERSHIP_BENEFIT_ROW =
  "flex cursor-default items-start gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-pink-50 dark:hover:bg-pink-950";

const MEMBERSHIP_BENEFITS = [
  {
    Icon: FaHandshake,
    title: "Supplier contacts",
    blurb: "Approved directory and sourcing support.",
  },
  {
    Icon: FaTelegramPlane,
    title: "Private Telegram group",
    blurb: "Member-only chat, alerts, and peer help.",
  },
  {
    Icon: FaTrophy,
    title: "Winning products",
    blurb: "Curated picks and ideas shared with members.",
  },
  {
    Icon: FaVideo,
    title: "Video tutorials",
    blurb: "Step-by-step guides for shipping and sourcing.",
  },
  {
    Icon: FaDownload,
    title: "Tools & downloads",
    blurb: "Files and utilities for members.",
  },
];

/** Mobile drawer bottom tab buttons — compact row for 4 columns on narrow screens */
const MOBILE_TAB_BTN_BASE =
  "group flex min-h-0 flex-col items-center justify-center gap-0 rounded-lg px-1 py-2 transition-all duration-200 ease-out motion-reduce:transition-colors active:scale-[0.97] active:duration-100";
const MOBILE_TAB_ICON =
  "text-base shrink-0 transition-transform duration-200 ease-out group-hover:-translate-y-px motion-reduce:group-hover:translate-y-0";
const MOBILE_TAB_ACTIVE =
  "bg-primary text-white shadow-sm ring-1 ring-primary ring-offset-1 ring-offset-white dark:ring-offset-gray-800";
const MOBILE_TAB_INACTIVE =
  "text-gray-600 hover:scale-[1.02] bg-gray-100 hover:bg-pink-100 hover:text-pink-900 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-pink-950 dark:hover:text-pink-100";

/**
 * Mobile shortcuts: soft pastel “wash” cards + strong icon jewel
 * (different from full solid blocks — readable text, hue via gradient + icon).
 */
const MOBILE_SHORTCUT_STYLES = {
  Tracking: {
    tile: "border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-blue-50 text-slate-900 shadow-sm hover:border-sky-300 hover:shadow-md dark:border-slate-600 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 dark:text-slate-100 dark:hover:border-sky-500",
    icon: "bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md ring-2 ring-sky-200 dark:ring-sky-900",
  },
  "Shipping Addresses": {
    tile: "border border-slate-200 bg-gradient-to-bl from-indigo-50 via-white to-violet-50 text-slate-900 shadow-sm hover:border-indigo-300 hover:shadow-md dark:border-slate-600 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950 dark:text-slate-100 dark:hover:border-indigo-400",
    icon: "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md ring-2 ring-indigo-200 dark:ring-indigo-950",
  },
  Buy4Me: {
    tile: "border border-slate-200 bg-gradient-to-tr from-violet-50 via-white to-fuchsia-50 text-slate-900 shadow-sm hover:border-violet-300 hover:shadow-md dark:border-slate-600 dark:from-slate-900 dark:via-slate-900 dark:to-violet-950 dark:text-slate-100 dark:hover:border-violet-400",
    icon: "bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-md ring-2 ring-violet-200 dark:ring-violet-950",
  },
  Delivery: {
    tile: "border border-slate-200 bg-gradient-to-br from-teal-50 via-white to-cyan-50 text-slate-900 shadow-sm hover:border-teal-300 hover:shadow-md dark:border-slate-600 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950 dark:text-slate-100 dark:hover:border-teal-400",
    icon: "bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md ring-2 ring-teal-200 dark:ring-teal-950",
  },
  "Digital Store": {
    tile: "border border-slate-200 bg-gradient-to-br from-rose-50 via-white to-orange-50 text-slate-900 shadow-sm hover:border-rose-300 hover:shadow-md dark:border-slate-600 dark:from-slate-900 dark:via-slate-900 dark:to-rose-950 dark:text-slate-100 dark:hover:border-rose-400",
    icon: "bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-md ring-2 ring-rose-200 dark:ring-rose-950",
  },
  "Alipay Payment": {
    tile: "border border-slate-200 bg-gradient-to-tl from-emerald-50 via-white to-lime-50 text-slate-900 shadow-sm hover:border-emerald-300 hover:shadow-md dark:border-slate-600 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950 dark:text-slate-100 dark:hover:border-emerald-400",
    icon: "bg-gradient-to-br from-emerald-500 to-lime-600 text-white shadow-md ring-2 ring-emerald-200 dark:ring-emerald-950",
  },
  "Quick Tracking": {
    tile: "border border-slate-200 bg-gradient-to-br from-amber-50 via-white to-yellow-50 text-slate-900 shadow-sm hover:border-amber-300 hover:shadow-md dark:border-slate-600 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950 dark:text-slate-100 dark:hover:border-amber-400",
    icon: "bg-gradient-to-br from-amber-500 to-yellow-500 text-white shadow-md ring-2 ring-amber-200 dark:ring-amber-900",
  },
  Training: {
    tile: "border border-slate-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50 text-slate-900 shadow-sm hover:border-blue-300 hover:shadow-md dark:border-slate-600 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950 dark:text-slate-100 dark:hover:border-blue-400",
    icon: "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md ring-2 ring-blue-200 dark:ring-indigo-950",
  },
  Community: {
    tile: "border border-slate-200 bg-gradient-to-bl from-purple-50 via-white to-pink-50 text-slate-900 shadow-sm hover:border-purple-300 hover:shadow-md dark:border-slate-600 dark:from-slate-900 dark:via-slate-900 dark:to-purple-950 dark:text-slate-100 dark:hover:border-purple-400",
    icon: "bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-md ring-2 ring-purple-200 dark:ring-purple-950",
  },
  Membership: {
    tile: "border border-slate-200 bg-gradient-to-bl from-purple-50 via-white to-pink-50 text-slate-900 shadow-sm hover:border-purple-300 hover:shadow-md dark:border-slate-600 dark:from-slate-900 dark:via-slate-900 dark:to-purple-950 dark:text-slate-100 dark:hover:border-purple-400",
    icon: "bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-md ring-2 ring-purple-200 dark:ring-purple-950",
  },
};

const DEFAULT_SHORTCUT_STYLE = {
  tile: "border border-slate-200 bg-gradient-to-br from-slate-50 to-white text-slate-900 shadow-sm hover:border-slate-300 dark:border-slate-600 dark:from-slate-900 dark:to-slate-800 dark:text-slate-100",
  icon: "bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-md ring-2 ring-slate-300 dark:ring-slate-900",
};

const mobileShortcutStyles = (label) =>
  MOBILE_SHORTCUT_STYLES[label] || DEFAULT_SHORTCUT_STYLE;

/** Solid icon chips for browse / quick / account rows in mobile drawer. */
const MOBILE_LIST_ICON = {
  Home: "bg-sky-600 text-white",
  Shop: "bg-orange-500 text-white",
  "Digital Store": "bg-rose-600 text-white",
  Gallery: "bg-fuchsia-600 text-white",
  Services: "bg-cyan-600 text-white",
  About: "bg-slate-600 text-white",
  Contact: "bg-lime-600 text-white",
  Membership: "bg-purple-600 text-white",
  Buy4Me: "bg-violet-600 text-white",
  "Shipping Addresses": "bg-indigo-600 text-white",
  Tracking: "bg-blue-600 text-white",
  "Quick Tracking": "bg-amber-500 text-white",
  Training: "bg-blue-600 text-white",
  Delivery: "bg-teal-600 text-white",
  "Our Rates": "bg-amber-700 text-white",
  "Alipay Payment": "bg-emerald-600 text-white",
  "My Profile": "bg-pink-600 text-white",
  Orders: "bg-blue-700 text-white",
  Favorites: "bg-red-500 text-white",
  Login: "bg-gray-700 text-white",
  Logout: "bg-gray-800 text-white",
  Membership: "bg-purple-600 text-white",
  Community: "bg-purple-600 text-white",
  "Apply for membership": "bg-fuchsia-600 text-white",
  "Member hub in profile": "bg-cyan-600 text-white",
};

const mobileListIconClass = (label) =>
  MOBILE_LIST_ICON[label] || "bg-gray-700 text-white";

export default function Navbar() {
  const [visible, setVisible] = useState(false);
  const [mobileQuery, setMobileQuery] = useState("");
  /** Mobile drawer: which link group is shown above the bottom icon bar */
  const [mobileNavTab, setMobileNavTab] = useState(
    /** @type {"browse" | "quick" | "account" | "membership"} */ ("browse")
  );
  const { getCartCount } = useContext(ShopContext);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [_userData, setUserData] = useState(null);
  const [username, setUsername] = useState("");
  const [shippingMark, setShippingMark] = useState("");
  const [updatesUnreadCount, setUpdatesUnreadCount] = useState(0);
  const [isCommunityMember, setIsCommunityMember] = useState(false);

  const fetchCommunityMember = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setIsCommunityMember(false);
      return;
    }
    try {
      const response = await Api.community.myRequest();
      const status = response.data?.request?.status;
      const sheetType = response.data?.sheet_access_type;
      const telegramLink = response.data?.telegram_link || "";
      const approved =
        status === "approved" || (sheetType === "member" && !!telegramLink);
      setIsCommunityMember(!!approved);
    } catch {
      setIsCommunityMember(false);
    }
  };

  const fetchUpdatesUnread = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUpdatesUnreadCount(0);
      return;
    }
    try {
      const res = await API.get("/buysellapi/notifications/me?limit=1");
      setUpdatesUnreadCount(res.data?.unread_count ?? 0);
    } catch {
      setUpdatesUnreadCount(0);
    }
  };

  // Check login status and fetch user data
  const checkLoginStatus = () => {
    const token = localStorage.getItem("token");
    const adminToken = localStorage.getItem("adminToken");
    const storedUserData = localStorage.getItem("userData");

    const hasToken = !!(token || adminToken);

    if (hasToken) {
      setIsLoggedIn(true);
      if (storedUserData) {
        try {
          setUserData(JSON.parse(storedUserData));
        } catch {
          setUserData(null);
        }
      }
      // Fetch user info from localStorage or API
      fetchUserInfo();
    } else {
      setIsLoggedIn(false);
      setUserData(null);
      setUsername("");
      setShippingMark("");
      setUpdatesUnreadCount(0);
      setIsCommunityMember(false);
    }
  };

  // Fetch user info (username and shipping mark)
  const fetchUserInfo = async () => {
    try {
      // Try to get from localStorage first
      const storedShippingMark = localStorage.getItem("userShippingMark");
      if (storedShippingMark) {
        const parsedMark = JSON.parse(storedShippingMark);
        if (parsedMark && parsedMark.length > 0) {
          setShippingMark(parsedMark[0].shipping_mark || "");
        }
      }

      // Get username from localStorage or fetch from API
      const storedUserData = localStorage.getItem("userData");
      if (storedUserData) {
        const userData = JSON.parse(storedUserData);
        setUsername(userData.username || "");
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
    }
  };

  useEffect(() => {
    // Check on mount
    checkLoginStatus();

    // Listen for storage changes (e.g., from other tabs)
    const handleStorageChange = () => {
      checkLoginStatus();
    };

    // Listen for custom auth change event (same-tab login/logout)
    const handleAuthChange = () => {
      checkLoginStatus();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("authChange", handleAuthChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("authChange", handleAuthChange);
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setUpdatesUnreadCount(0);
      return;
    }
    fetchUpdatesUnread();
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) {
      setIsCommunityMember(false);
      return;
    }
    fetchCommunityMember();
  }, [isLoggedIn]);

  useEffect(() => {
    if (!visible || !isLoggedIn) return;
    fetchUpdatesUnread();
    fetchCommunityMember();
  }, [visible, isLoggedIn]);

  useEffect(() => {
    if (!visible) setMobileNavTab("browse");
  }, [visible]);

  useEffect(() => {
    const onUnread = (e) => {
      const n = e.detail?.unread;
      if (typeof n === "number" && n >= 0) setUpdatesUnreadCount(n);
    };
    window.addEventListener("buysellNotificationsUnread", onUnread);
    return () =>
      window.removeEventListener("buysellNotificationsUnread", onUnread);
  }, []);

  // Build user links: if not logged, protected links send to /Login
  const UserLinks = isLoggedIn
    ? [...StaticUserLinks, { name: "Logout", href: "/logout" }]
    : [
        { name: "My Profile", href: "/Login" },
        { name: "Orders", href: "/Login" },
        { name: "Favorites", href: "/Login" },
        { name: "Login", href: "/Login" },
      ];

  const makeMobileMenuModel = () => {
    /** @type {{ id: string, label: string, to: string, section: "shortcuts"|"browse"|"quick"|"account", Icon: any }[]} */
    const items = [];

    const iconByLabel = {
      Home: FaHome,
      Shop: FaStore,
      "Digital Store": FaFilePdf,
      Gallery: FaImages,
      Services: FaHandsHelping,
      About: FaInfoCircle,
      Contact: FaPhoneAlt,
      "Membership": FaUsers,
      Buy4Me: FaShoppingCart,
      "Shipping Addresses": FaMapMarkerAlt,
      Tracking: FaRoute,
      "Quick Tracking": FaTruck,
      Training: FaGraduationCap,
      Delivery: FaShippingFast,
      "Our Rates": FaInfoCircle,
      "Alipay Payment": FaWallet,
      "My Profile": FaUser,
      Orders: FaBoxOpen,
      Favorites: FaHeart,
      Login: FaUser,
      Logout: FaUser,
      Community: FaUsers,
      "Shipping fees": FaFileInvoiceDollar,
    };

    const add = (section, label, to) => {
      const Icon = iconByLabel[label] || FaInfoCircle;
      items.push({
        id: `${section}:${label}:${to}`,
        label,
        to,
        section,
        Icon,
      });
    };

    // Shortcuts (top grid)
    add("shortcuts", "Tracking", "/tracking");
    add("shortcuts", "Shipping Addresses", "/Shipping");
    add("shortcuts", "Buy4Me", "/Buy4me");
    add("shortcuts", "Delivery", "/Delivery");
    add("shortcuts", "Digital Store", "/DigitalStore");
    add(
      "shortcuts",
      "Alipay Payment",
      isLoggedIn ? "/AlipayPayment" : "/Login"
    );
    add("shortcuts", "Quick Tracking", "/QuickTracking");
    add("shortcuts", "Training", "/Training");
    add(
      "shortcuts",
      "Shipping fees",
      isLoggedIn ? "/Profile?tab=shippingFees&shippingFeesSubTab=invoices" : "/Login"
    );
    add(
      "shortcuts",
      "Membership",
      isLoggedIn ? "/Profile?tab=community" : "/Community"
    );

    // Browse (main site)
    for (const x of MenuLinks) add("browse", x.name, x.href || "/");
    add("browse", "Membership", "/Community");

    // Quick links
    for (const x of Quicklinks) add("quick", x.name, x.href || "/");

    // Account
    for (const x of UserLinks) add("account", x.name, x.href || "/");

    return items;
  };

  const mobileItems = makeMobileMenuModel();
  const query = mobileQuery.trim().toLowerCase();
  const filteredItems = query
    ? mobileItems.filter((i) => i.label.toLowerCase().includes(query))
    : mobileItems;
  const bySection = (section) => filteredItems.filter((i) => i.section === section);

  return (
    <div className="bg-white shadow-md dark:bg-gray-900 dark:text-white duration-200 sticky top-0 z-30">
      <div className="py-4">
        <div className="container flex justify-between">
          <div className="flex items-center gap-12">
            <Link
              to="/"
              className="flex items-end gap-2"
            >
              {/* Light mode logo */}
              <img 
                src={buysellogod} 
                alt="BuySellClub Logo" 
                className="h-12 sm:h-14 md:h-16 object-contain dark:hidden"
              />
              {/* Dark mode logo */}
              <img 
                src={buysellogo} 
                alt="BuySellClub Logo" 
                className="h-12 sm:h-14 md:h-16 object-contain hidden dark:block"
              />
              <NavbarFifaBall className="lg:hidden" />
            </Link>

            <div className="hidden lg:block">
              <ul className="flex items-start gap-3 text-[18px]">
                {MenuLinks.map((data, index) => (
                  <li key={index}>
                    <NavLink
                      to={data.href || "/"}
                      className={({ isActive }) =>
                        isActive
                          ? "inline-block px-2 font-medium text-black dark:text-white duration-200"
                          : "inline-block px-2 font-medium text-gray-500 hover:text-black dark:hover:text-white duration-200"
                      }
                    >
                      {data.name}
                    </NavLink>
                  </li>
                ))}
                {/* Community: link visible to all (public); only logged-in users can view the page */}
                <li>
                  <NavLink
                    to="/Community"
                    className={({ isActive }) =>
                      isActive
                        ? "inline-block px-2 font-medium text-black dark:text-white duration-200"
                        : "inline-block px-2 font-medium text-gray-500 hover:text-black dark:hover:text-white duration-200"
                    }
                  >
                    Membership
                  </NavLink>
                </li>
                {/* Dropdown */}
                <li className="relative cursor-pointer group">
                  <a
                    href="#"
                    className="flex items-center gap-[2px] font-medium text-gray-500 dark:hover:text-white hover:text-black"
                  >
                    Quick links
                    <span>
                      <IoMdArrowDropdown className="group-hover:rotate-180 duration-300" />
                    </span>
                  </a>

                  {/* Dropdown list */}
                  <div className="absolute z-[9999] hidden group-hover:block w-[180px] rounded-md bg-white shadow-md dark:bg-gray-900 p-2 dark:text-white">
                    <ul className="space-y-1">
                      {Quicklinks.map((data, index) => (
                        <li key={index}>
                          <Link
                            to={data.href || "/"}
                            className="inline-flex w-full items-center gap-2 rounded-md p-1 text-gray-500 duration-200 hover:bg-brandGreen/20 hover:text-black dark:hover:text-white dark:text-gray-300"
                          >
                            {data.name === "Delivery" && (
                              <FaLock className="shrink-0 text-xs text-amber-600 dark:text-amber-400" aria-hidden />
                            )}
                            <span>{data.name}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* navbar right */}
          <div className="flex justify-between items-center gap-3 p-3">
            {/* CART */}
            <div className="btn relative p-2">
              <Link to="/Cart" className="relative group">
                <FaShoppingCart className="text-2xl text-gray-600 dark:text-gray-400 hover:text-brandGreen" />
                <div className="w-4 h-4 bg-red-500 text-white rounded-full absolute -top-1 right-4 transform translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-xs">
                  <span>{getCartCount()}</span>
                </div>
              </Link>
            </div>

            {/* dark mode sec */}
            <div>
              <DarkMode />
            </div>

            {/* userIcon */}
            <div className="hidden lg:block">
              <ul>
                <li className="relative cursor-pointer group">
                  <Link
                    to={isLoggedIn ? "/Profile" : "/Login"}
                    className="flex items-center gap-2 font-semibold text-gray-500 dark:hover:text-white hover:text-black"
                  >
                    <FaUser className="text-2xl" />
                    {isLoggedIn && (username || shippingMark) && (
                      <div className="flex flex-col items-start text-xs">
                        {username && (
                          <span className="text-gray-700 dark:text-gray-300 font-medium">
                            {username}
                          </span>
                        )}
                        {shippingMark && (
                          <span className="text-gray-500 dark:text-gray-400 text-[10px]">
                            {shippingMark}
                          </span>
                        )}
                      </div>
                    )}
                    <span>
                      <IoMdArrowDropdown className="group-hover:rotate-180 duration-300" />
                    </span>
                  </Link>

                  {/* Dropdown list */}
                  <div className="absolute z-[9999] hidden group-hover:block w-[180px] rounded-md bg-white shadow-md dark:bg-gray-900 p-2 dark:text-white">
                    <ul className="space-y-1">
                      {UserLinks.map((data, index) => (
                        <li key={index}>
                          {data.href ? (
                            <Link
                              to={data.href}
                              className="text-gray-500 hover:text-black dark:hover:text-white p-1 duration-200 inline-block w-full hover:bg-brandGreen/20 rounded-md font-semibold"
                            >
                              {data.name}
                            </Link>
                          ) : (
                            <button
                              onClick={data.action}
                              className="text-gray-500 hover:text-black dark:hover:text-white p-1 duration-200 inline-block w-full hover:bg-brandGreen/20 rounded-md font-semibold text-left"
                            >
                              {data.name}
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              </ul>
            </div>

            {/* Mobile Menu Icon */}
            <div className="lg:hidden mx-1.5 px-1.5 py-2 sm:mx-2 sm:px-2">
              <IoMdMenu
                onClick={() => setVisible(true)}
                className="cursor-pointer text-3xl text-gray-700/60 dark:text-gray-300/60"
                aria-label="Open menu"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {visible && (
        <div
          className="fixed inset-0 bg-black/20 z-[1300] lg:hidden"
          onClick={() => setVisible(false)}
        />
      )}
      <div
        className={`fixed top-0 right-0 bottom-0 bg-white shadow-2xl transition-transform transform ${
          visible ? "translate-x-0" : "translate-x-full"
        } w-[92vw] max-w-[420px] z-[1310] dark:bg-zinc-950 lg:hidden`}
        onClick={(e) => {
          // Close menu when clicking on empty space (not on menu items)
          if (e.target === e.currentTarget) {
            setVisible(false);
          }
        }}
      >
        <div
          className="flex h-full min-h-0 flex-col text-gray-600"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-pink-200 bg-gradient-to-r from-rose-400 via-pink-400 to-fuchsia-400 px-5 py-4 dark:border-pink-800/50 dark:from-rose-500 dark:via-pink-500 dark:to-fuchsia-500">
            <p className="text-lg font-bold text-white drop-shadow-sm">Menu</p>
            <IoClose
              onClick={() => {
                setVisible(false);
                setMobileQuery("");
              }}
              className="h-8 cursor-pointer text-[30px] text-white drop-shadow-sm duration-300 hover:text-white/90"
            />
          </div>

          <div className="mobile-nav-scrollable min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {/* User card */}
            {isLoggedIn ? (
              <div className="flex items-stretch overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <Link
                  to="/Profile"
                  onClick={() => {
                    setVisible(false);
                    setMobileQuery("");
                  }}
                  className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 transition hover:bg-pink-50 dark:hover:bg-pink-950"
                >
                  <div className="relative shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white shadow">
                      <FaUser className="text-lg" />
                    </div>
                    {isCommunityMember && (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-600 shadow-md ring-2 ring-white dark:ring-gray-950"
                        title="Community member"
                        aria-label="Community member"
                        role="img"
                      >
                        <FaCrown className="h-2.5 w-2.5 text-amber-950 drop-shadow-sm" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-900 dark:text-white">
                      {username || "My account"}
                    </p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {shippingMark || "View profile"}
                    </p>
                  </div>
                </Link>
                <Link
                  to="/Profile?tab=updates"
                  onClick={() => {
                    setVisible(false);
                    setMobileQuery("");
                  }}
                  className="relative flex min-w-[4.25rem] shrink-0 flex-col items-center justify-center gap-0.5 border-l border-gray-200 bg-gray-50 px-3 py-2 text-gray-700 transition hover:bg-pink-50 hover:text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-pink-950 dark:hover:text-primary"
                  aria-label={
                    updatesUnreadCount > 0
                      ? `Updates, ${updatesUnreadCount} unread`
                      : "Notifications and updates"
                  }
                >
                  {updatesUnreadCount > 0 && (
                    <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                      {updatesUnreadCount > 99 ? "99+" : updatesUnreadCount}
                    </span>
                  )}
                  <FaBell className="text-lg" />
                  <span className="text-[10px] font-bold uppercase tracking-wide">
                    Updates
                  </span>
                </Link>
              </div>
            ) : (
              <Link
                to="/Login"
                onClick={() => {
                  setVisible(false);
                  setMobileQuery("");
                }}
                className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 shadow-sm transition hover:bg-pink-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-pink-950"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white shadow">
                  <FaUser />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">
                    Log in
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    Access profile, orders, favorites
                  </p>
                </div>
              </Link>
            )}

            {/* Search */}
            <div>
              <input
                value={mobileQuery}
                onChange={(e) => setMobileQuery(e.target.value)}
                placeholder="Search menu…"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              />
            </div>

            {/* Shortcuts grid */}
            <div>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Shortcuts
              </p>
              <div className="grid grid-cols-2 gap-2">
                {bySection("shortcuts").map((it) => (
                  <Link
                    key={it.id}
                    to={it.to}
                    onClick={() => {
                      setVisible(false);
                      setMobileQuery("");
                    }}
                    className={`group flex items-center gap-2 rounded-2xl border px-3 py-3 transition hover:ring-2 hover:ring-pink-200/90 active:scale-[0.98] dark:hover:ring-pink-500/35 ${
                      mobileShortcutStyles(it.label).tile
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${mobileShortcutStyles(it.label).icon}`}
                    >
                      <it.Icon className="text-base" />
                    </span>
                    <span className="text-sm font-bold leading-tight text-inherit flex items-center gap-1.5 min-w-0">
                      {it.label === "Delivery" && (
                        <FaLock
                          className="h-3.5 w-3.5 shrink-0 text-amber-800 dark:text-amber-300"
                          aria-hidden
                        />
                      )}
                      <span className="min-w-0 truncate">{it.label}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Browse / Q-Links / Account / Membership — list matches bottom icon bar */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="bg-gradient-to-r from-fuchsia-400 via-pink-400 to-rose-400 px-4 py-2.5 dark:from-fuchsia-500 dark:via-pink-500 dark:to-rose-500">
                <p className="text-xs font-bold uppercase tracking-wide text-white drop-shadow-sm">
                  {mobileNavTab === "browse"
                    ? "Browse"
                    : mobileNavTab === "quick"
                      ? "Quick links"
                      : mobileNavTab === "membership"
                        ? "Membership"
                        : "Account"}
                </p>
              </div>
              <ul className="mobile-nav-scrollable max-h-[38vh] min-h-0 overflow-y-auto px-2 py-2">
                {mobileNavTab === "browse" &&
                  bySection("browse").map((it) => (
                    <li key={it.id}>
                      <NavLink
                        to={it.to}
                        onClick={() => {
                          setVisible(false);
                          setMobileQuery("");
                        }}
                        className={({ isActive }) =>
                          `${MOBILE_SUBMENU_ROW} ${
                            isActive
                              ? "bg-gray-200 text-gray-950 dark:bg-gray-800 dark:text-white"
                              : ""
                          }`
                        }
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm shadow-sm ${mobileListIconClass(
                            it.label
                          )}`}
                        >
                          <it.Icon className="text-sm" />
                        </span>
                        <span className="min-w-0 truncate">{it.label}</span>
                      </NavLink>
                    </li>
                  ))}
                {mobileNavTab === "quick" &&
                  bySection("quick").map((it) => (
                    <li key={it.id}>
                      <Link
                        to={it.to}
                        onClick={() => {
                          setVisible(false);
                          setMobileQuery("");
                        }}
                        className={MOBILE_SUBMENU_ROW}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm shadow-sm ${mobileListIconClass(
                            it.label
                          )}`}
                        >
                          <it.Icon className="text-sm" />
                        </span>
                        <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
                          {it.label === "Delivery" && (
                            <FaLock
                              className="h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-300"
                              aria-hidden
                            />
                          )}
                          <span className="truncate">{it.label}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                {mobileNavTab === "account" &&
                  bySection("account").map((it) => (
                    <li key={it.id}>
                      <Link
                        to={it.to}
                        onClick={() => {
                          setVisible(false);
                          setMobileQuery("");
                        }}
                        className={MOBILE_SUBMENU_ROW}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm shadow-sm ${mobileListIconClass(
                            it.label
                          )}`}
                        >
                          <it.Icon className="text-sm" />
                        </span>
                        <span className="min-w-0 truncate">{it.label}</span>
                      </Link>
                    </li>
                  ))}
                {mobileNavTab === "membership" && (
                  <>
                    <li>
                      <Link
                        to="/Community"
                        onClick={() => {
                          setVisible(false);
                          setMobileQuery("");
                        }}
                        className={MOBILE_SUBMENU_ROW}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm shadow-sm ${mobileListIconClass(
                            "Apply for membership"
                          )}`}
                        >
                          <FaUsers className="text-sm" />
                        </span>
                        <span className="min-w-0 truncate">Apply for membership</span>
                      </Link>
                    </li>
                    {isLoggedIn ? (
                      <li>
                        <Link
                          to="/Profile?tab=community"
                          onClick={() => {
                            setVisible(false);
                            setMobileQuery("");
                          }}
                          className={MOBILE_SUBMENU_ROW}
                        >
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm shadow-sm ${mobileListIconClass(
                              "Member hub in profile"
                            )}`}
                          >
                            <FaInfoCircle className="text-sm" />
                          </span>
                          <span className="min-w-0 truncate">Member hub in profile</span>
                        </Link>
                      </li>
                    ) : null}
                    {MEMBERSHIP_BENEFITS.map(({ Icon, title, blurb }) => (
                      <li key={title}>
                        <div
                          className={MOBILE_MEMBERSHIP_BENEFIT_ROW}
                          role="presentation"
                        >
                          <span
                            className={`${MOBILE_SUBMENU_ICON} mt-0.5 shrink-0`}
                          >
                            <Icon className="text-sm" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {title}
                            </p>
                            <p className="mt-0.5 text-xs leading-snug text-gray-500 dark:text-gray-400">
                              {blurb}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </>
                )}
              </ul>
            </div>
          </div>

          {/* Bottom nav: Browse · Q-Links · Account · Membership */}
          <div className="shrink-0 border-t border-gray-200 bg-gray-100 px-3 pb-3 pt-2 dark:border-gray-800 dark:bg-zinc-900">
            <div className="rounded-2xl border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="grid grid-cols-4 gap-2">
                <button
                type="button"
                onClick={() => setMobileNavTab("browse")}
                className={`${MOBILE_TAB_BTN_BASE} ${
                  mobileNavTab === "browse"
                    ? MOBILE_TAB_ACTIVE
                    : MOBILE_TAB_INACTIVE
                }`}
                aria-label="Browse menu"
                aria-pressed={mobileNavTab === "browse"}
              >
                <FaCompass className={MOBILE_TAB_ICON} />
                <span className="max-w-full truncate text-center text-[9px] font-bold uppercase leading-none tracking-tight">
                  Browse
                </span>
                </button>
                <button
                type="button"
                onClick={() => setMobileNavTab("quick")}
                className={`${MOBILE_TAB_BTN_BASE} ${
                  mobileNavTab === "quick"
                    ? MOBILE_TAB_ACTIVE
                    : MOBILE_TAB_INACTIVE
                }`}
                aria-label="Quick links"
                aria-pressed={mobileNavTab === "quick"}
              >
                <FaLink className={MOBILE_TAB_ICON} />
                <span className="max-w-full truncate text-center text-[9px] font-bold uppercase leading-none tracking-tight">
                  Q-Links
                </span>
                </button>
                <button
                type="button"
                onClick={() => setMobileNavTab("account")}
                className={`${MOBILE_TAB_BTN_BASE} ${
                  mobileNavTab === "account"
                    ? MOBILE_TAB_ACTIVE
                    : MOBILE_TAB_INACTIVE
                }`}
                aria-label="Account menu"
                aria-pressed={mobileNavTab === "account"}
              >
                <FaUser className={MOBILE_TAB_ICON} />
                <span className="max-w-full truncate text-center text-[9px] font-bold uppercase leading-none tracking-tight">
                  Account
                </span>
                </button>
                <button
                type="button"
                onClick={() => setMobileNavTab("membership")}
                className={`${MOBILE_TAB_BTN_BASE} ${
                  mobileNavTab === "membership"
                    ? MOBILE_TAB_ACTIVE
                    : MOBILE_TAB_INACTIVE
                }`}
                aria-label="Membership benefits"
                aria-pressed={mobileNavTab === "membership"}
              >
                <FaCrown className={MOBILE_TAB_ICON} />
                <span className="max-w-[min(100%,4.25rem)] whitespace-normal text-center text-[8px] font-bold leading-tight tracking-tight">
                  Membership
                </span>
                </button>
              </div>
            </div>
          </div>

          {/* Sticky CTA row */}
          <div className="border-t border-gray-200 bg-white px-3 pb-4 pt-3 dark:border-gray-800 dark:bg-zinc-950 sm:px-4">
            {isLoggedIn ? (
              <Link
                to="/logout"
                onClick={() => {
                  setVisible(false);
                  setMobileQuery("");
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gray-900 text-white font-semibold hover:opacity-95 dark:bg-white dark:text-gray-900 transition"
              >
                <FaUser />
                Logout
              </Link>
            ) : (
              <Link
                to="/Login"
                onClick={() => {
                  setVisible(false);
                  setMobileQuery("");
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gray-900 text-white font-semibold hover:opacity-95 dark:bg-white dark:text-gray-900 transition"
              >
                <FaUser />
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

