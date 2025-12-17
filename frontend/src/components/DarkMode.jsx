import React, { useState, useEffect } from 'react'
import { BsToggle2On, BsToggle2Off } from "react-icons/bs";

const DarkMode = () => {
  const [theme, setTheme] = useState(() => {
    // Initialize theme from localStorage or default to "dark"
    if (typeof window !== 'undefined') {
      return localStorage.getItem("theme") || "dark";
    }
    return "dark";
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const element = document.documentElement;
    localStorage.setItem("theme", theme);
    
    if (theme === "dark"){
        element.classList.add("dark");
        element.classList.remove("light");
    } 
    else {
        element.classList.remove("dark");
        element.classList.add("light");
    } 
  }, [theme])

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className='relative' onClick={toggleTheme}>
      {theme === "dark" ? (
        <BsToggle2On className='text-[25px] cursor-pointer translate-all duration-300  hover:text-brandGreen' />
      ) : (
        <BsToggle2Off className='text-[25px] cursor-pointer translate-all duration-300  hover:text-brandGreen' />
      )}
    </div>
  );
}

export default DarkMode;