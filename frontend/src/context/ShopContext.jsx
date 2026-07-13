import { createContext, useEffect, useState } from "react";
import { toast } from "../utils/toast";
import { getProducts } from "../api";
import { resolveMediaUrl } from "../utils/resolveMediaUrl";

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

  const getInitialCartItemOptions = () => {
    try {
      const saved = localStorage.getItem("cartItemOptions");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to load cartItemOptions", e);
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
  const [cartItemOptions, setCartItemOptions] = useState(getInitialCartItemOptions);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [favorites, setFavorites] = useState(getInitialFavorites);

  // Cart line key = size + color so same product+size+color = one line (increase qty), else new line
  const getCartKey = (sizeKey, color) => {
    const s = sizeKey || "default";
    const c = color != null && String(color).trim() !== "" ? String(color).trim() : "";
    return c ? `${s}|Color:${c}` : s;
  };
  const parseCartKey = (cartKey) => {
    if (!cartKey || typeof cartKey !== "string") return { sizeKey: "default", color: null };
    if (cartKey.includes("|Color:")) {
      const [sizeKey, color] = cartKey.split("|Color:");
      return { sizeKey: sizeKey || "default", color: color && color.trim() ? color.trim() : null };
    }
    return { sizeKey: cartKey, color: null };
  };

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
    const loadOptionsFromStorage = () => {
      try {
        const saved = localStorage.getItem("cartItemOptions");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            setCartItemOptions(parsed);
          }
        }
      } catch (_) {}
    };
    const handleStorageChange = (e) => {
      if (e.key === "cartItems") {
        loadCartFromStorage();
      }
      if (e.key === "cartItemOptions") {
        loadOptionsFromStorage();
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

  // Save cart and cartItemOptions to localStorage whenever they change
  useEffect(() => {
    try {
      // Only save if cartItems is a valid object
      if (cartItems && typeof cartItems === "object" && !Array.isArray(cartItems)) {
        localStorage.setItem("cartItems", JSON.stringify(cartItems));
        console.log("Cart saved to localStorage:", cartItems);
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

  useEffect(() => {
    try {
      if (cartItemOptions && typeof cartItemOptions === "object" && !Array.isArray(cartItemOptions)) {
        localStorage.setItem("cartItemOptions", JSON.stringify(cartItemOptions));
      }
    } catch (e) {
      console.warn("Failed to save cartItemOptions", e);
    }
  }, [cartItemOptions]);

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

  const addToCart = async (itemId, size = "default", quantity = 1, options = {}) => {
    const qty = Math.max(1, Math.floor(Number(quantity)) || 1);
    const sizeKey = size || "default";
    const cartKey = getCartKey(sizeKey, options?.color);

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

    const vi = product.variant_inventory && typeof product.variant_inventory === "object" && Object.keys(product.variant_inventory).length > 0
      ? product.variant_inventory
      : null;
    const maxForVariant = vi
      ? (sizeKey in vi ? (Number(vi[sizeKey]) || 0) : 0)
      : product.inventory;

    if (maxForVariant <= 0) {
      toast.error(vi ? "This option is out of stock." : "Product is out of stock");
      return;
    }

    let cartData = structuredClone(cartItems);
    const itemIdKey = String(itemId);
    const currentLineQty = cartData[itemIdKey]?.[cartKey] || 0;
    const newQtyForThisLine = currentLineQty + qty;

    if (vi) {
      if (newQtyForThisLine > maxForVariant) {
        toast.error(`Only ${maxForVariant} in stock for this option.`);
        return;
      }
    } else {
      let currentCartQuantity = 0;
      if (cartData[itemIdKey]) {
        Object.values(cartData[itemIdKey]).forEach((val) => { currentCartQuantity += val; });
      }
      const newTotalForProduct = currentCartQuantity - currentLineQty + newQtyForThisLine;
      if (product.inventory !== undefined && newTotalForProduct > product.inventory) {
        const maxAllowed = product.inventory - (currentCartQuantity - currentLineQty);
        toast.error(
          maxAllowed <= 0
            ? `Only ${product.inventory} item(s) in stock. You already have ${currentCartQuantity} in your cart.`
            : `Only ${product.inventory} item(s) in stock. Max you can add is ${maxAllowed} for this option.`
        );
        return;
      }
    }

    if (!cartData[itemIdKey]) cartData[itemIdKey] = {};
    cartData[itemIdKey][cartKey] = newQtyForThisLine;

    setCartItems(cartData);
    if (options.color != null && String(options.color).trim() !== "") {
      setCartItemOptions((prev) => {
        const next = { ...prev };
        if (!next[itemIdKey]) next[itemIdKey] = {};
        next[itemIdKey] = { ...next[itemIdKey], [cartKey]: { color: String(options.color).trim() } };
        return next;
      });
    }
    toast.success("Product added to cart!");
  };

  // Add multiple variant quantities in one go (e.g. 2 of Size 38, 1 of Size 39). Optional color per entry or single color for all.
  const addToCartBulk = (itemId, entries, options = {}) => {
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
    const vi = product.variant_inventory && typeof product.variant_inventory === "object" && Object.keys(product.variant_inventory).length > 0
      ? product.variant_inventory
      : null;
    const itemIdKey = String(itemId);
    let cartData = structuredClone(cartItems);
    if (!cartData[itemIdKey]) cartData[itemIdKey] = {};
    let added = 0;
    const colorToSet = options.color != null && String(options.color).trim() !== "" ? String(options.color).trim() : null;
    const optionsToMerge = {};
    for (const entry of entries) {
      const sizeKey = entry.size || entry.sizeKey || "default";
      const qty = entry.quantity ?? entry.qty;
      const entryColor = entry.color != null && String(entry.color).trim() !== "" ? String(entry.color).trim() : colorToSet;
      if (!sizeKey || !qty || qty < 1) continue;
      const cartKey = getCartKey(sizeKey, entryColor);
      const maxForVariant = vi ? (sizeKey in vi ? (Number(vi[sizeKey]) || 0) : 0) : product.inventory;
      if (maxForVariant <= 0) continue;
      const current = cartData[itemIdKey][cartKey] || 0;
      const newQty = Math.min(Math.floor(Number(qty)) || 0, maxForVariant - current);
      if (newQty <= 0) continue;
      cartData[itemIdKey][cartKey] = current + newQty;
      added += newQty;
      if (entryColor) optionsToMerge[cartKey] = { color: entryColor };
    }
    if (Object.keys(optionsToMerge).length > 0) {
      setCartItemOptions((prev) => {
        const next = { ...prev };
        next[itemIdKey] = { ...(next[itemIdKey] || {}), ...optionsToMerge };
        return next;
      });
    }
    if (added === 0) {
      toast.error("No items to add. Check stock for selected options.");
      return;
    }
    setCartItems(cartData);
    toast.success(added === 1 ? "Product added to cart!" : `${added} items added to cart!`);
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
        const rawImages = Array.isArray(p.images) ? p.images : p.image ? [p.image] : [];
        const images = rawImages
          .map((url) => resolveMediaUrl(url))
          .filter(Boolean);
        // Customer pays total_price (price + admin charge); fallback to price
        const customerPrice = p.total_price != null && p.total_price !== "" ? p.total_price : p.price;
        const priceNum = typeof customerPrice === "string" ? parseFloat(customerPrice) : Number(customerPrice) || 0;
        return {
          _id: p._id || p.id,
          name: p.name,
          slug: p.slug,
          description: p.description || "",
          price: priceNum,
          images: images,
          image: images.length > 0 ? images[0] : null,
          category: p.category || "",
          type: p.product_type || p.type || "",
          trending: p.trending || false,
          inventory: p.inventory || 0,
          features: p.features && typeof p.features === "object" ? p.features : {},
          variant_inventory: p.variant_inventory && typeof p.variant_inventory === "object" ? p.variant_inventory : {},
          average_rating: p.average_rating || 0,
          review_count: p.review_count || 0,
        };
      });

      console.log("Mapped products:", mapped);

      setProducts(mapped);
      if (mapped.length === 0) {
        console.warn("No products found. Make sure products are created and marked as active.");
      }
      // Prune cart: remove entries for product IDs that no longer exist in the store
      // (e.g. live store empty or products removed) so cart count and cart state stay in sync
      const validIds = new Set(
        mapped.map((p) => String(p._id != null ? p._id : p.id))
      );
      setCartItems((prev) => {
        if (!prev || typeof prev !== "object" || Array.isArray(prev)) return prev;
        let changed = false;
        const next = {};
        for (const productId in prev) {
          if (validIds.has(String(productId))) {
            next[productId] = prev[productId];
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
      setCartItemOptions((prev) => {
        if (!prev || typeof prev !== "object" || Array.isArray(prev)) return prev;
        let changed = false;
        const next = {};
        for (const productId in prev) {
          if (validIds.has(String(productId))) {
            next[productId] = prev[productId];
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    } catch (err) {
      console.error("Failed to fetch products:", err);
      console.error("Error details:", err.response?.data || err.message);
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
    for (const productId in cartItems) {
      if (!cartItems[productId] || typeof cartItems[productId] !== "object") continue;
      // Only count items for products that exist in the current store (avoids ghost count when store is empty)
      const productExists = products.some(
        (p) => p._id === Number(productId) || p._id === productId || String(p._id) === String(productId)
      );
      if (!productExists) continue;
      for (const item in cartItems[productId]) {
        try {
          const qty = cartItems[productId][item];
          if (qty > 0) total += qty;
        } catch (error) {
          console.debug("getCartCount error", error);
        }
      }
    }
    return total;
  };

  const updateQuantity = async (itemId, cartKeyParam, quantity) => {
    if (quantity < 0) {
      quantity = 0;
    }
    const cartKey = cartKeyParam || "default";
    const { sizeKey } = parseCartKey(cartKey);

    const product = products.find(
      (p) =>
        p._id === Number(itemId) ||
        p._id === itemId ||
        String(p._id) === String(itemId)
    );
    const itemIdKey = String(itemId);
    const vi = product?.variant_inventory && typeof product.variant_inventory === "object" && Object.keys(product.variant_inventory).length > 0
      ? product.variant_inventory
      : null;

    if (product && quantity > 0) {
      const maxForVariant = vi ? (sizeKey in vi ? (Number(vi[sizeKey]) || 0) : 0) : product.inventory;
      if (maxForVariant !== undefined && maxForVariant !== null) {
        if (vi) {
          if (quantity > maxForVariant) {
            toast.warning(`Only ${maxForVariant} in stock for this option. Quantity set to ${maxForVariant}.`);
            quantity = maxForVariant;
          }
        } else {
          let currentCartQuantity = 0;
          if (cartItems[itemIdKey]) {
            Object.values(cartItems[itemIdKey]).forEach((q) => { currentCartQuantity += q; });
          }
          const currentLineQuantity = cartItems[itemIdKey]?.[cartKey] || 0;
          const newTotalQuantity = currentCartQuantity - currentLineQuantity + quantity;
          if (newTotalQuantity > product.inventory) {
            const maxAllowed = product.inventory - (currentCartQuantity - currentLineQuantity);
            if (maxAllowed <= 0) {
              toast.error(`Only ${product.inventory} item(s) available in stock.`);
              quantity = 0;
            } else {
              toast.warning(`Only ${product.inventory} item(s) available. Quantity set to ${maxAllowed}.`);
              quantity = maxAllowed;
            }
          }
        }
      }
    }

    let cartData = structuredClone(cartItems);
    if (!cartData[itemIdKey]) cartData[itemIdKey] = {};

    if (quantity === 0) {
      delete cartData[itemIdKey][cartKey];
      if (Object.keys(cartData[itemIdKey]).length === 0) delete cartData[itemIdKey];
      setCartItemOptions((prev) => {
        if (!prev[itemIdKey] || !prev[itemIdKey][cartKey]) return prev;
        const next = { ...prev };
        next[itemIdKey] = { ...next[itemIdKey] };
        delete next[itemIdKey][cartKey];
        if (Object.keys(next[itemIdKey]).length === 0) delete next[itemIdKey];
        return next;
      });
    } else {
      cartData[itemIdKey][cartKey] = quantity;
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
    setCartItemOptions({});
    localStorage.removeItem("cartItems");
    localStorage.removeItem("cartItemOptions");
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
    cartItemOptions,
    addToCart,
    addToCartBulk,
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
