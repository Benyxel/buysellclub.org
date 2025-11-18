import React from 'react'
import bimg1 from '../assets/bimg1.png'



const Banner = ({data}) => {
  return (
    <div className='min-h-[550px] flex justify-center items-center py-12'>
      <div className=' container'>
        <div style={{backgroundColor: data.bgColor}} className='grid grid-cols-1 md:grid-cols-3 gap-6 items-center text-white rounded-2xl'>

        <div className='p-6 sm:p-8'>
           <p className='text-sm'>{data.rate}</p>
           <h1 className='uppercase text-4xl lg:text-7xl font-bold'>{data.title}</h1>
           <p className='text-sm'>{data.date}</p>
        </div>
         
         <div className='h-full flex items-center'>
            <img src={data.image} alt='' className='scale-120 w-[250px] sm:w-[400px]  md:w-[340px] mx-auto drop-shadow-2xl object-cover'/>
         </div>
          
           <div className='flex flex-col justify-center gap-4 p-6 '>
              <p className='font-bold text-xl'>{data.title2}</p>
              <p className='text-3xl sm:text-5xl tracking-wide leading-5 font-bold' >{data.title3}</p>
              <p className=' text-sm tracking-wide leading-5'>{data.title4}</p>
               <div>
            <button className='bg-white text-primary rounded-full py-2 px-4 shadow-2xl font-semibold'>
                  Join Now
            </button>
           </div>
           </div>
          
        </div>
      </div>
    </div>
  )
}

export default Banner
