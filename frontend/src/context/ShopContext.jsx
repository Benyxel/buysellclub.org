import { createContext, useEffect, useState } from "react";
import { toast } from "../utils/toast";
import { getProducts } from "../api";

export const ShopContext = createContext();

const ShopContextProvider = (props) => {
  const currency = "₵";
  const delivery_fee = 10;
  
  // Initialize cartItems from localStorage immediately to prevent loss on refresh
  const getInitialCart = () => {
    try {
      const savedCart = localStorage.getItem("cartItems");
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        // Validate that it's an object
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (error) {
      console.error("Failed to load cart from localStorage:", error);
    }
    return {};
  };

  const getInitialFavorites = () => {
    try {
      const savedFavorites = localStorage.getItem("favorites");
      if (savedFavorites) {
        const parsed = JSON.parse(savedFavorites);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (error) {
      console.error("Failed to load favorites from localStorage:", error);
    }
    return [];
  };

  const [cartItems, setCartItems] = useState(getInitialCart);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [favorites, setFavorites] = useState(getInitialFavorites);

  // Load cart and favorites from localStorage on component mount (backup)
  // Also listen for storage events (when cart is updated in other tabs)
  useEffect(() => {
    const loadCartFromStorage = () => {
      const savedCart = localStorage.getItem("cartItems");
      if (savedCart) {
        try {
          const parsed = JSON.parse(savedCart);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            // Only update if different to avoid unnecessary re-renders
            setCartItems((currentCart) => {
              const currentCartStr = JSON.stringify(currentCart);
              const savedCartStr = JSON.stringify(parsed);
              if (currentCartStr !== savedCartStr) {
                console.log("Cart reloaded from localStorage:", parsed);
                return parsed;
              }
              return currentCart;
            });
          }
        } catch (error) {
          console.error("Failed to load cart from localStorage:", error);
        }
      }
    };

    // Load on mount
    loadCartFromStorage();

    // Listen for storage changes (from other tabs or when localStorage is updated)
    const handleStorageChange = (e) => {
      if (e.key === "cartItems") {
        loadCartFromStorage();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    
    // Also listen for custom event (same-tab updates)
    const handleCartUpdate = () => {
      loadCartFromStorage();
    };
    
    window.addEventListener("cartUpdate", handleCartUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("cartUpdate", handleCartUpdate);
    };
  }, []); // Empty dependency array - only run on mount

  // Load favorites
  useEffect(() => {
    const savedFavorites = localStorage.getItem("favorites");
    if (savedFavorites) {
      try {
        const parsed = JSON.parse(savedFavorites);
        if (Array.isArray(parsed)) {
          setFavorites(parsed);
        }
      } catch (error) {
        console.error("Failed to load favorites from localStorage:", error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      // Only save if cartItems is a valid object
      if (cartItems && typeof cartItems === "object" && !Array.isArray(cartItems)) {
        localStorage.setItem("cartItems", JSON.stringify(cartItems));
        console.log("Cart saved to localStorage:", cartItems);
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent("cartUpdate"));
      }
    } catch (error) {
      console.error("Failed to save cart to localStorage:", error);
      // If storage is full, try to clear old data
      if (error.name === "QuotaExceededError") {
        console.warn("localStorage quota exceeded, clearing old cart data");
        try {
          localStorage.removeItem("cartItems");
          localStorage.setItem("cartItems", JSON.stringify(cartItems));
          window.dispatchEvent(new CustomEvent("cartUpdate"));
        } catch (e) {
          console.error("Failed to save cart after clearing:", e);
        }
      }
    }
  }, [cartItems]);

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("favorites", JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (itemId) => {
    setFavorites((prevFavorites) => {
      if (prevFavorites.includes(itemId)) {
        return prevFavorites.filter((id) => id !== itemId);
      } else {
        return [...prevFavorites, itemId];
      }
    });
  };

  const isFavorite = (itemId) => {
    return favorites.includes(itemId);
  };

  const addToCart = async (itemId, size = "default") => {
    // If no size is provided, use "default" as the size key
    // This allows products without size options to still be added to cart
    const sizeKey = size || "default";
    
    // Check if product exists
    const product = products.find(
      (p) =>
        p._id === Number(itemId) ||
        p._id === itemId ||
        String(p._id) === String(itemId)
    );

    if (!product) {
      toast.error("Product not found");
      return;
    }

    // Check inventory if available
    if (product.inventory !== undefined && product.inventory <= 0) {
      toast.error("Product is out of stock");
      return;
    }

    let cartData = structuredClone(cartItems);
    const itemIdKey = String(itemId); // Normalize itemId to string for consistency

    // Calculate current cart quantity for this product (across all sizes)
    let currentCartQuantity = 0;
    if (cartData[itemIdKey]) {
      Object.values(cartData[itemIdKey]).forEach(qty => {
        currentCartQuantity += qty;
      });
    }

    // Check if adding one more would exceed inventory
    if (product.inventory !== undefined && (currentCartQuantity + 1) > product.inventory) {
      toast.error(
        `Only ${product.inventory} item(s) available in stock. You already have ${currentCartQuantity} in your cart.`
      );
      return;
    }

    if (cartData[itemIdKey]) {
      if (cartData[itemIdKey][sizeKey]) {
        cartData[itemIdKey][sizeKey] += 1;
      } else {
        cartData[itemIdKey][sizeKey] = 1;
      }
    } else {
      cartData[itemIdKey] = {};
      cartData[itemIdKey][sizeKey] = 1;
    }

    setCartItems(cartData);
    toast.success("Product added to cart!");
  };

  const [products, setProducts] = useState([]);

  // Fetch products from backend API (admins will add products there)
  const fetchProducts = async () => {
    try {
      const resp = await getProducts();
      console.log("Products API response:", resp);
      
      // Handle paginated response or direct array
      let items = [];
      if (resp.data) {
        if (resp.data.results && Array.isArray(resp.data.results)) {
          items = resp.data.results;
        } else if (Array.isArray(resp.data)) {
          items = resp.data;
        }
      }

      console.log("Extracted items:", items);

      // Map backend product shape to the shape used by the UI
      const mapped = items.map((p) => {
        const images = Array.isArray(p.images) ? p.images : p.image ? [p.image] : [];
        return {
          _id: p._id || p.id,
          name: p.name,
          slug: p.slug,
          description: p.description || "",
          price: typeof p.price === "string" ? parseFloat(p.price) : Number(p.price) || 0,
          images: images,
          image: images.length > 0 ? images[0] : null,
          category: p.category || "",
          type: p.product_type || p.type || "",
          trending: p.trending || false,
          inventory: p.inventory || 0,
          average_rating: p.average_rating || 0,
          review_count: p.review_count || 0,
        };
      });

      console.log("Mapped products:", mapped);

      setProducts(mapped);
      if (mapped.length === 0) {
        console.warn("No products found. Make sure products are created and marked as active.");
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
      console.error("Error details:", err.response?.data || err.message);
      // Set empty array on error to prevent undefined issues
      setProducts([]);
    }
  };

  // Auto-refresh products every 60 seconds
  useEffect(() => {
    fetchProducts();
    
    // Refresh when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchProducts();
      }
    };
    
    // Refresh when window regains focus
    const handleFocus = () => {
      fetchProducts();
    };
    
    // Periodic refresh (every 30 seconds)
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchProducts();
      }
    }, 30000); // 30 seconds
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const getCartCount = () => {
    let total = 0;
    for (const items in cartItems) {
      for (const item in cartItems[items]) {
        try {
          if (cartItems[items][item] > 0) {
            total += cartItems[items][item];
          }
        } catch (error) {
          // ignore individual item errors but log for debugging
          console.debug("getCartCount error", error);
        }
      }
    }
    return total;
  };

  const updateQuantity = async (itemId, size, quantity) => {
    if (quantity < 0) {
      quantity = 0;
    }
    
    // Find the product to check inventory
    const product = products.find(
      (p) =>
        p._id === Number(itemId) ||
        p._id === itemId ||
        String(p._id) === String(itemId)
    );
    
    // Check inventory if product exists and has inventory tracking
    if (product && product.inventory !== undefined && quantity > 0) {
      // Calculate current cart quantity for this product (across all sizes)
      let currentCartQuantity = 0;
      const itemIdKey = String(itemId);
      if (cartItems[itemIdKey]) {
        Object.values(cartItems[itemIdKey]).forEach(qty => {
          currentCartQuantity += qty;
        });
      }
      
      // Calculate what the new total would be (current - current size quantity + new quantity)
      const sizeKey = size || "default";
      const currentSizeQuantity = cartItems[itemIdKey]?.[sizeKey] || 0;
      const newTotalQuantity = currentCartQuantity - currentSizeQuantity + quantity;
      
      // If new total exceeds inventory, limit to available stock
      if (newTotalQuantity > product.inventory) {
        const maxAllowed = product.inventory - (currentCartQuantity - currentSizeQuantity);
        if (maxAllowed <= 0) {
          toast.error(`Only ${product.inventory} item(s) available in stock.`);
          quantity = 0; // Remove from cart if no stock available
        } else {
          toast.warning(`Only ${product.inventory} item(s) available in stock. Quantity adjusted to ${maxAllowed}.`);
          quantity = maxAllowed;
        }
      }
    }
    
    let cartData = structuredClone(cartItems);
    const itemIdKey = String(itemId);
    const sizeKey = size || "default";
    
    if (cartData[itemIdKey]) {
      if (quantity === 0) {
        delete cartData[itemIdKey][sizeKey];
        // If no more sizes for this item, remove the item entry
        if (Object.keys(cartData[itemIdKey]).length === 0) {
          delete cartData[itemIdKey];
        }
      } else {
        cartData[itemIdKey][sizeKey] = quantity;
      }
    }
    
    setCartItems(cartData);
  };

  const getCartAmount = () => {
    let totalAmount = 0;
    for (const itemId in cartItems) {
      // Try to find product by _id (handle both number and string comparisons)
      const iteminfo = products.find(
        (product) =>
          product._id === Number(itemId) ||
          product._id === itemId ||
          String(product._id) === String(itemId)
      );
      
      if (!iteminfo) {
        console.warn(`Product with ID ${itemId} not found in products list`);
        continue;
      }

      for (const size in cartItems[itemId]) {
        try {
          const quantity = cartItems[itemId][size];
          if (quantity > 0 && iteminfo.price) {
            totalAmount += Number(iteminfo.price) * quantity;
          }
        } catch (error) {
          console.debug("getCartAmount error", error);
        }
      }
    }
    return totalAmount;
  };

  const clearCart = () => {
    setCartItems({});
    localStorage.removeItem("cartItems");
    console.log("Cart cleared");
  };

  const value = {
    products,
    currency,
    delivery_fee,
    search,
    setSearch,
    showSearch,
    setShowSearch,
    cartItems,
    addToCart,
    getCartCount,
    updateQuantity,
    getCartAmount,
    clearCart,
    favorites,
    toggleFavorite,
    isFavorite,
  };

  return (
    <ShopContext.Provider value={value}>{props.children}</ShopContext.Provider>
  );
};

export default ShopContextProvider;
