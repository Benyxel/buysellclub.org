import React from 'react'

const Button = ({text, bgColor,handler = () =>{}}) => {
  return (
    <button
    className={`${bgColor} cursor-pointer hover:scale-105 text-white hover:text-white duration-300 px-8 py-2 rounded-full font-semibold relative z-10 `}>
        {text}
        
    </button>
  )
}

export default Button



