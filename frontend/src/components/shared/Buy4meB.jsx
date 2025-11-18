import React from 'react'

const Buy4meB = ({text, bgColor, handler = () =>{}}) => {
  return (
    <button
    className={`${bgColor} cursor-pointer hover:scale-105 text-primary hover:text-primary duration-300 px-8 py-2 rounded-full font-semibold relative z-10 shadow-2xl`}>
        {text}
    </button>
  )
}

export default Buy4meB