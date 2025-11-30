import React from "react";
import { Routes, Route } from "react-router-dom";
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
import Contact from "./pages/Contact";
import PlaceOrder from "./pages/PlaceOrder";
import Training from "./pages/Quicklinks/Training"; 
import AlipayPayment from "./pages/Quicklinks/AlipayPayment";
import Payment from "./pages/Quicklinks/Payment";
import Favorites from "./pages/Favorites";
import MyProfile from "./components/MyProfile";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Navbar from "./components/Navbar";
import { ToastContainer } from "react-toastify";
import Footer from "./components/Footer";
import SearchBar from "./components/Searchbar";
import Product from "./components/Product";
import ShippingDashboard from "./components/ShippingDashboard";
import FofooAddressGenerator from "./components/FofooAddressGenerator.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminLogin from "./pages/AdminLogin";
import TrackingPage from "./pages/TrackingPage";
import ProtectedRoute from "./auth/ProtectedRoute.jsx";
import AdminRoute from "./auth/AdminRoute.jsx";
import TokenDebugger from "./components/TokenDebugger";
import OrderManagement from "./pages/admin/OrderManagement";
import UserOrders from "./pages/UserOrders";
import "react-toastify/dist/ReactToastify.css";
import Logout from "./components/Logout";
import NotFound from "./pages/NotFound";
import LoginPromptModal from "./components/LoginPromptModal";
import UserView from "./pages/admin/UserView";
import ScrollToTop from "./components/ScrollToTop";
import Gallery from "./pages/Gallery";

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <ScrollToTop />
      <Routes>
        {/* Auth pages without Navbar and Footer */}
        <Route path="/Login" element={<Login />} />
        <Route path="/Signup" element={<Signup />} />
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
        <Route
          path="/admin/orders"
          element={
            <AdminRoute>
              <OrderManagement />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/user/:markId"
          element={
            <AdminRoute>
              <UserView />
            </AdminRoute>
          }
        />

        {/* Regular routes with Navbar and Footer */}
        <Route
          path="*"
          element={
            <>
              <Navbar />
              <SearchBar />
              <main className="flex-grow bg-gray-50 dark:bg-gray-900 dark:text-white duration-200">
                <Routes>
                  {/* Public routes - accessible without login */}
                  <Route path="/" element={<Home />} />
                  <Route path="/Shop" element={<Shop />} />
                  <Route path="/Services" element={<Services />} />
                  <Route path="/Contact" element={<Contact />} />
                  <Route path="/Policies" element={<Policies />} />
                  <Route path="/About" element={<About />} />
                  <Route path="/Gallery" element={<Gallery />} />
                  <Route path="/product/:productId" element={<Product />} />
                  <Route path="/Trending" element={<Trending />} />
                  <Route path="/Wholesale" element={<Wholesale />} />
                  <Route path="/Suppliers" element={<Suppliers />} />
                  <Route path="/Training" element={<Training />} />
                  <Route path="/tracking" element={<TrackingPage />} />

                  {/* Protected routes - require login */}
                  <Route
                    path="/Cart"
                    element={
                      <ProtectedRoute>
                        <Cart />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/Buy4me"
                    element={
                      <ProtectedRoute>
                        <Buy4me />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/Orders"
                    element={
                      <ProtectedRoute>
                        <UserOrders />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/Shipping"
                    element={
                      <ProtectedRoute>
                        <ShippingDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/checkout"
                    element={
                      <ProtectedRoute>
                        <Checkout />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/PlaceOrder"
                    element={
                      <ProtectedRoute>
                        <PlaceOrder />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/AlipayPayment"
                    element={
                      <ProtectedRoute>
                        <AlipayPayment />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/Payment"
                    element={
                      <ProtectedRoute>
                        <Payment />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/Favorites"
                    element={
                      <ProtectedRoute>
                        <Favorites />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/Profile"
                    element={
                      <ProtectedRoute>
                        <MyProfile />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/Fofoofo-address-generator"
                    element={
                      <ProtectedRoute>
                        <FofooAddressGenerator />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/logout" element={<Logout />} />
                  <Route path="/debug" element={<TokenDebugger />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
            </>
          }
        />
      </Routes>
      <LoginPromptModal />
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
      />
    </div>
  );
}

export default App;
