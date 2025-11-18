import React, { useContext, useEffect, useState } from 'react'
import { ShopContext } from '../context/ShopContext'
import Title from './Title';
import ProductItem from './ProductItem';

const TrendingP = () => {

    const {products}= useContext(ShopContext)
    const [trending, setTrending] = useState([]);

    useEffect(()=>{
        const trending = products.filter((item)=>(item.trending));

        setTrending(trending.slice(0,5))
    },[products])

   

  return (
    <div className=' container my-10' >
      <div className='text-center text-3xl py-8'>
        <Title text1={"TRENDING"} text2={"PRODUCTS"}/>
        <p className='w-3/4 m-auto text-xs sm:text-sm md:text-base text-gray-600'>
            Looking for the most Trending products in Ghana to sell?
        </p>
      </div>

      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 gap-y-6'>
        {
            trending.map((item,index)=>(
                <ProductItem 
                  key={index} 
                  id={item._id} 
                  image={item.image} 
                  name={item.name} 
                  price={item.price}
                  average_rating={item.average_rating}
                  review_count={item.review_count}
                  description={item.description}
                />
            ))}
        
      </div>
    </div>
  )
}

export default TrendingP
