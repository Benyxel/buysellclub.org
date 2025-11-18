import React from 'react'

const TrackB = ({text, bgColor, handler = () =>{}}) => {
  return (
    <button
    className={`${bgColor} cursor-pointer hover:scale-105 text-primary hover:text-primary duration-300 px-8 py-2 rounded-full font-semibold relative z-10 shadow-[0px 0px 10px 0px #000000]`}>
        {text}
    </button>
  )
}

export default TrackB


