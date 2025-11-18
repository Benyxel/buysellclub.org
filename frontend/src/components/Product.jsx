import React, { useContext, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ShopContext } from '../context/ShopContext';
import { FaStar } from "react-icons/fa6";
import { toast } from 'react-toastify';
import RelatedProducts from './RelatedProducts';
import { getProductReviews, createProductReview } from '../api';

const Product = () => {
  const {productId} = useParams();
  const navigate = useNavigate();
  const {products, currency, addToCart} = useContext(ShopContext);
  const [productData, setProductData] = useState(false);
  const [image, setImage] = useState('');
  const [size, setSize] = useState('');
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

  useEffect(() => {
    if (productData) {
      fetchReviews();
    }
  }, [productData]);

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

          <p className='mt-5 text-3xl font-medium'>{currency}{productData.price}</p>
          
          {/* Description preview */}
          {productData.description && (
            <p className='mt-7 text-gray-700 line-clamp-3'>
              {productData.description.length > 150 
                ? `${productData.description.substring(0, 150)}...` 
                : productData.description}
            </p>
          )}
          
          {/* Size/Color selection */}
          {productData.sizes && productData.sizes.length > 0 ? (
            <div className='flex flex-col gap-4 my-8'>
              <p>Select Size/ Color</p>
              <div className='flex gap-2'>
                {productData.sizes.map((item, index) => (
                  <button
                    onClick={() => setSize(item)}
                    className={`border py-2 px-4 bg-brandBlue text-white rounded hover:bg-brandYellow ${
                      item === size ? 'bg-brandYellow' : ''
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
              <p className='text-sm text-gray-500'>Available in standard size</p>
            </div>
          )}
          
          {/* cart-btn */}
          <button
            onClick={() => addToCart(productData._id, size || "default")}
            className='bg-brandGreen text-white px-8 py-3 text-sm active:bg-gray-700'
            disabled={productData.inventory !== undefined && productData.inventory <= 0}
          >
            {productData.inventory !== undefined && productData.inventory <= 0
              ? 'OUT OF STOCK'
              : 'ADD TO CART'}
          </button>
          
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
                        className='w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary'
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
                        className='w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary'
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
