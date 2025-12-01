import React, { useContext, useState, useEffect } from 'react';
import { ShopContext } from '../context/ShopContext';
import Title from './Title';
import ProductItem from './ProductItem';

const RelatedProducts = ({ category, subCategory }) => {
    const { products } = useContext(ShopContext);
    const [related, setRelated] = useState([]);

    useEffect(() => {
        if (products.length > 0) {
            let productsCopy = products.slice();
            if (category) {
                productsCopy = productsCopy.filter((item) => category === item.category);
            }
            if (subCategory) {
                productsCopy = productsCopy.filter((item) => subCategory === item.type);
            }
            setRelated(productsCopy.slice(0,5));
        }
    }, [products, category, subCategory]); 

    return (
        <div className="my-16 container mx-auto px-4">
           <div className='text-center text-3xl py-2 mb-6'>
                <Title text1={'RELATED'} text2={'PRODUCTS'}/>
           </div>
           <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4'>
            {related.length > 0 ? (
                related.map((item,index)=>(
                    <ProductItem 
                      key={index} 
                      id={item._id} 
                      name={item.name} 
                      price={item.price} 
                      image={item.image}
                      average_rating={item.average_rating}
                      review_count={item.review_count}
                      description={item.description}
                    />
                ))
            ) : (
                <div className='col-span-full text-center py-8'>
                    <p className='text-gray-500 dark:text-gray-400'>No related products found.</p>
                </div>
            )}
           </div>
        </div>
    );
};

export default RelatedProducts;
