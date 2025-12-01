import React, { useContext, useEffect, useState } from 'react';
import { ShopContext } from '../context/ShopContext';
import { IoMdArrowDropdown } from "react-icons/io";
import { FaFilter, FaTimes } from "react-icons/fa";
import Title from '../components/Title';
import ProductItem from '../components/ProductItem';
import { getCategories, getProductTypes } from '../api';

const Shop = () => {

  const { products, search, showSearch } = useContext(ShopContext);

  const [filterProducts, setFilterProducts] = useState([]);
  const [category, setCategory] = useState([]);
  const [subCategory, setSubCategory] = useState([]);
  const [showFilter, setShowFilter] = useState(false);
  const [sortType, setSortType] = useState('relavent');
  const [showTrending, setShowTrending] = useState(false); // State for trending products
  const [categories, setCategories] = useState([]); // Categories from API
  const [productTypes, setProductTypes] = useState([]); // Product types from API
  const [loadingFilters, setLoadingFilters] = useState(true);

  const toggleCategory = (e) => {
    if (category.includes(e.target.value)) {
      setCategory((prev) => prev.filter((item) => item !== e.target.value));
    } else {
      setCategory((prev) => [...prev, e.target.value]);
    }
  };

  const toggleSubCategory = (e) => {
    const value = e.target.value;
    if (subCategory.includes(value)) {
      setSubCategory((prev) => prev.filter((item) => item !== value));
    } else {
      setSubCategory((prev) => [...prev, value]);
    }
  };

  const applyFilter = () => {
    // Ensure products is an array
    if (!Array.isArray(products) || products.length === 0) {
      setFilterProducts([]);
      return;
    }

    let productsCopy = products.slice();

    if (showSearch && search) {
      productsCopy = productsCopy.filter(item => item.name.toLowerCase().includes(search.toLowerCase()));
    }

    if (category.length > 0) {
      productsCopy = productsCopy.filter(item => category.includes(item.category));
    }

    if (subCategory.length > 0) {
      productsCopy = productsCopy.filter(item => subCategory.includes(item.type));
    }

    if (showTrending) {
      productsCopy = productsCopy.filter(item => item.trending); // Filter trending products
    }

    setFilterProducts(productsCopy);
  };

  const sortProduct = async () => {
    let fpCopy = filterProducts.slice();

    switch (sortType) {
      case 'low-high':
        setFilterProducts(fpCopy.sort((a, b) => (a.price - b.price)));
        break;

      case 'high-low':
        setFilterProducts(fpCopy.sort((a, b) => (b.price - a.price)));
        break;

      default:
        applyFilter();
        break;
    }
  };

  useEffect(() => {
    applyFilter();
  }, [category, subCategory, search, showSearch, showTrending, products]); // Add products to dependencies

  useEffect(() => {
    sortProduct();
  }, [sortType]);

  const clearFilters = () => {
    setCategory([]);
    setSubCategory([]);
    setShowTrending(false);
    setSortType('relavent');
    applyFilter();
  };

  // Fetch categories and product types from API
  useEffect(() => {
    const loadFilters = async () => {
      setLoadingFilters(true);
      try {
        // Fetch categories
        const categoriesResp = await getCategories();
        const categoriesData = Array.isArray(categoriesResp.data) 
          ? categoriesResp.data 
          : (categoriesResp.data?.results || []);
        // Only show active categories
        setCategories(categoriesData.filter(cat => cat.is_active));

        // Fetch product types
        const typesResp = await getProductTypes();
        const typesData = Array.isArray(typesResp.data) 
          ? typesResp.data 
          : (typesResp.data?.results || []);
        // Only show active product types
        setProductTypes(typesData.filter(type => type.is_active));
      } catch (err) {
        console.error("Failed to load categories/types:", err);
        // Set empty arrays on error
        setCategories([]);
        setProductTypes([]);
      } finally {
        setLoadingFilters(false);
      }
    };

    loadFilters();
  }, []);

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='flex flex-col lg:flex-row gap-8'>
        {/* Filters Section */}
        <div className={`lg:w-64 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-all duration-300 ${showFilter ? 'block' : 'hidden lg:block'}`}>
          <div className='flex items-center justify-between mb-6'>
            <div className='flex items-center gap-2'>
              <FaFilter className='text-primary text-xl' />
              <h2 className='text-xl font-bold text-gray-800 dark:text-white'>Filters</h2>
            </div>
            {(category.length > 0 || subCategory.length > 0 || showTrending) && (
              <button 
                onClick={clearFilters}
                className='text-sm text-gray-500 hover:text-primary flex items-center gap-1'
              >
                <FaTimes className='text-xs' />
                Clear All
              </button>
            )}
          </div>

          {/* Categories */}
          <div className='mb-6'>
            <h3 className='text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3'>Categories</h3>
            {loadingFilters ? (
              <div className='text-sm text-gray-500 dark:text-gray-400'>Loading categories...</div>
            ) : categories.length === 0 ? (
              <div className='text-sm text-gray-500 dark:text-gray-400'>No categories available</div>
            ) : (
            <div className='space-y-2'>
                {categories.map((cat) => (
                  <label key={cat.id || cat.slug} className='flex items-center gap-2 cursor-pointer group'>
                  <input
                    type='checkbox'
                      value={cat.name}
                      checked={category.includes(cat.name)}
                    onChange={toggleCategory}
                    className='w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary'
                  />
                  <span className='text-sm text-gray-600 dark:text-gray-400 group-hover:text-primary transition-colors'>
                      {cat.name}
                  </span>
                </label>
              ))}
            </div>
            )}
          </div>

          {/* Types */}
          <div className='mb-6'>
            <h3 className='text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3'>Types</h3>
            {loadingFilters ? (
              <div className='text-sm text-gray-500 dark:text-gray-400'>Loading types...</div>
            ) : productTypes.length === 0 ? (
              <div className='text-sm text-gray-500 dark:text-gray-400'>No product types available</div>
            ) : (
            <div className='space-y-2'>
                {productTypes.map((type) => (
                  <label key={type.id || type.slug} className='flex items-center gap-2 cursor-pointer group'>
                  <input
                    type='checkbox'
                      value={type.name}
                      checked={subCategory.includes(type.name)}
                    onChange={toggleSubCategory}
                    className='w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary'
                  />
                  <span className='text-sm text-gray-600 dark:text-gray-400 group-hover:text-primary transition-colors'>
                      {type.name}
                  </span>
                </label>
              ))}
            </div>
            )}
          </div>

          {/* Trending Toggle */}
          <div className='mb-6'>
            <label className='flex items-center gap-2 cursor-pointer group'>
              <input
                type='checkbox'
                checked={showTrending}
                onChange={() => setShowTrending(!showTrending)}
                className='w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary'
              />
              <span className='text-sm text-gray-600 dark:text-gray-400 group-hover:text-primary transition-colors'>
                Show Trending Products
              </span>
            </label>
          </div>
        </div>

        {/* Products Section */}
        <div className='flex-1'>
          <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6'>
            <div className='flex items-center gap-2'>
              <Title text1={'ALL'} text2={'PRODUCTS'} />
            </div>

            <div className='flex items-center gap-4'>
              <select
                className='px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-primary focus:border-primary'
                value={sortType}
                onChange={(e) => setSortType(e.target.value)}
              >
                <option value='relavent'>Sort by: Relevant</option>
                <option value='low-high'>Sort by: Low to High</option>
                <option value='high-low'>Sort by: High to Low</option>
              </select>

              <button
                className='lg:hidden px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm flex items-center gap-2'
                onClick={() => setShowFilter(!showFilter)}
              >
                <FaFilter className='text-primary' />
                Filters
              </button>
            </div>
          </div>

          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4'>
            {products.length === 0 ? (
              <div className='col-span-full text-center py-12'>
                <p className='text-gray-500 dark:text-gray-400'>Loading products...</p>
              </div>
            ) : filterProducts.length > 0 ? (
              filterProducts.map((item, index) => (
                <ProductItem 
                  key={item._id || index} 
                  id={item._id} 
                  image={item.image} 
                  name={item.name} 
                  price={item.price}
                  average_rating={item.average_rating}
                  review_count={item.review_count}
                  description={item.description}
                />
              ))
            ) : (
              <div className='col-span-full text-center py-12'>
                <p className='text-gray-500 dark:text-gray-400'>
                  No products match your search or filters. 
                  {products.length > 0 && (
                    <span className='block mt-2 text-sm'>
                      Showing {products.length} total product{products.length !== 1 ? 's' : ''} available.
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shop;
