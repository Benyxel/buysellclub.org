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
    <Link className='group relative bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden' to={`/product/${id}`}>
      <div className='relative overflow-hidden aspect-square'>
        <OptimizedImage 
          className='w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-300' 
          src={Array.isArray(image) ? (image[0] || '') : (image || '')} 
          alt={name}
          loading="lazy"
        />
        <button
          onClick={handleFavorite}
          className={`absolute top-4 right-4 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 
            ${isFavorite(id)
              ? 'bg-red-500 text-white scale-110' 
              : 'bg-white/80 text-gray-600 hover:bg-white hover:text-red-500'
            }`}
        >
          <FaHeart className={`w-5 h-5 transition-transform duration-300 ${isFavorite(id) ? 'animate-pulse' : ''}`} />
        </button>
      </div>
      
      <div className='p-4'>
        <h3 className='text-lg font-semibold text-gray-800 dark:text-white mb-2 line-clamp-2'>{name}</h3>
        
        {/* Description preview */}
        {description && (
          <p className='text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2'>
            {description.length > 80 ? `${description.substring(0, 80)}...` : description}
          </p>
        )}
        
        {/* Rating display */}
        {displayRating > 0 && (
          <div className='flex items-center mb-2'>
            <div className='flex items-center'>
              {[...Array(5)].map((_, index) => (
                <FaStar
                  key={index}
                  className={`w-4 h-4 ${
                    index < Math.round(displayRating)
                      ? 'text-yellow-400'
                      : 'text-gray-300 dark:text-gray-600'
                  }`}
                />
              ))}
            </div>
            <span className='ml-2 text-sm text-gray-600 dark:text-gray-400'>
              {displayRating.toFixed(1)}
              {displayReviewCount > 0 && ` (${displayReviewCount})`}
            </span>
          </div>
        )}

        <p className='text-xl font-bold text-primary dark:text-primary-light'>
          {currency}{typeof price === 'number' ? price.toFixed(2) : price}
        </p>
      </div>
    </Link>
  );
}

export default ProductItem;