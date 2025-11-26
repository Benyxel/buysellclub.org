import React from 'react'
import Button from './shared/Button'
import TrackB from './shared/TrackB'
import Buy4meB from './shared/Buy4meB'
import image1 from './../assets/bm4.png'
import image2 from './../assets/sh1.png'
import image3 from '../assets/sen.png'
import { Link } from 'react-router-dom'

const Category = () => {

  return (
    <div className='py-10 relative z-0'>
      <div className='container'>
        <div className=' grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8'>

          <div className=' py-10 pl-5 bg-gradient-to-br from-black/90 to-black/70 text-white rounded-2xl relative h-[320px] flex items-end grid-cols-1 z-0 overflow-hidden'> 
            <div>
              {/* Buy for me card */}
              <div className='mb-4'>
                <p className='mb-[0px] font-bold  text-gray-400'>Need help to order from</p>
                <p className='text-2xl font-semibold mb-[30px]'>China?</p>
                <p className='text-4xl xl:text-5xl font-bold opacity-20 mb-10'>Buy for me Service</p>
                <Link to={'/Buy4me'}
                >
                <Buy4meB 
                
                text='Buy4me'
                bgColor={"bg-white"}
                textColor={"text-white"} 
                />
                </Link>
              </div>
            </div>
          
            <img  src={image1}
            className='w-320px absolute bottom-0'
            />
            {/* Mobile bottom gradient to blend image */}
            <div className='absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/90 via-black/70 to-transparent pointer-events-none'></div>
          </div>

          {/* shipping card */}
          <div className=' py-10 pl-5 bg-gradient-to-br from-[#210202] to-[#9e0e2b] text-white rounded-2xl relative h-[320px] flex items-end z-0 overflow-hidden'> 
            <div>
              {/* Buy for me card */}
              <div className='mb-4'>
                <p className='mb-[0px] font-bold  text-gray-400'>Shipping to ship from china to</p>
                <p className='text-2xl font-semibold mb-[30px]'>Ghana</p>
                <p className='text-4xl xl:text-5xl font-bold opacity-20 mb-10'>Shipping to GH</p>
                <Link to={'/Shipping'}> 
                <TrackB 
                text='Track your Order' 
                bgColor={"bg-white"}
                textColor={"text-white"}
                />
                </Link>
              </div>
            </div>
            <img  src={image2}
            className='w-320px absolute bottom-0 mx-10'
            />
            <div className='absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#210202]/95 via-[#210202]/70 to-transparent pointer-events-none'></div>
          </div>

          {/* sourcing card */}
          <div className='py-10 sm:col-span-2 pl-5 bg-gradient-to-br from-[#f39c45] to-[#ff7e15] text-white rounded-2xl relative h-[320px] flex items-end z-0 overflow-hidden'> 
            <div>
              <div className='mb-4'>
                <p className='mb-[0px] font-bold  text-white'>Need help to order from</p>
                <p className='text-2xl font-semibold mb-[30px]'>China?</p>
                <p className='text-4xl xl:text-5xl font-bold opacity-20 mb-10'>Sourcing Sourcing Sourcing</p>
                <Link to={'/Suppliers'}>
                
                <Buy4meB 
                text='Get New Suppliers'
                bgColor={"bg-white"}
                textColor={"text-primary"} 
                /></Link>
              </div>
            </div>
            <img  src={image3}
            className='w-[500px] absolute bottom-0 mx-4'
            />
            <div className='absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#f39c45]/95 via-[#f39c45]/70 to-transparent pointer-events-none'></div>
        </div>
      </div>
    </div>
    </div>
  )
}

export default Category
