import React, { useContext } from 'react';
import { ShopContext } from '../context/ShopContext';
import { Link } from 'react-router-dom';
import { FaStar, FaHeart } from 'react-icons/fa';
import OptimizedImage from './OptimizedImage';

const ProductItem = ({ id, image, name, price, rating, average_rating, review_count, description }) => {
  const { currency, toggleFavorite, isFavorite } = useContext(ShopContext);
  
  // Use average_rating if provided, otherwise fall back to rating prop or 0
  const displayRating = average_rating || rating || 0;
  const displayReviewCount = review_count || 0;

  const handleFavorite = (e) => {
    e.preventDefault(); // Prevent navigation when clicking the favorite button
    toggleFavorite(id);
  };

  return (
    <Link 
      className='group relative bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-lg border border-gray-200 dark:border-gray-700 transition-all duration-200 overflow-hidden flex flex-col h-full' 
      to={`/product/${id}`}
    >
      {/* Image Container */}
      <div className='relative overflow-hidden bg-gray-100 dark:bg-gray-700' style={{ aspectRatio: '4/3' }}>
        <OptimizedImage 
          className='w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300' 
          src={Array.isArray(image) ? (image[0] || '') : (image || '')} 
          alt={name}
          loading="lazy"
        />
        {/* Favorite Button */}
        <button
          onClick={handleFavorite}
          className={`absolute top-2 right-2 p-1.5 rounded-full transition-all duration-200 z-10
            ${isFavorite(id)
              ? 'bg-red-500 text-white opacity-100' 
              : 'bg-white/90 dark:bg-gray-800/90 text-gray-600 hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100'
            }`}
        >
          <FaHeart className={`w-3.5 h-3.5 ${isFavorite(id) ? 'fill-current' : ''}`} />
        </button>
      </div>
      
      {/* Product Info */}
      <div className='p-3 flex flex-col flex-grow'>
        {/* Product Name */}
        <h3 className='text-sm font-medium text-gray-900 dark:text-white mb-1.5 line-clamp-2 min-h-[2.5rem] leading-tight'>
          {name}
        </h3>
        
        {/* Rating */}
        {displayRating > 0 && (
          <div className='flex items-center gap-1 mb-2'>
            <div className='flex items-center'>
              {[...Array(5)].map((_, index) => (
                <FaStar
                  key={index}
                  className={`w-3 h-3 ${
                    index < Math.round(displayRating)
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-300 dark:text-gray-600'
                  }`}
                />
              ))}
            </div>
            {displayReviewCount > 0 && (
              <span className='text-xs text-gray-500 dark:text-gray-400 ml-0.5'>
                ({displayReviewCount})
              </span>
            )}
          </div>
        )}

        {/* Price */}
        <div className='mt-auto pt-2'>
          <p className='text-lg font-bold text-primary dark:text-primary-light'>
            {currency}{typeof price === 'number' ? price.toFixed(2) : price}
          </p>
        </div>
      </div>
    </Link>
  );
}

export default ProductItem;