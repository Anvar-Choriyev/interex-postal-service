const CarSVG = ({ className }) => {
  return (
    <svg
      className={className}
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      <mask
        id="mask0_404_1019"
        style={{ maskType: "alpha" }}
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="32"
        height="32"
      >
        <rect width="32" height="32" fill="url(#pattern0)" />
      </mask>
      <g mask="url(#mask0_404_1019)">
        <rect width="32" height="32" fill="white" />
      </g>
      <defs>
        <pattern
          id="pattern0"
          patternContentUnits="objectBoundingBox"
          width="1"
          height="1"
        >
          <use xlinkHref="#image0_404_1019" transform="scale(0.00195312)" />
        </pattern>
        <image
          id="image0_404_1019"
          width="512"
          height="512"
          xlinkHref="data:image/png;base64,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"
        />
      </defs>
    </svg>
  );
};
export default CarSVG;