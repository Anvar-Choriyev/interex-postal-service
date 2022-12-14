import React from "react";

function Recruitment({ classname }) {
  return (
    <svg
      width="18"
      height="16"
      viewBox="0 0 18 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={classname}
    >
      <path
        d="M2 4C2 4.79112 2.2346 5.56448 2.67412 6.22228C3.11365 6.88008 3.73836 7.39277 4.46927 7.69552C5.20017 7.99827 6.00444 8.07748 6.78036 7.92314C7.55628 7.7688 8.26902 7.38784 8.82842 6.82843C9.38784 6.26902 9.7688 5.55628 9.92314 4.78036C10.0775 4.00444 9.99827 3.20017 9.69552 2.46927C9.39277 1.73836 8.88008 1.11365 8.22228 0.674121C7.56448 0.234596 6.79112 0 6 0C4.93913 0 3.92172 0.421427 3.17157 1.17157C2.42143 1.92172 2 2.93913 2 4Z"
        fill="#A7ABB6"
        className={classname}
      />
      <rect
        y="10"
        width="12"
        height="6"
        rx="3"
        fill="#A7ABB6"
        className={classname}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16 4H14V6L12 6V8H14V10H16V8H18V6L16 6V4Z"
        fill="#A7ABB6"
        className={classname}
      />
    </svg>
  );
}

export default Recruitment;
