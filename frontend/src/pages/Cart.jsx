import React, { useContext, useEffect, useState, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { ShopContext } from "../context/ShopContext";
import { ImBin } from "react-icons/im";
import { FaShoppingCart } from "react-icons/fa";
import CartTotal from "../components/CartTotal";

const Cart = () => {
  const location = useLocation();
  const { products, currency, cartItems, updateQuantity } =
    useContext(ShopContext);
  const [cartData, setCartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const prevLocationRef = useRef(location.pathname);

  // Function to reload cart data
  const reloadCart = useCallback(() => {
    console.log("Cart page: Auto-refreshing cart");
    const savedCart = localStorage.getItem("cartItems");
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          // Dispatch event to trigger cart reload in context
          window.dispatchEvent(new CustomEvent("cartUpdate"));
          
          // Process cart data directly from localStorage
          const tempDataFromStorage = [];
          for (const items in parsed) {
            for (const item in parsed[items]) {
              if (parsed[items][item] > 0) {
                tempDataFromStorage.push({
                  _id: items,
                  size: item,
                  quantity: parsed[items][item],
                });
              }
            }
          }
          
          // Update cart data
          setCartData(tempDataFromStorage);
          console.log("Cart page: Auto-refreshed cart data", tempDataFromStorage);
        }
      } catch (error) {
        console.error("Failed to parse saved cart during auto-refresh:", error);
      }
    } else {
      setCartData([]);
    }
  }, []);

  // Auto-refresh on page visibility change (when tab becomes visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("Cart page: Tab became visible, refreshing cart");
        reloadCart();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [reloadCart]);

  // Auto-refresh when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      console.log("Cart page: Window regained focus, refreshing cart");
      reloadCart();
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [reloadCart]);

  // Auto-refresh periodically (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        reloadCart();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [reloadCart]);

  // Listen for storage events (cart updates from other tabs)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "cartItems") {
        console.log("Cart page: Storage changed, refreshing cart");
        reloadCart();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [reloadCart]);

  // Listen for custom cart update events
  useEffect(() => {
    const handleCartUpdate = () => {
      console.log("Cart page: Cart update event received, refreshing");
      reloadCart();
    };

    window.addEventListener("cartUpdate", handleCartUpdate);
    return () => {
      window.removeEventListener("cartUpdate", handleCartUpdate);
    };
  }, [reloadCart]);

  // Process cart items into displayable format
  useEffect(() => {
    // Check if we just navigated to this page (including back button)
    const isNavigatingToCart = location.pathname === "/Cart" || location.pathname === "/cart";
    const wasOnDifferentPage = prevLocationRef.current !== location.pathname;
    
    setIsLoading(true);
    
    // When navigating to cart page, always reload from localStorage first for immediate display
    if (isNavigatingToCart && wasOnDifferentPage) {
      console.log("Cart page: Detected navigation to cart page, reloading cart");
      // Force reload cart from localStorage when navigating to this page
      const savedCart = localStorage.getItem("cartItems");
      if (savedCart) {
        try {
          const parsed = JSON.parse(savedCart);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            // Dispatch event to trigger cart reload in context
            window.dispatchEvent(new CustomEvent("cartUpdate"));
            console.log("Cart page: Triggered cart reload from localStorage");
            
            // Process cart data directly from localStorage for immediate display
            const tempDataFromStorage = [];
            for (const items in parsed) {
              for (const item in parsed[items]) {
                if (parsed[items][item] > 0) {
                  tempDataFromStorage.push({
                    _id: items,
                    size: item,
                    quantity: parsed[items][item],
                  });
                }
              }
            }
            
            // Update cart data immediately from localStorage
            setCartData(tempDataFromStorage);
            setIsLoading(false);
            console.log("Cart page: Loaded cart data directly from localStorage", tempDataFromStorage);
            
            // Update previous location
            prevLocationRef.current = location.pathname;
            // Don't return - continue to process from context as well for sync
          }
        } catch (error) {
          console.error("Failed to parse saved cart:", error);
        }
      } else {
        // No cart in localStorage, clear the display
        setCartData([]);
        setIsLoading(false);
        prevLocationRef.current = location.pathname;
        return;
      }
    }
    
    // Update previous location if not already updated
    if (prevLocationRef.current !== location.pathname) {
      prevLocationRef.current = location.pathname;
    }

    // Process cart items from context (normal flow or after context updates)
    // This ensures we stay in sync with context updates
    const tempData = [];
    if (cartItems && typeof cartItems === "object") {
      for (const items in cartItems) {
        for (const item in cartItems[items]) {
          if (cartItems[items][item] > 0) {
            tempData.push({
              _id: items,
              size: item,
              quantity: cartItems[items][item],
            });
          }
        }
      }
    }
    
    // Only update if we have data from context (to avoid clearing localStorage data immediately)
    // Or if we're not in the navigation flow
    if (!isNavigatingToCart || !wasOnDifferentPage || tempData.length > 0) {
      setCartData(tempData);
      setIsLoading(false);
      console.log("Cart page: Processed cart data from context", tempData, "from cartItems:", cartItems);
    }
  }, [cartItems, location.pathname]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-8">
        <FaShoppingCart className="text-primary text-2xl" />
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Shopping Cart
        </h1>
      </div>

      <div>
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading cart...</p>
          </div>
        ) : cartData.length > 0 ? (
          cartData.map((item, index) => {
            const productData = products.find(
              (product) =>
                product._id === Number(item._id) ||
                product._id === item._id ||
                String(product._id) === String(item._id)
            );
            
            if (!productData) {
              return null; // Skip items where product is not found
            }
            
            // Handle image - could be string or array
            const productImage = Array.isArray(productData.image)
              ? productData.image[0]
              : productData.image || (productData.images && productData.images[0]) || '';
            
            return (
              <div
                key={index}
                className="py-4 border-t text-gray-700 grid grid-cols-[4fr_0.5fr_0.5fr] sm:grid-cols-[4fr_2fr_0.5fr] items-center gap-4"
              >
                <div className="flex items-start gap">
                  <img
                    className="w-16 sm:w-20 object-cover rounded"
                    src={productImage}
                    alt={productData.name}
                  />
                  <div>
                    <p className="mt-2 mx-6 text-xs sm:text-lg font-medium">
                      {productData?.name || "Product not found"}
                    </p>
                    <div className="flex items-center gap-5 mx-6 mt-2">
                      <p>
                        {currency}{typeof productData.price === 'number' ? productData.price.toFixed(2) : productData.price}
                      </p>
                      {item.size !== 'default' && (
                        <p className="px-2 sm:px-3 sm:py-1 border bg-slate-50">
                          {item.size}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <input
                  className="border max-w-10 sm:max-w-20 px-1 sm:px-2 py-2 rounded"
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || value === "0") {
                      updateQuantity(item._id, item.size, 0);
                      return;
                    }
                    updateQuantity(item._id, item.size, Number(value));
                  }}
                />
                <ImBin
                  onClick={() => updateQuantity(item._id, item.size, 0)}
                  className="w-4 mr-4 text-2xl sm:w-5 cursor-pointer hover:text-primary"
                />
              </div>
            );
          })
        ) : (
          <div className="text-center py-12">
            <FaShoppingCart className="text-gray-400 text-6xl mx-auto mb-4" />
            <h2 className="text-xl text-gray-600 dark:text-gray-400 mb-2">
              Your cart is empty
            </h2>
            <p className="text-gray-500 dark:text-gray-500">
              Add some products to your cart!
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end my-20">
        <div className="w-full sm:w-[450px]">
          <CartTotal />
        </div>
      </div>
    </div>
  );
};

export default Cart;
