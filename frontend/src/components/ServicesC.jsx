import React from 'react';
import { FaCarSide, FaCheckCircle, FaWallet, FaHeadphonesAlt } from 'react-icons/fa';

const ServiceData = [
  {
    id: 1,
    icon: <FaCarSide className='text-4xl md:text-5xl text-primary' />,
    title: 'Fast Shipping',
    description: 'Free cost on consolidated Goods',
  },
  {
    id: 2,
    icon: <FaCheckCircle className='text-4xl md:text-5xl text-primary' />,
    title: 'Fast Suppliers Payments',
    description: 'Get your suppliers paid instantly',
  },
  {
    id: 3,
    icon: <FaWallet className='text-4xl md:text-5xl text-primary' />,
    title: 'Load Your Alipay',
    description: 'Load your Alipay wallet at a good rate',
  },
  {
    id: 4,
    icon: <FaHeadphonesAlt className='text-4xl md:text-5xl text-primary' />,
    title: 'Affordable Wholesale Goods',
    description: 'Buy directly China goods at goods cost',
  },
];

const ServicesC = () => {
  return (
    <div className=' container sm:overflow-hidden '>
      <div className=' my-14 md:my-20'>
        <div className='flex animate-scroll'>
          {ServiceData.concat(ServiceData).map((data, index) => (
            <div key={index} className='flex-shrink-0 w-64 p-4'>
              <div className='flex flex-col items-start sm:flex-row gap-4 gap-y-4'>
                {data.icon}
                <div>
                  <h1 className='lg:text-xl font-bold'>{data.title}</h1>
                  <h1 className='text-gray-400 text-sm'>{data.description}</h1>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ServicesC;