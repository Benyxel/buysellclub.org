import React, { useContext } from 'react';
import { ShopContext } from '../context/ShopContext';
import { FaReceipt } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const CartTotal = () => {
  const { currency, delivery_fee, getCartAmount } = useContext(ShopContext);
  const subtotal = getCartAmount();
  const total = subtotal === 0 ? 0 : subtotal + delivery_fee;

  return (
    <div className='bg-white dark:bg-gray-800 rounded-lg shadow-md p-6'>
      <div className='flex items-center gap-2 mb-6'>
        <FaReceipt className='text-primary text-2xl' />
        <h2 className='text-xl font-bold text-gray-800 dark:text-white'>Order Summary</h2>
      </div>

      <div className='space-y-4'>
        <div className='flex justify-between items-center text-gray-600 dark:text-gray-300'>
          <span className='text-sm'>Subtotal</span>
          <span className='font-medium'>{currency}{subtotal.toFixed(2)}</span>
        </div>

        <div className='flex justify-between items-center text-gray-600 dark:text-gray-300'>
          <span className='text-sm'>Delivery Fee</span>
          <span className='font-medium'>{currency}{delivery_fee.toFixed(2)}</span>
        </div>

        <div className='border-t border-gray-200 dark:border-gray-700 pt-4'>
          <div className='flex justify-between items-center'>
            <span className='text-lg font-semibold text-gray-800 dark:text-white'>Total</span>
            <span className='text-lg font-bold text-primary'>{currency}{total.toFixed(2)}</span>
          </div>
        </div>

        <Link 
          to="/checkout" 
          className={`block w-full text-center py-3 px-4 rounded-lg font-medium transition-colors duration-200
            ${total > 0 
              ? 'bg-primary text-white hover:bg-primary/90' 
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          onClick={(e) => total === 0 && e.preventDefault()}
        >
          Proceed to Checkout
        </Link>
      </div>
    </div>
  );
};

export default CartTotal;
