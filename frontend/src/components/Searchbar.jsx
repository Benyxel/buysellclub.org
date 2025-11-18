import React, { useContext, useEffect, useState } from 'react'
import { ShopContext } from '../context/ShopContext'
import { IoMdSearch } from 'react-icons/io'
import { RiCloseLargeLine } from "react-icons/ri";
import { useLocation } from 'react-router-dom';


const SearchBar = () => {

    const{ search, setSearch, showSearch, setShowSearch} = useContext(ShopContext);
    const location = useLocation();
    const [visible,setVisible] = useState(false)

    useEffect(()=>{
        if (location.pathname.includes('Shop')) {
            setVisible(true);
        }
        else{
            setVisible(false);
        }
    },[location])


  return showSearch && visible ? (
    
   <div className='border-t border-b bg-gray-50 text-center dark:bg-slate-900 '>
        <div className='inline-flex items-center justify-center border border-gray-400 px-5 py-2 my-5 rounded-full w-3/4 sm:w-1/2 '>
        <input value={search} onChange={(e)=>setSearch(e.target.value)} className='flex-1 outline-none bg-inherit text-md dark:text-white' type="text" placeholder='Search' 
        />
        <IoMdSearch  className='text-3xl group-hover:text-primary cursor-pointer text-gray-600 dark:text-gray-400'/>
        </div>
        <RiCloseLargeLine onClick={()=>setShowSearch(false)} className='inline  cursor-pointer ml-6 text-2xl text-gray-600  '/>
   </div> 
    
  ) : null
}

export default SearchBar
