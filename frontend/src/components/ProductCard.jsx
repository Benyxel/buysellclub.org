import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { FaHeart, FaShoppingCart } from 'react-icons/fa';
import { ShopContext } from '../context/ShopContext';

const ProductCard = ({ product }) => {
  const { addToCart } = useContext(ShopContext);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    // Check if product is in favorites when component mounts
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    setIsFavorite(favorites.some(fav => fav.id === product.id));
  }, [product.id]);

  const toggleFavorite = () => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    let updatedFavorites;

    if (isFavorite) {
      // Remove from favorites
      updatedFavorites = favorites.filter(fav => fav.id !== product.id);
    } else {
      // Add to favorites with complete product data
      const productToAdd = {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        description: product.description,
        category: product.category,
        slug: product.slug
      };
      updatedFavorites = [...favorites, productToAdd];
    }

    localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
    setIsFavorite(!isFavorite);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <Link to={`/product/${product.slug || product.id}`}>
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-48 object-cover"
        />
      </Link>
      <div className="p-4">
        <Link to={`/product/${product.slug || product.id}`}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {product.name}
          </h3>
        </Link>
        <p className="text-primary font-bold mb-4">
          <span className="text-xs font-normal text-gray-500 dark:text-gray-400 block">Price</span>
          ₵{product.price}
        </p>
        {product.inventory !== undefined && product.inventory <= 0 && (
          <p className="text-red-500 text-sm font-semibold mb-2">Out of Stock</p>
        )}
        {product.inventory !== undefined && product.inventory > 0 && product.inventory <= 5 && (
          <p className="text-orange-500 text-sm font-semibold mb-2">Only {product.inventory} left in stock</p>
        )}
        <div className="flex justify-between items-center">
          <button
            onClick={toggleFavorite}
            className={`p-2 rounded-full transition-colors ${
              isFavorite
                ? 'text-red-500 hover:text-red-600'
                : 'text-gray-400 hover:text-red-500'
            }`}
          >
            <FaHeart className="w-5 h-5" />
          </button>
          <button
            onClick={() => addToCart(product._id || product.id, "default")}
            disabled={product.inventory !== undefined && product.inventory <= 0}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              product.inventory !== undefined && product.inventory <= 0
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary/90'
            }`}
          >
            <FaShoppingCart className="w-4 h-4" />
            {product.inventory !== undefined && product.inventory <= 0
              ? 'Out of Stock'
              : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard; 
