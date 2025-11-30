import React, { useContext, useState, useEffect } from "react";
import { FaShoppingCart } from "react-icons/fa";
import { IoMdArrowDropdown } from "react-icons/io";
import DarkMode from "./DarkMode";
import { Link, NavLink } from "react-router-dom";
import { FaUser } from "react-icons/fa";
import { IoMdMenu } from "react-icons/io";
import { IoClose } from "react-icons/io5";
import { ShopContext } from "../context/ShopContext";

const MenuLinks = [
  { name: "Home", href: "/" },
  { name: "Shop", href: "/Shop" },
  { name: "Gallery", href: "/Gallery" },
  { name: "Services", href: "/Services" },
  { name: "About", href: "/About" },
  { name: "Contact", href: "/Contact" },
];

const Quicklinks = [
  { name: "Buy4Me", href: "/Buy4me" },
  { name: "Shipping", href: "/Shipping" },
  { name: "Trending", href: "/Trending" },
  { name: "Training", href: "/Training" },
  { name: "Alipay Payment", href: "/AlipayPayment" },
];

// Static links that don't change based on auth status
const StaticUserLinks = [
  { name: "My Profile", href: "/Profile" },
  { name: "Orders", href: "/Orders" },
  { name: "Favorites", href: "/Favorites" },
];

export default function Navbar() {
  const [visible, setVisible] = useState(false);
  const { getCartCount } = useContext(ShopContext);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [_userData, setUserData] = useState(null);
  const [username, setUsername] = useState("");
  const [shippingMark, setShippingMark] = useState("");

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

  // Build user links: if not logged, protected links send to /Login
  const UserLinks = isLoggedIn
    ? [...StaticUserLinks, { name: "Logout", href: "/logout" }]
    : [
        { name: "My Profile", href: "/Login" },
        { name: "Orders", href: "/Login" },
        { name: "Favorites", href: "/Login" },
        { name: "Login", href: "/Login" },
      ];

  return (
    <div className="bg-white shadow-md dark:bg-gray-900 dark:text-white duration-200 relative z-40">
      <div className="py-4">
        <div className="container flex justify-between">
          <div className="flex items-center gap-12">
            <Link
              className="text-primary font-bold -tracking-widest text-[40px] uppercase sm:text-3xl hover:text-brandGreen"
              to="/"
            >
              BuySellClub
            </Link>

            <div className="hidden lg:block">
              <ul className="flex items-start gap-3 text-[18px]">
                {MenuLinks.map((data, index) => (
                  <li key={index}>
                    <NavLink
                      to={data.href}
                      className={({ isActive }) =>
                        isActive
                          ? "inline-block px-2 font-semibold text-black dark:text-white duration-200"
                          : "inline-block px-2 font-semibold text-gray-500 hover:text-black dark:hover:text-white duration-200"
                      }
                    >
                      {data.name}
                    </NavLink>
                  </li>
                ))}
                {/* Dropdown */}
                <li className="relative cursor-pointer group">
                  <a
                    href="#"
                    className="flex items-center gap-[2px] font-semibold text-gray-500 dark:hover:text-white hover:text-black"
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
                            to={data.href}
                            className="text-gray-500 hover:text-black dark:hover:text-white p-1 duration-200 inline-block w-full hover:bg-brandGreen/20 rounded-md"
                          >
                            {data.name}
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
            <div className="lg:hidden">
              <IoMdMenu
                onClick={() => setVisible(true)}
                className="text-3xl text-gray-500 hover:text-black dark:hover:text-white cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`fixed top-0 right-0 bottom-0 bg-white/95 transition-transform transform ${
          visible ? "translate-x-0" : "translate-x-full"
        } w-1/2 sm:w-64 z-50 dark:bg-black/90 lg:hidden`}
      >
        <div className="flex flex-col text-gray-600 h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <p className="text-lg font-semibold dark:text-white">Menu</p>
            <IoClose
              onClick={() => setVisible(false)}
              className="h-8 cursor-pointer text-[30px] duration-300 dark:text-white hover:text-primary"
            />
          </div>

          {/* User Info Section for Mobile */}
          {isLoggedIn && (username || shippingMark) && (
            <div className="px-4 py-3 bg-gray-100 dark:bg-gray-800 border-b">
              <div className="flex items-center gap-2">
                <FaUser className="text-gray-600 dark:text-gray-400" />
                <div className="flex flex-col">
                  {username && (
                    <span className="text-sm font-medium text-gray-800 dark:text-white">
                      {username}
                    </span>
                  )}
                  {shippingMark && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {shippingMark}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {/* Main Menu Links */}
            <ul className="py-4">
              {MenuLinks.map((data, index) => (
                <li key={index} className="py-2">
                  <NavLink
                    to={data.href}
                    className={({ isActive }) =>
                      isActive
                        ? "block px-4 font-semibold text-black dark:text-white duration-200"
                        : "block px-4 font-semibold text-gray-500 hover:text-black dark:hover:text-white duration-200"
                    }
                    onClick={() => setVisible(false)}
                  >
                    {data.name}
                  </NavLink>
                </li>
              ))}
            </ul>

            {/* Quick Links Section */}
            <div className="px-4 py-2">
              <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
                Quick Links
              </h3>
              <ul className="space-y-2">
                {Quicklinks.map((data, index) => (
                  <li key={index}>
                    <Link
                      to={data.href}
                      className="block text-gray-500 hover:text-black dark:hover:text-white duration-200"
                      onClick={() => setVisible(false)}
                    >
                      {data.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* User Links Section */}
            <div className="px-4 py-2">
              <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
                Account
              </h3>
              <ul className="space-y-2">
                {UserLinks.map((data, index) => (
                  <li key={index}>
                    {data.href ? (
                      <Link
                        to={data.href}
                        className="block text-gray-500 hover:text-black dark:hover:text-white duration-200"
                        onClick={() => setVisible(false)}
                      >
                        {data.name}
                      </Link>
                    ) : (
                      <button
                        onClick={() => {
                          data.action();
                          setVisible(false);
                        }}
                        className="block text-gray-500 hover:text-black dark:hover:text-white duration-200 text-left w-full"
                      >
                        {data.name}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
