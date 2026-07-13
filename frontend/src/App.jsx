import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { pageView } from "./utils/ga4";
import { recordPageView } from "./utils/siteAnalytics";
import { getMaintenanceSettings } from "./api";
import MaintenancePage from "./components/MaintenancePage";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import Services from "./pages/Services";
import About from "./pages/About";
import Policies from "./pages/Policies";
import Checkout from "./pages/Checkout";
import Cart from "./pages/Cart";
import Buy4me from "./pages/Quicklinks/Buy4me";
import Orders from "./pages/Orders";
import Shipping from "./pages/Quicklinks/Shipping";
import Trending from "./pages/Quicklinks/Trending";
import Wholesale from "./pages/Quicklinks/Wholesale";
import Suppliers from "./pages/Quicklinks/Suppliers";
import QuickTracking from "./pages/Quicklinks/QuickTracking";
import Contact from "./pages/Contact";
import PlaceOrder from "./pages/PlaceOrder";
import Training from "./pages/Quicklinks/Training";
import AlipayPayment from "./pages/Quicklinks/AlipayPayment";
import OurRates from "./pages/Quicklinks/OurRates";
import Delivery from "./pages/Quicklinks/Delivery";
import JoinCommunity from "./pages/Community/JoinCommunity";
import CommunitySheet from "./pages/Community/CommunitySheet";
import WinningProducts from "./pages/Community/WinningProducts";
import VideoTutorials from "./pages/Community/VideoTutorials";
import ToolsDownloads from "./pages/Community/ToolsDownloads";
import VendorOnboarding from "./pages/VendorOnboarding";
import VendorSales from "./pages/VendorSales";
import CommunityPayment from "./pages/Community/CommunityPayment";
import ExecutivePayment from "./pages/Executive/ExecutivePayment";
import CommunitySetPassword from "./pages/Community/CommunitySetPassword";
import ResetPassword from "./pages/ResetPassword";
import PaymentCallback from "./pages/PaymentCallback";
import Donation from "./pages/Donation";
import DigitalStore from "./pages/DigitalStore";
import Favorites from "./pages/Favorites";
import MyProfile from "./components/MyProfile";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import TermsAndConditions from "./pages/TermsAndConditions";
import Navbar from "./components/Navbar";
import { ToastContainer } from "react-toastify";
import Footer from "./components/Footer";
import SearchBar from "./components/Searchbar";
import Product from "./components/Product";
import ShippingDashboard from "./components/ShippingDashboard";
import FofooAddressGenerator from "./components/FofooAddressGenerator.jsx";
import RegionAddressGenerator from "./components/RegionAddressGenerator";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import Gallery from "./pages/Gallery";
import AdminLogin from "./pages/AdminLogin";
import TrackingPage from "./pages/TrackingPage";
import PublicInvoice from "./pages/PublicInvoice";
import StaffClockPage from "./pages/StaffClockPage";
import ProtectedRoute from "./auth/ProtectedRoute.jsx";
import AdminRoute from "./auth/AdminRoute.jsx";
import AgentRoute from "./auth/AgentRoute.jsx";
import AgentDashboard from "./pages/AgentDashboard";
import LocalAgentDashboard from "./pages/LocalAgentDashboard";
import TokenDebugger from "./components/TokenDebugger";
import OrderManagement from "./pages/admin/OrderManagement";
import UserOrders from "./pages/UserOrders";
import "react-toastify/dist/ReactToastify.css";
import Logout from "./components/Logout";
import NotFound from "./pages/NotFound";
import LoginPromptModal from "./components/LoginPromptModal";
import UserView from "./pages/admin/UserView";
import ScrollToTop from "./components/ScrollToTop";
import ScrollToTopButton from "./components/ScrollToTopButton";
import { formatMarkIdForDisplay } from "./utils/markIdFormat";

/** Old /admin/user/:markId URLs → /admin-user/:markId (avoids cPanel /admin folder 404). */
function LegacyAdminUserRedirect() {
  const { markId } = useParams();
  return (
    <Navigate
      to={`/admin-user/${encodeURIComponent(formatMarkIdForDisplay(markId || ""))}`}
      replace
    />
  );
}

function App() {
  const location = useLocation();
  /** null = not fetched yet; show app immediately (no blocking splash). */
  const [maintenance, setMaintenance] = useState(null);

  // Check if current route is an admin, agent, or auth route (should bypass maintenance)
  const currentPath = location.pathname;
  const isAdminRoute =
    currentPath.startsWith("/admin-dashboard") ||
    currentPath.startsWith("/admin-user") ||
    currentPath.startsWith("/admin-orders") ||
    currentPath.startsWith("/admin/") ||
    currentPath === "/admin-login";
  const isAgentRoute =
    currentPath.startsWith("/agent-dashboard") ||
    currentPath.startsWith("/local-agent-dashboard");
  const isAuthRoute =
    currentPath === "/Login" ||
    currentPath === "/Signup" ||
    currentPath === "/admin-login";

  // Payment callback should work even during maintenance
  const isPaymentCallback =
    currentPath.startsWith("/payment/callback") ||
    currentPath === "/payment/callback";

  // Routes that should bypass maintenance mode
  const shouldBypassMaintenance =
    isAdminRoute || isAgentRoute || isAuthRoute || isPaymentCallback;

  // Debug logging
  if (shouldBypassMaintenance) {
    console.log("Route bypassing maintenance mode:", currentPath);
  }

  // GA4: track page view on every route change (site visits, Quick Links, Community pages)
  useEffect(() => {
    pageView(location.pathname || "/", document.title || "BuySellClub");
  }, [location.pathname]);

  // Custom site analytics: record page view for admin dashboard (daily visitors, page stats)
  useEffect(() => {
    recordPageView(location.pathname || "/");
  }, [location.pathname]);

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const response = await getMaintenanceSettings();
        setMaintenance(response.data);
      } catch (error) {
        console.error("Failed to check maintenance status:", error);
        setMaintenance({ is_enabled: false });
      }
    };

    checkMaintenance();
    const interval = setInterval(checkMaintenance, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {maintenance?.is_enabled && !shouldBypassMaintenance ? (
        <MaintenancePage
          title={maintenance.title}
          message={maintenance.message}
          estimatedTime={maintenance.estimated_time}
        />
      ) : (
        <div className="min-h-screen flex flex-col bg-gray-50">
          <ScrollToTop />
          <ScrollToTopButton />
          <Routes>
            {/* Auth pages without Navbar and Footer */}
            <Route path="/Login" element={<Login />} />
            <Route path="/Signup" element={<Signup />} />
            <Route
              path="/terms-and-conditions"
              element={<TermsAndConditions />}
            />
            <Route path="/admin-login" element={<AdminLogin />} />

            {/* Admin routes without Navbar and Footer */}
            <Route
              path="/admin-dashboard"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
            {/* Agent Dashboard route without Navbar and Footer */}
            <Route
              path="/agent-dashboard"
              element={
                <AgentRoute>
                  <AgentDashboard />
                </AgentRoute>
              }
            />
            <Route
              path="/local-agent-dashboard"
              element={
                <AgentRoute>
                  <LocalAgentDashboard />
                </AgentRoute>
              }
            />
            {/* Use /admin-user and /admin-orders (not /admin/...) — on buysellclub.org
                a physical /admin path makes nested SPA routes return LiteSpeed 404. */}
            <Route
              path="/admin-orders"
              element={
                <AdminRoute>
                  <OrderManagement />
                </AdminRoute>
              }
            />
            <Route
              path="/admin-user/:markId"
              element={
                <AdminRoute>
                  <UserView />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/orders"
              element={<Navigate to="/admin-orders" replace />}
            />
            <Route
              path="/admin/user/:markId"
              element={<LegacyAdminUserRedirect />}
            />

            {/* Regular routes with Navbar and Footer */}
            <Route
              path="/*"
              element={
                <>
                  <Navbar />
                  <SearchBar />
                  <main className="flex-grow bg-gray-50 dark:bg-gray-900 dark:text-white duration-200">
                    <Routes>
                      {/* Public routes - accessible without login */}
                      <Route index element={<Home />} />
                      <Route path="Shop" element={<Shop />} />
                      <Route path="Services" element={<Services />} />
                      <Route path="Contact" element={<Contact />} />
                      <Route path="Policies" element={<Policies />} />
                      <Route path="About" element={<About />} />
                      <Route path="product/:productId" element={<Product />} />
                      <Route path="Trending" element={<Trending />} />
                      <Route path="Wholesale" element={<Wholesale />} />
                      <Route path="Suppliers" element={<Suppliers />} />
                      <Route path="Training" element={<Training />} />
                      <Route path="QuickTracking" element={<QuickTracking />} />
                      <Route path="OurRates" element={<OurRates />} />
                      <Route path="Gallery" element={<Gallery />} />
                      <Route path="tracking" element={<TrackingPage />} />
                      <Route path="invoice" element={<PublicInvoice />} />
                      <Route path="clock" element={<StaffClockPage />} />
                      <Route
                        path="payment/callback"
                        element={<PaymentCallback />}
                      />
                      <Route path="community/set-password" element={<CommunitySetPassword />} />
                      <Route path="reset-password" element={<ResetPassword />} />
                      {/* Donation: Paystack; not linked in nav */}
                      <Route path="donation" element={<Donation />} />
                      <Route path="DigitalStore" element={<DigitalStore />} />

                      {/* Protected routes - require login */}
                      <Route
                        path="Cart"
                        element={
                          <ProtectedRoute>
                            <Cart />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="Buy4me"
                        element={
                          <ProtectedRoute>
                            <Buy4me />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="Orders"
                        element={
                          <ProtectedRoute>
                            <UserOrders />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="Shipping"
                        element={
                          <ProtectedRoute>
                            <ShippingDashboard />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="checkout"
                        element={
                          <ProtectedRoute>
                            <Checkout />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="PlaceOrder"
                        element={
                          <ProtectedRoute>
                            <PlaceOrder />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="AlipayPayment"
                        element={
                          <ProtectedRoute>
                            <AlipayPayment />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="Delivery"
                        element={
                          <ProtectedRoute>
                            <Delivery />
                          </ProtectedRoute>
                        }
                      />
                      <Route path="Community" element={<JoinCommunity />} />
                      <Route
                        path="Community/Suppliers"
                        element={
                          <ProtectedRoute>
                            <CommunitySheet />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="Community/WinningProducts"
                        element={
                          <ProtectedRoute>
                            <WinningProducts />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="Community/VideoTutorials"
                        element={
                          <ProtectedRoute>
                            <VideoTutorials />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="Community/ToolsDownloads"
                        element={
                          <ProtectedRoute>
                            <ToolsDownloads />
                          </ProtectedRoute>
                        }
                      />
                      <Route path="become-a-vendor" element={<VendorOnboarding />} />
                      <Route
                        path="vendor-sales"
                        element={
                          <ProtectedRoute>
                            <VendorSales />
                          </ProtectedRoute>
                        }
                      />
                      <Route path="CommunityPayment" element={<CommunityPayment />} />
                      <Route path="ExecutivePayment" element={<ExecutivePayment />} />
                      <Route
                        path="Favorites"
                        element={
                          <ProtectedRoute>
                            <Favorites />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="Profile"
                        element={
                          <ProtectedRoute>
                            <MyProfile />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="Fofoofo-address-generator"
                        element={
                          <ProtectedRoute>
                            <FofooAddressGenerator />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="address-generator/:code"
                        element={
                          <ProtectedRoute>
                            <RegionAddressGenerator />
                          </ProtectedRoute>
                        }
                      />
                      <Route path="logout" element={<Logout />} />
                      <Route path="debug" element={<TokenDebugger />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </main>
                  <Footer />
                </>
              }
            />
          </Routes>
          <LoginPromptModal />
        </div>
      )}
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        limit={5}
        enableMultiContainer={false}
      />
    </>
  );
}

export default App;
