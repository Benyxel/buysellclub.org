import React, { useContext } from 'react';
import { ShopContext } from '../context/ShopContext';
import ProductItem from '../components/ProductItem';
import { FaHeart } from 'react-icons/fa';

const Favorites = () => {
  const { products, favorites,  } = useContext(ShopContext);

  const favoriteProducts = products.filter(product => favorites.includes(product._id));

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='flex items-center gap-2 mb-8'>
        <FaHeart className='text-red-500 text-2xl' />
        <h1 className='text-2xl font-bold text-gray-800 dark:text-white'>My Favorites</h1>
      </div>

      {favoriteProducts.length === 0 ? (
        <div className='text-center py-12'>
          <FaHeart className='text-gray-400 text-6xl mx-auto mb-4' />
          <h2 className='text-xl text-gray-600 dark:text-gray-400 mb-2'>No favorites yet</h2>
          <p className='text-gray-500 dark:text-gray-500'>Start adding products to your favorites!</p>
        </div>
      ) : (
        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6'>
          {favoriteProducts.map((product) => (
            <ProductItem
              key={product._id}
              id={product._id}
              image={product.image}
              name={product.name}
              price={product.price}
              rating={4.5}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Favorites; 