import React, { useContext, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ShopContext } from '../context/ShopContext';
import { FaStar } from "react-icons/fa6";
import { FaShoppingCart } from "react-icons/fa";
import { toast } from '../utils/toast';
import RelatedProducts from './RelatedProducts';
import { getProductReviews, createProductReview } from '../api';

const Product = () => {
  const {productId} = useParams();
  const navigate = useNavigate();
  const { products, currency, addToCart, addToCartBulk } = useContext(ShopContext);
  const [productData, setProductData] = useState(false);
  const [image, setImage] = useState('');
  const [size, setSize] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState({}); // e.g. { Size: "M", Color: "Red" }
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState('');
  // Per-variant quantities when using "size list" UX: { "Size:38": 0, ... }
  const [variantQuantities, setVariantQuantities] = useState({});
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [activeTab, setActiveTab] = useState('description'); // 'description' or 'reviews'
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: '',
    comment: ''
  });
  const [submittingReview, setSubmittingReview] = useState(false);

  // Check if user is logged in
  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
    setIsLoggedIn(!!token);
  }, []);

  const fetchProductData = async () => {
    const product = products.find((item) => {
      return (
        item._id === Number(productId) ||
        item._id === productId ||
        String(item._id) === String(productId)
      );
    });
    
    if (product) {
      setProductData(product);
      const firstImage = Array.isArray(product.image) 
        ? product.image[0] 
        : product.image || (product.images && product.images.length > 0 ? product.images[0] : '');
      setImage(firstImage);
    }
  };

  const fetchReviews = async () => {
    if (!productData) return;
    
    setLoadingReviews(true);
    try {
      const response = await getProductReviews({ 
        product_id: productData._id 
      });
      const reviewsData = response.data.results || response.data || [];
      setReviews(Array.isArray(reviewsData) ? reviewsData : []);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    fetchProductData();
  }, [productId, products]);

  // Build cart variant key from features (e.g. "Size:M|Color:Red") or single size
  const getVariantKey = () => {
    if (!productData) return 'default';
    const features = productData.features && typeof productData.features === 'object' && Object.keys(productData.features).length > 0
      ? productData.features
      : null;
    if (features) {
      const parts = Object.keys(features)
        .sort()
        .map((name) => {
          const val = selectedFeatures[name];
          const opts = features[name];
          const chosen = val && Array.isArray(opts) && opts.includes(val) ? val : (Array.isArray(opts) && opts[0] ? opts[0] : '');
          return chosen ? `${name}:${chosen}` : null;
        })
        .filter(Boolean);
      return parts.length > 0 ? parts.join('|') : 'default';
    }
    return size || 'default';
  };

  const vi = productData?.variant_inventory && typeof productData.variant_inventory === 'object' ? productData.variant_inventory : null;
  const hasVariantInventory = vi && Object.keys(vi).length > 0;

  // Stock for one option (e.g. Size S) = sum of variant_inventory over all keys containing "Size:S"
  const getOptionStock = (featureName, optionValue) => {
    if (!hasVariantInventory) return productData?.inventory ?? 0;
    const part = `${featureName}:${optionValue}`;
    return Object.entries(vi).reduce((sum, [k, q]) => (k && k.includes(part) ? sum + (Number(q) || 0) : sum), 0);
  };

  // Stock for currently selected variant (full combination)
  const getSelectedVariantStock = () => {
    if (!productData) return 0;
    if (hasVariantInventory) {
      const key = getVariantKey();
      return key && key !== 'default' ? (Number(vi[key]) || 0) : 0;
    }
    return productData.inventory !== undefined ? productData.inventory : 99;
  };

  useEffect(() => {
    if (productData) {
      fetchReviews();
    }
  }, [productData]);

  // Initialize selectedFeatures when product has features
  useEffect(() => {
    const features = productData?.features && typeof productData.features === 'object' ? productData.features : null;
    if (features && Object.keys(features).length > 0) {
      const initial = {};
      Object.entries(features).forEach(([name, vals]) => {
        if (Array.isArray(vals) && vals.length > 0) initial[name] = vals[0];
      });
      setSelectedFeatures((prev) => (Object.keys(initial).length ? { ...initial, ...prev } : prev));
    } else {
      setSelectedFeatures({});
    }
  }, [productData?.features, productData?._id]);

  // Variant = size only. Reset per-size quantities and color when product changes.
  const productColors = Array.isArray(productData?.features?.Color) ? productData.features.Color : [];
  const productSizes = Array.isArray(productData?.features?.Size) ? productData.features.Size : [];
  const hasSizeVariant = hasVariantInventory && productSizes.length > 0;
  useEffect(() => {
    if (productData?._id) {
      setVariantQuantities({});
      setSelectedColor('');
    }
  }, [productData?._id]);
  useEffect(() => {
    if (selectedColor && productColors.length > 0 && !productColors.includes(selectedColor)) setSelectedColor('');
  }, [productColors, selectedColor]);

  // Clamp quantity to available inventory (per variant when variant_inventory is used)
  const selectedStock = getSelectedVariantStock();
  useEffect(() => {
    if (!productData) return;
    const max = hasVariantInventory ? selectedStock : (productData.inventory !== undefined ? Math.max(0, productData.inventory) : 99);
    setQuantity((q) => Math.min(Math.max(1, q), max));
  }, [productData, productData?.inventory, hasVariantInventory, selectedStock]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    if (!isLoggedIn) {
      toast.error('Please login to submit a review');
      navigate('/Login');
      return;
    }

    if (!reviewForm.comment.trim()) {
      toast.error('Please enter a review comment');
      return;
    }

    setSubmittingReview(true);
    try {
      await createProductReview({
        product: productData._id,
        rating: reviewForm.rating,
        title: reviewForm.title,
        comment: reviewForm.comment
      });
      
      toast.success('Review submitted successfully!');
      setReviewForm({ rating: 5, title: '', comment: '' });
      setShowReviewForm(false);
      fetchReviews(); // Refresh reviews
    } catch (error) {
      console.error('Failed to submit review:', error);
      toast.error(error.response?.data?.detail || 'Failed to submit review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const renderStars = (rating, size = 'text-lg') => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <FaStar
            key={star}
            className={`${size} ${
              star <= rating ? 'text-[#ff5e00]' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const averageRating = productData?.average_rating || 0;
  const reviewCount = productData?.review_count || 0;

  return productData ? (
    <div className='container pb-4 border-t-2 pt-10 transition-opacity ease-in duration-500 opacity-100'>
      {/* product data */}
      <div className='flex gap-12 sm:gap-12 flex-col sm:flex-row'>
        {/* product images */}
        <div className='flex-1 flex flex-col-reverse gap-3 sm:flex-row p-5 rounded-md bg-brandWhite'>
          <div className='flex sm:flex-col overflow-x-auto sm:overflow-y-scroll justify-between sm:justify-normal sm:w-[18.7%] w-full'>
            {productData.images && productData.images.length > 0 ? (
              productData.images.map((item, index) => (
                <img
                  onClick={() => setImage(item)}
                  src={item}
                  key={index}
                  className="w-[24%] sm:w-full sm:mb-3 flex-shrink-0 cursor-pointer rounded-md"
                  alt={`${productData.name} - Image ${index + 1}`}
                />
              ))
            ) : productData.image ? (
              <img
                onClick={() => setImage(productData.image)}
                src={productData.image}
                className="w-[24%] sm:w-full sm:mb-3 flex-shrink-0 cursor-pointer rounded-md"
                alt={productData.name}
              />
            ) : (
              <p className="text-gray-500">No images available</p>
            )}
          </div>

          <div className='w-full sm:-[80%]'>
            <img className='w-full h-auto rounded-2xl' src={image} alt={productData.name} />
          </div>
        </div>

        {/* products info */}
        <div className='flex-1'>
          <h1 className='font-medium text-2xl mt-2'>{productData.name}</h1>
          
          {/* Rating display */}
          <div className='flex items-center gap-2 mt-2'>
            {renderStars(Math.round(averageRating))}
            <span className='text-sm text-gray-600'>
              {averageRating > 0 ? averageRating.toFixed(1) : 'No ratings yet'}
            </span>
            <span className='text-sm text-gray-500'>
              ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
            </span>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Price</p>
          <p className='mt-1 text-3xl font-medium'>{currency}{productData.price}</p>
          
          {/* Colors: display-only list. Variant = size only (select sizes + qty per size). */}
          {productData.features && typeof productData.features === 'object' && Object.keys(productData.features).length > 0 ? (
            <div className='flex flex-col gap-4 my-8'>
              {/* Let user select a color (stored with cart for display; inventory is size-only) */}
              {productColors.length > 0 && (
                <div className='flex flex-col gap-2'>
                  <p className='text-sm font-medium text-gray-700 dark:text-gray-300'>Select color</p>
                  <div className='flex flex-wrap gap-2'>
                    {productColors.map((c) => (
                      <button
                        key={c}
                        type='button'
                        onClick={() => setSelectedColor((prev) => (prev === c ? '' : c))}
                        className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                          selectedColor === c
                            ? 'bg-brandBlue text-white border-brandBlue'
                            : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Size variant: list sizes with stock + quantity per size (variant key = Size:X only) */}
              {hasSizeVariant ? (
                <div className='flex flex-col gap-2'>
                  <p className='text-sm font-medium text-gray-700 dark:text-gray-300'>Size</p>
                  <div className='border border-gray-200 dark:border-gray-600 rounded-lg divide-y divide-gray-200 dark:divide-gray-600'>
                    {productSizes.map((sizeVal) => {
                      const variantKey = `Size:${sizeVal}`;
                      const stock = Number(vi[variantKey]) || 0;
                      const qty = variantQuantities[variantKey] ?? 0;
                      const outOfStock = stock <= 0;
                      return (
                        <div
                          key={sizeVal}
                          className={`flex items-center justify-between gap-4 px-4 py-3 ${outOfStock ? 'bg-gray-50 dark:bg-gray-800/50 opacity-70' : 'bg-white dark:bg-gray-800'}`}
                        >
                          <div className='flex items-center gap-2'>
                            <span className='font-medium text-gray-900 dark:text-gray-100'>{sizeVal}</span>
                            <span className='text-xs text-gray-500 dark:text-gray-400'>
                              {outOfStock ? 'Out of stock' : `Stock: ${stock}`}
                            </span>
                          </div>
                          <div className='flex items-center gap-1'>
                            <button
                              type='button'
                              onClick={() => setVariantQuantities((prev) => ({ ...prev, [variantKey]: Math.max(0, (prev[variantKey] ?? 0) - 1) }))}
                              disabled={outOfStock || qty <= 0}
                              className='w-8 h-8 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed'
                            >
                              −
                            </button>
                            <input
                              type='number'
                              min={0}
                              max={stock}
                              value={qty}
                              onChange={(e) => {
                                const v = Math.max(0, Math.min(stock, parseInt(e.target.value, 10) || 0));
                                setVariantQuantities((prev) => ({ ...prev, [variantKey]: v }));
                              }}
                              className='w-14 text-center border border-gray-300 dark:border-gray-600 rounded py-1.5 bg-white dark:bg-gray-200 text-gray-900 dark:text-gray-900'
                            />
                            <button
                              type='button'
                              onClick={() => setVariantQuantities((prev) => ({ ...prev, [variantKey]: Math.min(stock, (prev[variantKey] ?? 0) + 1) }))}
                              disabled={outOfStock || qty >= stock}
                              className='w-8 h-8 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed'
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    Selected: <strong>{Object.values(variantQuantities).reduce((s, n) => s + (n || 0), 0)}</strong> item(s)
                  </p>
                </div>
              ) : (
                <>
                  {Object.entries(productData.features).map(([featureName, values]) => {
                    const opts = Array.isArray(values) ? values : [];
                    if (opts.length === 0) return null;
                    const current = selectedFeatures[featureName] ?? opts[0];
                    return (
                      <div key={featureName} className='flex flex-col gap-2'>
                        <p className='text-sm font-medium text-gray-700 dark:text-gray-300'>Select {featureName}</p>
                        <div className='flex flex-wrap gap-2'>
                          {opts.map((val) => {
                            const stock = hasVariantInventory ? getOptionStock(featureName, val) : (productData.inventory ?? 0);
                            const outOfStock = hasVariantInventory && stock <= 0;
                            return (
                              <button
                                type='button'
                                onClick={() => !outOfStock && setSelectedFeatures((prev) => ({ ...prev, [featureName]: val }))}
                                disabled={outOfStock}
                                className={`border py-2 px-4 rounded transition-colors ${
                                  outOfStock
                                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed border-gray-200 dark:border-gray-600 line-through'
                                    : current === val
                                      ? 'bg-brandBlue text-white border-brandBlue'
                                      : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-brandBlue/10 dark:hover:bg-gray-600'
                                }`}
                                key={val}
                                title={outOfStock ? 'Out of stock' : hasVariantInventory ? `${stock} in stock` : undefined}
                              >
                                {val}
                                {hasVariantInventory && !outOfStock && <span className='ml-1.5 text-xs opacity-90'>({stock})</span>}
                                {outOfStock && <span className='ml-1.5 text-xs'>Out of stock</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {hasVariantInventory && (
                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                      Selected: {getVariantKey().replace(/\|/g, ' • ').replace(/:/g, ': ')} — <strong>{selectedStock}</strong> in stock
                    </p>
                  )}
                </>
              )}
            </div>
          ) : productData.sizes && productData.sizes.length > 0 ? (
            <div className='flex flex-col gap-4 my-8'>
              <p className='text-sm font-medium text-gray-700 dark:text-gray-300'>Select Size / Option</p>
              <div className='flex gap-2'>
                {productData.sizes.map((item, index) => (
                  <button
                    type='button'
                    onClick={() => setSize(item)}
                    className={`border py-2 px-4 rounded transition-colors ${
                      item === size ? 'bg-brandBlue text-white border-brandBlue' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-brandBlue/10'
                    }`}
                    key={index}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className='my-8'>
              <p className='text-sm text-gray-500'>Available in standard option</p>
            </div>
          )}

          {/* Quantity - only when not using size-only variant list */}
          {!hasSizeVariant && (
            <div className='my-8'>
              <p className='text-sm text-gray-500 dark:text-gray-400 mb-2'>Quantity {hasVariantInventory && selectedStock > 0 && <span className='text-gray-600 dark:text-gray-300'>(max {selectedStock})</span>}</p>
              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className='w-10 h-10 border rounded bg-brandBlue text-white hover:bg-brandYellow disabled:opacity-50 disabled:cursor-not-allowed'
                  disabled={quantity <= 1 || selectedStock <= 0}
                >
                  −
                </button>
                <input
                  type='number'
                  min={1}
                  max={selectedStock > 0 ? selectedStock : 99}
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (Number.isNaN(val)) return;
                    const max = selectedStock > 0 ? selectedStock : 99;
                    setQuantity(Math.min(Math.max(1, val), max));
                  }}
                  className='w-16 text-center border border-gray-300 dark:border-gray-600 py-2 rounded bg-white dark:bg-gray-200 text-gray-900 dark:text-gray-900'
                />
                <button
                  type='button'
                  onClick={() => {
                    const max = selectedStock > 0 ? selectedStock : 99;
                    setQuantity((q) => Math.min(q + 1, max));
                  }}
                  className='w-10 h-10 border rounded bg-brandBlue text-white hover:bg-brandYellow disabled:opacity-50 disabled:cursor-not-allowed'
                  disabled={quantity >= selectedStock || selectedStock <= 0}
                >
                  +
                </button>
              </div>
            </div>
          )}
          
          {/* Stock status - when not using size variant list */}
          {!hasSizeVariant && selectedStock <= 0 && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-red-600 dark:text-red-400 font-semibold">Out of Stock</p>
              <p className="text-red-500 dark:text-red-500 text-sm mt-1">{hasVariantInventory ? 'This option is currently unavailable.' : 'This product is currently unavailable.'}</p>
            </div>
          )}
          {!hasSizeVariant && selectedStock > 0 && selectedStock <= 5 && (
            <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <p className="text-orange-600 dark:text-orange-400 font-semibold">Low Stock</p>
              <p className="text-orange-500 dark:text-orange-500 text-sm mt-1">Only {selectedStock} item(s) left for this option.</p>
            </div>
          )}

          {/* cart-btn and buy now */}
          <div className='flex flex-wrap gap-4'>
            {hasSizeVariant ? (
              <>
                <button
                  onClick={() => {
                    const entries = Object.entries(variantQuantities)
                      .filter(([, q]) => q > 0)
                      .map(([sizeKey, q]) => ({ size: sizeKey, quantity: q }));
                    addToCartBulk(productData._id, entries, { color: selectedColor || undefined });
                  }}
                  disabled={Object.values(variantQuantities).every((q) => !q || q <= 0)}
                  className='p-3 rounded-xl transition-all duration-200 text-primary hover:bg-primary/10 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
                  title='Add selected items to cart'
                  aria-label='Add to cart'
                >
                  <FaShoppingCart className="w-8 h-8" />
                </button>
                <button
                  onClick={() => {
                    const entries = Object.entries(variantQuantities)
                      .filter(([, q]) => q > 0)
                      .map(([sizeKey, q]) => ({ size: sizeKey, quantity: q }));
                    addToCartBulk(productData._id, entries, { color: selectedColor || undefined });
                    navigate('/checkout');
                  }}
                  disabled={Object.values(variantQuantities).every((q) => !q || q <= 0)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all duration-200 ${
                    Object.values(variantQuantities).some((q) => q > 0)
                      ? 'bg-brandBlue text-white shadow hover:shadow-md hover:opacity-90 active:opacity-95'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                  }`}
                >
                  Buy now
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => addToCart(productData._id, getVariantKey(), quantity, { color: selectedColor || undefined })}
                  className={`p-3 rounded-xl transition-all duration-200 ${
                    selectedStock <= 0 ? 'text-gray-400 cursor-not-allowed' : 'text-primary hover:bg-primary/10 hover:scale-110 active:scale-95'
                  }`}
                  disabled={selectedStock <= 0}
                  title={selectedStock <= 0 ? 'Out of stock' : 'Add to cart'}
                  aria-label={selectedStock <= 0 ? 'Out of stock' : 'Add to cart'}
                >
                  <FaShoppingCart className="w-8 h-8" />
                </button>
                <button
                  onClick={() => {
                    addToCart(productData._id, getVariantKey(), quantity, { color: selectedColor || undefined });
                    navigate('/checkout');
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all duration-200 ${
                    selectedStock <= 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' : 'bg-brandBlue text-white shadow hover:shadow-md hover:opacity-90 active:opacity-95'
                  }`}
                  disabled={selectedStock <= 0}
                >
                  {selectedStock <= 0 ? 'Out of stock' : 'Buy now'}
                </button>
              </>
            )}
          </div>
          
          <hr className='mt-8 sn:w-4/5' />
          <div className='text-sm text-gray-500 mt-5 flex flex-col gap-1'>
            <p>100% Original Product.</p>
            <p>Fast Delivery within 24hrs.</p>
            <p>Easy return and exchange policy within 2 days.</p>
          </div>
        </div>
      </div>

      {/* Description and Reviews Tabs */}
      <div className='mt-20'>
        <div className='flex border-b'>
          <button
            onClick={() => setActiveTab('description')}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'description'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Description
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'reviews'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Reviews ({reviewCount})
          </button>
        </div>

        {/* Description Tab Content */}
        {activeTab === 'description' && (
          <div className='border px-6 py-6 text-sm text-gray-700 whitespace-pre-wrap'>
            {productData.description || (
              <p className='text-gray-500 italic'>No description available for this product.</p>
            )}
          </div>
        )}

        {/* Reviews Tab Content */}
        {activeTab === 'reviews' && (
          <div className='border px-6 py-6'>
            {/* Write Review Button */}
            {isLoggedIn && (
              <div className='mb-6'>
                {!showReviewForm ? (
                  <button
                    onClick={() => setShowReviewForm(true)}
                    className='bg-primary text-white px-6 py-2 rounded hover:bg-primary-dark transition-colors'
                  >
                    Write a Review
                  </button>
                ) : (
                  <form onSubmit={handleSubmitReview} className='bg-gray-50 p-6 rounded-lg'>
                    <h3 className='text-lg font-semibold mb-4'>Write Your Review</h3>
                    
                    {/* Rating Selection */}
                    <div className='mb-4'>
                      <label className='block text-sm font-medium mb-2'>Rating</label>
                      <div className='flex items-center gap-2'>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                            className='focus:outline-none'
                          >
                            <FaStar
                              className={`text-2xl ${
                                star <= reviewForm.rating
                                  ? 'text-[#ff5e00]'
                                  : 'text-gray-300'
                              } hover:text-[#ff5e00] transition-colors`}
                            />
                          </button>
                        ))}
                        <span className='ml-2 text-sm text-gray-600'>
                          {reviewForm.rating} {reviewForm.rating === 1 ? 'star' : 'stars'}
                        </span>
                      </div>
                    </div>

                    {/* Review Title */}
                    <div className='mb-4'>
                      <label className='block text-sm font-medium mb-2'>Title (Optional)</label>
                      <input
                        type="text"
                        value={reviewForm.title}
                        onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                        className='w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary text-black bg-white dark:bg-gray-100'
                        placeholder='Give your review a title'
                      />
                    </div>

                    {/* Review Comment */}
                    <div className='mb-4'>
                      <label className='block text-sm font-medium mb-2'>
                        Your Review <span className='text-red-500'>*</span>
                      </label>
                      <textarea
                        value={reviewForm.comment}
                        onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                        rows={4}
                        className='w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary text-black bg-white dark:bg-gray-100'
                        placeholder='Share your experience with this product...'
                        required
                      />
                    </div>

                    {/* Form Actions */}
                    <div className='flex gap-3'>
                      <button
                        type="submit"
                        disabled={submittingReview}
                        className='bg-primary text-white px-6 py-2 rounded hover:bg-primary-dark transition-colors disabled:opacity-50'
                      >
                        {submittingReview ? 'Submitting...' : 'Submit Review'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowReviewForm(false);
                          setReviewForm({ rating: 5, title: '', comment: '' });
                        }}
                        className='bg-gray-200 text-gray-700 px-6 py-2 rounded hover:bg-gray-300 transition-colors'
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Reviews List */}
            {loadingReviews ? (
              <div className='text-center py-8'>
                <p className='text-gray-500'>Loading reviews...</p>
              </div>
            ) : reviews.length > 0 ? (
              <div className='space-y-6'>
                {reviews.map((review) => (
                  <div key={review.id} className='border-b pb-6 last:border-b-0'>
                    <div className='flex items-start justify-between mb-2'>
                      <div>
                        <h4 className='font-semibold text-gray-900'>
                          {review.user_name || 'Anonymous'}
                        </h4>
                        <div className='flex items-center gap-2 mt-1'>
                          {renderStars(review.rating, 'text-sm')}
                          <span className='text-xs text-gray-500'>
                            {new Date(review.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    {review.title && (
                      <h5 className='font-medium text-gray-800 mt-2 mb-1'>{review.title}</h5>
                    )}
                    <p className='text-gray-700 mt-2'>{review.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className='text-center py-8'>
                <p className='text-gray-500'>
                  {isLoggedIn
                    ? 'No reviews yet. Be the first to review this product!'
                    : 'No reviews yet. Login to write the first review!'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RELATED PRODUCTS */}
      <RelatedProducts category={productData.category} subCategory={productData.type} />
    </div>
  ) : (
    <div className='opacity-0'></div>
  );
};

export default Product;
