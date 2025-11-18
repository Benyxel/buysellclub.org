import React from 'react'
import Button from './shared/Button'
import TrackB from './shared/TrackB'
import Buy4meB from './shared/Buy4meB'
import image1 from './../assets/wsi.png'
import image2 from './../assets/tri.png'
import image3 from './../assets/payi.png'



const Category2 = () => {

  return (
    <div className='py-10'>
      <div className='container'>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8'>

          <div className='sm:col-span-2 py-10 pl-5 bg-gradient-to-r from-gray-300 to-gray-100
         text-primary rounded-3xl relative h-[320px] flex items-end'> 
            <div>
              {/* Buy for me card */}
              <div className='mb-4'>
                <p className='mb-[0px] font-bold  text-primary'>Buy Directly From us</p>
                <p className='text-2xl font-semibold mb-[30px]'>Qualitly and Affordable</p>
                <p className='text-4xl xl:text-5xl font-bold opacity-20 mb-10'>Wholesale Prices Wholesale Prices</p>
                
              </div>
            </div>
          
            <img  src={image1}
            className='w-[500px]  absolute bottom-0  mx-10 '
            />
          </div>

          {/* shipping card */}
          <div className=' py-10 pl-5 bg-gradient-to-br  from-brandGreen/90 to-brandGreen/100 text-white rounded-2xl relative h-[320px] flex items-end'> 
            <div>
              {/* Buy for me card */}
              <div className='mb-4'>
                <p className='mb-[0px] font-bold  text-white'>Learn How to import your self</p>
                <p className='text-2xl font-semibold mb-[30px]'>Training</p>
                <p className='text-4xl xl:text-5xl font-bold opacity-20 mb-10'>Mini Importation</p>
               
              </div>
            </div>
            <img  src={image2}
            className='w-320px absolute bottom-0 '
            />
          </div>

          {/* sourcing card */}
          <div className='py-10 pl-5 bg-gradient-to-br from-[#121342] to-[#100435] text-white rounded-2xl relative h-[320px] flex items-end'> 
            <div>
              <div className='mb-4'>
                <p className='mb-[0px] font-bold  text-white'>Need help to pay your suppliers in</p>
                <p className='text-2xl font-semibold mb-[30px]'>China?</p>
                <p className='text-4xl xl:text-5xl font-bold opacity-20 mb-10'>Payment</p>
                
              </div>
            </div>
            <img  src={image3}
            className='w-320px absolute bottom-0'
            />

        </div>
      </div>
    </div>
    </div>
  )
}

export default Category2