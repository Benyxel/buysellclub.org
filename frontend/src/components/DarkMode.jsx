import React from 'react'
import { BsToggle2On, BsToggle2Off } from "react-icons/bs";

const DarkMode = () => {
  const [theme, setTheme] = React.useState(localStorage.getItem("theme")? localStorage.getItem("theme") : "dark");

  const element = document.documentElement;
 
  React.useEffect(()=> {
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